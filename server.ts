import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { defaultRoutes } from "./src/data/defaultRoutes";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

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

// ---------------------------------------------------------
// MySQL Database Pool lazy instantiation
// ---------------------------------------------------------
let mysqlPool: mysql.Pool | null = null;
let connectionErrorMsg: string | null = null;
let isMySQLActive = false;

// Fallback in-memory structures when MySQL is unreachable
const fallbackRoutes = JSON.parse(JSON.stringify(defaultRoutes));
const fallbackSearches: ServerSearchLog[] = [];
const fallbackReports: ServerReportLog[] = [];

function logErrorToFile(errorMsg: string) {
  try {
    const logPath = path.join(process.cwd(), "mysql_error_log.txt");
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${errorMsg}\n`;
    fs.appendFileSync(logPath, logEntry, "utf-8");
  } catch (err) {
    console.error("Failed to write to txt error log file:", err);
  }
}

async function getPool(): Promise<mysql.Pool> {
  if (mysqlPool) return mysqlPool;

  const host = process.env.MYSQL_HOST;
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    const missingKeys = [];
    if (!host) missingKeys.push("MYSQL_HOST");
    if (!user) missingKeys.push("MYSQL_USER");
    if (!database) missingKeys.push("MYSQL_DATABASE");
    const errMsg = `MySQL values missing in .env configuration. Required variables: ${missingKeys.join(", ")}`;
    logErrorToFile(errMsg);
    throw new Error(errMsg);
  }

  try {
    const pool = mysql.createPool({
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

    // Test connection pool availability
    const connection = await pool.getConnection();
    connection.release();

    mysqlPool = pool;
    connectionErrorMsg = null;
    isMySQLActive = true;
    return mysqlPool;
  } catch (e: any) {
    connectionErrorMsg = e.message || String(e);
    mysqlPool = null;
    isMySQLActive = false;
    logErrorToFile(`MySQL initialization/connection failure: ${connectionErrorMsg}`);
    throw e;
  }
}

// ---------------------------------------------------------
// MySQL Database Schema & Table Seeding (Bootstrap)
// ---------------------------------------------------------
async function initDatabase() {
  console.log("[Database master setup] Initializing strictly to MySQL server database...");
  try {
    const pool = await getPool();

    // Create relation schemas using InnoDB storage engine with physical keys and index structures
    await pool.query(`
      CREATE TABLE IF NOT EXISTS routes (
        route_id VARCHAR(100) NOT NULL PRIMARY KEY,
        route_name VARCHAR(255) NOT NULL,
        fare_per_km DECIMAL(8,4) NOT NULL,
        minimum_fare DECIMAL(8,4) NOT NULL DEFAULT 10.00
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_stops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_id VARCHAR(100) NOT NULL,
        stop_name VARCHAR(255) NOT NULL,
        cumulative_km DECIMAL(8,4) NOT NULL,
        FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
        INDEX idx_route_id (route_id)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await pool.query(`
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

    await pool.query(`
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

    // Fetch total count to see if we need to seed
    const [rows] = await pool.query("SELECT COUNT(*) as total FROM routes");
    const currentRouteCount = (rows as any)[0]?.total || 0;

    if (currentRouteCount === 0) {
      console.log("[MySQL Seed] Seeding MySQL database schema tables with initial routes values...");
      
      for (const route of defaultRoutes) {
        await pool.query(
          "INSERT INTO routes (route_id, route_name, fare_per_km, minimum_fare) VALUES (?, ?, ?, ?)",
          [route.route_id, route.route_name, route.fare_per_km, route.minimum_fare || 10.0]
        );
        for (const stop of route.stops) {
          await pool.query(
            "INSERT INTO route_stops (route_id, stop_name, cumulative_km) VALUES (?, ?, ?)",
            [route.route_id, stop.stop_name, stop.cumulative_km]
          );
        }
      }
      console.log("[MySQL Seed] Seeding completed successfully. Routes loaded from database tables.");
    } else {
      console.log(`[MySQL Ready] Active tables verified in Master Server. Loaded routes count: ${currentRouteCount}`);
    }
    isMySQLActive = true;
  } catch (e: any) {
    connectionErrorMsg = e.message || String(e);
    isMySQLActive = false;
    console.error("⚠️ MySQL Connection refused or failed! Falling back to dynamic local in-memory representation. Err detail:", connectionErrorMsg);
    logErrorToFile(`Database initialization failed, default fallback loaded: ${connectionErrorMsg}`);
  }
}

// ---------------------------------------------------------
// Exclusively Database Retrieval Handlers (No fallback arrays allowed)
// ---------------------------------------------------------

async function loadRoutes() {
  if (!isMySQLActive) {
    console.log("[MySQL Offline Failover] Returning client in-memory fallback routes array");
    return fallbackRoutes;
  }
  try {
    const pool = await getPool();
    const [routesRows] = await pool.query("SELECT * FROM routes");
    const [stopsRows] = await pool.query("SELECT * FROM route_stops ORDER BY id ASC");

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
  } catch (err) {
    console.warn("[MySQL Offline Failover] routes fetch failed, failover to memory", err);
    isMySQLActive = false;
    return fallbackRoutes;
  }
}

async function loadSearches(): Promise<ServerSearchLog[]> {
  if (!isMySQLActive) {
    return fallbackSearches;
  }
  try {
    const pool = await getPool();
    const [rows] = await pool.query(`
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
      LIMIT 100
    `);
    return rows as ServerSearchLog[];
  } catch (err) {
    console.warn("[MySQL Offline Failover] Searches query failed, failover to memory", err);
    isMySQLActive = false;
    return fallbackSearches;
  }
}

async function saveSearch(log: ServerSearchLog): Promise<void> {
  fallbackSearches.unshift(log);
  if (!isMySQLActive) return;
  try {
    const pool = await getPool();
    await pool.query(`
      INSERT INTO searches_log (id, timestamp, ip, user_agent, from_stop, to_stop, route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [log.id, log.timestamp, log.ip, log.userAgent, log.from, log.to, log.routeId || null]);
  } catch (err) {
    console.warn("[MySQL Offline Failover] Searches insert failed, saved to memory", err);
    isMySQLActive = false;
  }
}

async function loadReports(): Promise<ServerReportLog[]> {
  if (!isMySQLActive) {
    return fallbackReports;
  }
  try {
    const pool = await getPool();
    const [rows] = await pool.query(`
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
  } catch (err) {
    console.warn("[MySQL Offline Failover] Reports query failed, failover to memory", err);
    isMySQLActive = false;
    return fallbackReports;
  }
}

async function saveReport(log: ServerReportLog): Promise<void> {
  fallbackReports.unshift(log);
  if (!isMySQLActive) return;
  try {
    const pool = await getPool();
    await pool.query(`
      INSERT INTO reports_log (id, timestamp, ip, user_agent, name, category, route_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [log.id, log.timestamp, log.ip, log.userAgent, log.name, log.category, log.routeId, log.notes]);
  } catch (err) {
    console.warn("[MySQL Offline Failover] Reports insert failed, saved to memory", err);
    isMySQLActive = false;
  }
}

// ---------------------------------------------------------
// Express REST Endpoints
// ---------------------------------------------------------

// API: Get current routes from MySQL database
app.get("/api/routes", async (req, res) => {
  try {
    const routes = await loadRoutes();
    res.json({ success: true, routes, isMySQLActive });
  } catch (error: any) {
    const errMsg = error.message || String(error);
    console.error("MySQL query failed for /api/routes:", errMsg);
    logErrorToFile(`API routes query failed: ${errMsg}`);
    res.json({
      success: true,
      routes: fallbackRoutes,
      isMySQLActive: false,
      warning: "Undergoing scheduled DB maintenance, falling back to local dataset."
    });
  }
});

// API: Log a user's search query to MySQL database
app.post("/api/searches", async (req, res) => {
  const { from, to, routeId } = req.body;
  if (!from || !to) {
    return res.status(400).json({ success: false, error: "Both origin and destination parameters are required." });
  }

  // Extract client IP address accurately
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

  try {
    await saveSearch(newLog);
    console.log(`[MySQL Audit Log] Recorded user search: ${from} to ${to}`);
    res.json({ success: true, logged: newLog });
  } catch (error: any) {
    console.error("MySQL log failed for /api/searches:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database write error: ${error.message || error}.`
    });
  }
});

// API: Get recent searches
app.get("/api/searches", async (req, res) => {
  try {
    const searches = await loadSearches();
    res.json({ success: true, count: searches.length, searches });
  } catch (error: any) {
    console.error("MySQL query failed for /api/searches:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database query error: ${error.message || error}.`
    });
  }
});

// API: Log a user report to MySQL database
app.post("/api/reports", async (req, res) => {
  const { name, category, routeId, notes } = req.body;
  if (!category || !notes) {
    return res.status(400).json({ success: false, error: "Category and notes are required fields." });
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

  try {
    await saveReport(newReport);
    console.log(`[MySQL Report Log] Recorded user report in categoy: ${category}`);
    res.json({ success: true, logged: newReport });
  } catch (error: any) {
    console.error("MySQL write failed for /api/reports:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database write error: ${error.message || error}.`
    });
  }
});

// API: List logged reports from MySQL database
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await loadReports();
    res.json({ success: true, count: reports.length, reports });
  } catch (error: any) {
    console.error("MySQL query failed for /api/reports:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database query error: ${error.message || error}.`
    });
  }
});

// Serve frontend assets
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
