import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { defaultRoutes } from "./src/data/defaultRoutes";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Dual-Database Adaptive Architecture
// Determines database engine dynamically based on the presence of MySQL environment variables
const useMySQL = !!(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
let mysqlPool: mysql.Pool | null = null;

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
// Prepare SQLite fallback database connection
const DB_PATH = path.join(process.cwd(), "dhaka_transit.db");
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

// Create standard fallback relational schemas for SQLite
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

// Bootstrap SQLite master tables with default preset values if empty
const countRoutes = db.prepare("SELECT count(*) as total FROM routes").get() as { total: number };
if (countRoutes.total === 0) {
  console.log("[SQL local-init] Instantiating default bus lines in master SQLite tables...");
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
  console.log("[SQL local-init] Bootstrap complete. Bus routes loaded from SQLite.");
}

// ---------------------------------------------------------
// MySQL Database Schema & Connection Initialization
// ---------------------------------------------------------
async function initDatabase() {
  if (useMySQL) {
    const host = process.env.MYSQL_HOST;
    const port = Number(process.env.MYSQL_PORT || 3306);
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const database = process.env.MYSQL_DATABASE;

    console.log(`[Database Master Setup] Initializing connection to MySQL Server (${host}:${port}, DB: ${database})...`);
    try {
      mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 12,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });

      // Create relational structure on MySQL database tables using InnoDB engine with Cascade keys
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS routes (
          route_id VARCHAR(100) NOT NULL PRIMARY KEY,
          route_name VARCHAR(255) NOT NULL,
          fare_per_km DECIMAL(8,4) NOT NULL,
          minimum_fare DECIMAL(8,4) NOT NULL DEFAULT 10.00
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS route_stops (
          id INT AUTO_INCREMENT PRIMARY KEY,
          route_id VARCHAR(100) NOT NULL,
          stop_name VARCHAR(255) NOT NULL,
          cumulative_km DECIMAL(8,4) NOT NULL,
          FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
          INDEX idx_route_id (route_id)
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS searches_log (
          id VARCHAR(100) NOT NULL PRIMARY KEY,
          timestamp VARCHAR(100) NOT NULL,
          ip VARCHAR(45) NOT NULL,
          user_agent VARCHAR(512) NOT NULL,
          from_stop VARCHAR(255) NOT NULL,
          to_stop VARCHAR(255) NOT NULL,
          route_id VARCHAR(100) NULL,
          INDEX idx_search_timestamp (timestamp)
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS reports_log (
          id VARCHAR(100) NOT NULL PRIMARY KEY,
          timestamp VARCHAR(100) NOT NULL,
          ip VARCHAR(45) NOT NULL,
          user_agent VARCHAR(512) NOT NULL,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(150) NOT NULL,
          route_id VARCHAR(100) NOT NULL,
          notes TEXT NOT NULL,
          INDEX idx_report_timestamp (timestamp)
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);

      // Verify and seed base records under MySQL
      const [rows] = await mysqlPool.query("SELECT COUNT(*) as total FROM routes");
      const currentRouteCount = (rows as any)[0]?.total || 0;

      if (currentRouteCount === 0) {
        console.log("[MySQL master-seed] Instantiating default bus lines in master SQL tables...");
        for (const route of defaultRoutes) {
          await mysqlPool.query(
            "INSERT INTO routes (route_id, route_name, fare_per_km, minimum_fare) VALUES (?, ?, ?, ?)",
            [route.route_id, route.route_name, route.fare_per_km, route.minimum_fare || 10.0]
          );
          for (const stop of route.stops) {
            await mysqlPool.query(
              "INSERT INTO route_stops (route_id, stop_name, cumulative_km) VALUES (?, ?, ?)",
              [route.route_id, stop.stop_name, stop.cumulative_km]
              );
          }
        }
        console.log("[MySQL master-seed] Database seeding completed successfully!");
      } else {
        console.log(`[MySQL Pool Enabled] Checked: ${currentRouteCount} master bus pathways loaded successfully.`);
      }

    } catch (e) {
      console.error("❌ MySQL Engine initialization failed! Bypassing connection to run SQLite fallback engine. Error Details:", e);
      mysqlPool = null;
    }
  } else {
    console.log("[Database Master Setup] Running local engine SQLite fall-backs. Database configuration keys missing in environment.");
  }
}

// ---------------------------------------------------------
// Unified Relational Database Access Methods (Dual-Store)
// ---------------------------------------------------------

async function loadRoutes() {
  if (useMySQL && mysqlPool) {
    try {
      const [routesRows] = await mysqlPool.query("SELECT * FROM routes");
      const [stopsRows] = await mysqlPool.query("SELECT * FROM route_stops ORDER BY id ASC");

      const routeMap = new Map<string, any>();
      for (const r of (routesRows as any[])) {
        routeMap.set(r.route_id, {
          route_id: r.route_id,
          route_name: r.route_name,
          fare_per_km: Number(r.fare_per_km),
          minimum_fare: Number(r.minimum_fare),
          stops: []
        });
      }

      for (const s of (stopsRows as any[])) {
        const r = routeMap.get(s.route_id);
        if (r) {
          r.stops.push({
            stop_name: s.stop_name,
            cumulative_km: Number(s.cumulative_km)
          });
        }
      }

      return Array.from(routeMap.values());
    } catch (error) {
      console.error("MySQL query failure on loadRoutes, triggering SQLite lookup:", error);
    }
  }

  // SQLite fallback engine lookup
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

async function loadSearches(): Promise<ServerSearchLog[]> {
  if (useMySQL && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query(`
        SELECT 
          id, 
          timestamp, 
          ip, 
          user_agent as userAgent, 
          from_stop as \`from\`, 
          to_stop as \`to\`, 
          route_id as routeId 
        FROM searches_log 
        ORDER BY timestamp DESC 
        LIMIT 500
      `);
      return rows as ServerSearchLog[];
    } catch (e) {
      console.error("MySQL query failure on loadSearches, triggering SQLite lookup:", e);
    }
  }

  // SQLite fallback
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
    console.error("Failed to query searches_log from SQLite:", error);
    return [];
  }
}

async function saveSearch(log: ServerSearchLog): Promise<void> {
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO searches_log (id, timestamp, ip, user_agent, from_stop, to_stop, route_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [log.id, log.timestamp, log.ip, log.userAgent, log.from, log.to, log.routeId || null]);
      return;
    } catch (e) {
      console.error("MySQL write failure on saveSearch, falling back:", e);
    }
  }

  // SQLite fallback
  try {
    db.prepare(`
      INSERT INTO searches_log (id, timestamp, ip, user_agent, from_stop, to_stop, route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(log.id, log.timestamp, log.ip, log.userAgent, log.from, log.to, log.routeId || null);
  } catch (error) {
    console.error("Failed to insert search entry in SQLite database:", error);
  }
}

async function loadReports(): Promise<ServerReportLog[]> {
  if (useMySQL && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query(`
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
      `);
      return rows as ServerReportLog[];
    } catch (e) {
      console.error("MySQL query failure on loadReports, triggering SQLite lookup:", e);
    }
  }

  // SQLite fallback
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

async function saveReport(log: ServerReportLog): Promise<void> {
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO reports_log (id, timestamp, ip, user_agent, name, category, route_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [log.id, log.timestamp, log.ip, log.userAgent, log.name, log.category, log.routeId, log.notes]);
      return;
    } catch (e) {
      console.error("MySQL write failure on saveReport, falling back:", e);
    }
  }

  // SQLite fallback
  try {
    db.prepare(`
      INSERT INTO reports_log (id, timestamp, ip, user_agent, name, category, route_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(log.id, log.timestamp, log.ip, log.userAgent, log.name, log.category, log.routeId, log.notes);
  } catch (error) {
    console.error("Failed to insert report log in SQLite database:", error);
  }
}

// API: Get current routes from database
app.get("/api/routes", async (req, res) => {
  const routes = await loadRoutes();
  res.json({ success: true, routes });
});

// API: Log a user's search query, tracking target IP, Timestamp, and Search keys
app.post("/api/searches", async (req, res) => {
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

  await saveSearch(newLog);
  console.log(`[Database Log Live] IP: ${ip} | User searched: ${from} to ${to}`);
  
  res.json({ success: true, logged: newLog });
});

// API: Get recent searches (database index listing)
app.get("/api/searches", async (req, res) => {
  const searches = await loadSearches();
  res.json({ success: true, count: searches.length, searches });
});

// API: Log a user's mistake/error report to the persistent database
app.post("/api/reports", async (req, res) => {
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

  await saveReport(newReport);
  console.log(`[Database Log Error Report] Category: ${category} | IP: ${ip} | User: ${name}`);

  res.json({ success: true, logged: newReport });
});

// API: List logged reports from database
app.get("/api/reports", async (req, res) => {
  const reports = await loadReports();
  res.json({ success: true, count: reports.length, reports });
});

// Serve frontend assets and initialize database connections
async function start() {
  // Ensure MySQL setup is fully initialized at startup
  await initDatabase();

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
