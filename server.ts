import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { defaultRoutes } from "./src/data/defaultRoutes";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

interface ServerSearchLog {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  from: string;
  to: string;
  routeId?: string;
}

interface ServerReportLog {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  name: string;
  category: string;
  routeId: string;
  notes: string;
}

// Prepare persistent SQLite database connection
const DB_PATH = path.join(process.cwd(), "dhaka_transit.db");
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

// Create relational schemas for strict transactional storage
db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    route_id TEXT PRIMARY KEY,
    route_name TEXT NOT NULL,
    fare_per_km REAL NOT NULL,
    minimum_fare REAL NOT NULL DEFAULT 10.0
  );

  CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id TEXT NOT NULL,
    stop_name TEXT NOT NULL,
    cumulative_km REAL NOT NULL,
    FOREIGN KEY (route_id) REFERENCES routes (route_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS searches_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    ip TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    from_stop TEXT NOT NULL,
    to_stop TEXT NOT NULL,
    route_id TEXT
  );

  CREATE TABLE IF NOT EXISTS reports_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    ip TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    route_id TEXT NOT NULL,
    notes TEXT NOT NULL
  );
`);

// Bootstrap SQLite tables with defaults if no master routes exist
const countRoutes = db.prepare("SELECT count(*) as total FROM routes").get() as { total: number };
if (countRoutes.total === 0) {
  console.log("[SQL init] Instantiating default bus lines in master tables...");
  const insertRoute = db.prepare(`
    INSERT INTO routes (route_id, route_name, fare_per_km, minimum_fare)
    VALUES (?, ?, ?, ?)
  `);
  const insertStop = db.prepare(`
    INSERT INTO route_stops (route_id, stop_name, cumulative_km)
    VALUES (?, ?, ?)
  `);

  const runBootstrap = db.transaction(() => {
    for (const route of defaultRoutes) {
      insertRoute.run(route.route_id, route.route_name, route.fare_per_km, route.minimum_fare || 10.0);
      for (const stop of route.stops) {
        insertStop.run(route.route_id, stop.stop_name, stop.cumulative_km);
      }
    }
  });
  runBootstrap();
  console.log("[SQL init] Bootstrap complete. Bus routes loaded from database.");
}

// Retrieve master bus routes and associate their stations in order
function loadRoutes() {
  try {
    const routesRows = db.prepare("SELECT * FROM routes").all() as any[];
    const stopsRows = db.prepare("SELECT * FROM route_stops ORDER BY id ASC").all() as any[];

    const routeMap = new Map<string, any>();
    for (const r of routesRows) {
      routeMap.set(r.route_id, {
        route_id: r.route_id,
        route_name: r.route_name,
        fare_per_km: r.fare_per_km,
        minimum_fare: r.minimum_fare,
        stops: []
      });
    }

    for (const s of stopsRows) {
      const r = routeMap.get(s.route_id);
      if (r) {
        r.stops.push({
          stop_name: s.stop_name,
          cumulative_km: s.cumulative_km
        });
      }
    }

    return Array.from(routeMap.values());
  } catch (error) {
    console.error("Failed to query routes from SQLite database:", error);
    return defaultRoutes;
  }
}

// Retrieve search analytics stream
function loadSearches(): ServerSearchLog[] {
  try {
    const rows = db.prepare(`
      SELECT 
        id, 
        timestamp, 
        ip, 
        user_agent as userAgent, 
        from_stop as 'from', 
        to_stop as 'to', 
        route_id as routeId 
      FROM searches_log 
      ORDER BY timestamp DESC 
      LIMIT 500
    `).all() as any[];
    return rows;
  } catch (error) {
    console.error("Failed to query searches_log:", error);
    return [];
  }
}

// Persist user searches
function saveSearch(log: ServerSearchLog) {
  try {
    db.prepare(`
      INSERT INTO searches_log (id, timestamp, ip, user_agent, from_stop, to_stop, route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(log.id, log.timestamp, log.ip, log.userAgent, log.from, log.to, log.routeId || null);
  } catch (error) {
    console.error("Failed to insert search entry in database:", error);
  }
}

// Retrieve inaccuracy reports
function loadReports(): ServerReportLog[] {
  try {
    const rows = db.prepare(`
      SELECT 
        id, 
        timestamp, 
        ip, 
        user_agent as userAgent, 
        name, 
        category, 
        route_id as routeId, 
        notes 
      FROM reports_log 
      ORDER BY timestamp DESC
    `).all() as any[];
    return rows;
  } catch (error) {
    console.error("Failed to query reports_log from SQLite:", error);
    return [];
  }
}

// Persist reports
function saveReport(log: ServerReportLog) {
  try {
    db.prepare(`
      INSERT INTO reports_log (id, timestamp, ip, user_agent, name, category, route_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(log.id, log.timestamp, log.ip, log.userAgent, log.name, log.category, log.routeId, log.notes);
  } catch (error) {
    console.error("Failed to insert report log in SQLite:", error);
  }
}

// API: Get current routes from database
app.get("/api/routes", (req, res) => {
  const routes = loadRoutes();
  res.json({ success: true, routes });
});

// API: Log a user's search query, tracking target IP, Timestamp, and Search keys
app.post("/api/searches", (req, res) => {
  const { from, to, routeId } = req.body;
  
  if (!from || !to) {
    return res.status(400).json({ success: false, error: "Both origin and destination parameters are required." });
  }

  // Extract client IP address accurately (supporting modern reverse proxy setups)
  const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const ip = rawIp.split(",")[0].trim();
  const userAgent = (req.headers["user-agent"] as string) || "Mozilla Browser Link";

  const newLog: ServerSearchLog = {
    id: `SRH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
    from,
    to,
    routeId,
  };

  saveSearch(newLog);
  console.log(`[Database Log Live] IP: ${ip} | User searched: ${from} to ${to}`);
  
  res.json({ success: true, logged: newLog });
});

// API: Get recent searches (database index listing)
app.get("/api/searches", (req, res) => {
  const searches = loadSearches();
  res.json({ success: true, count: searches.length, searches });
});

// API: Log a user's mistake/error report to the persistent database
app.post("/api/reports", (req, res) => {
  const { name, category, routeId, notes } = req.body;

  if (!category || !notes) {
    return res.status(400).json({ success: false, error: "Category and error notes are required fields." });
  }

  const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const ip = rawIp.split(",")[0].trim();
  const userAgent = (req.headers["user-agent"] as string) || "Mozilla Browser Link";

  const newReport: ServerReportLog = {
    id: `RPT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
    name: name || "Anonymous User",
    category,
    routeId: routeId || "N/A",
    notes,
  };

  saveReport(newReport);
  console.log(`[Database Log Error Report] Category: ${category} | IP: ${ip} | User: ${name}`);

  res.json({ success: true, logged: newReport });
});

// API: List logged reports from database
app.get("/api/reports", (req, res) => {
  const reports = loadReports();
  res.json({ success: true, count: reports.length, reports });
});

// Serve frontend assets
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

start();
