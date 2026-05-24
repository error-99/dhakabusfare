import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { defaultRoutes } from "./src/data/defaultRoutes";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
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
// MySQL & SQLite Configuration Setup
// ---------------------------------------------------------
let mysqlPool: mysql.Pool | null = null;
let connectionErrorMsg: string | null = null;
let isMySQLActive = false;
let isMaintenanceMode = false;
let sqliteDb: any = null;

// Fallback arrays for in-memory structures (if any secondary fails occur)
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
// Master Database Bootstrapper
// ---------------------------------------------------------
async function initDatabase() {
  const useMysql = process.env.USE_MYSQL === "true";

  if (useMysql) {
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
      isMaintenanceMode = false;
    } catch (e: any) {
      connectionErrorMsg = e.message || String(e);
      isMySQLActive = false;
      isMaintenanceMode = true; // Block service as MySQL-only is true and failing
      console.error("⚠️ MySQL Connection failure! Service entering maintenance mode as requested:", connectionErrorMsg);
      logErrorToFile(`Database initialization failed, maintenance active: ${connectionErrorMsg}`);
    }
  } else {
    console.log("[Database master setup] Initializing strictly to local SQLite file-based database...");
    try {
      const dbPath = path.join(process.cwd(), "dhaka_transit.db");
      sqliteDb = new Database(dbPath);

      // Create tables inside SQLite
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS routes (
          route_id TEXT PRIMARY KEY,
          route_name TEXT NOT NULL,
          fare_per_km REAL NOT NULL,
          minimum_fare REAL NOT NULL DEFAULT 10.0
        );
      `);

      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS route_stops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          route_id TEXT NOT NULL,
          stop_name TEXT NOT NULL,
          cumulative_km REAL NOT NULL,
          FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE
        );
      `);

      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS searches_log (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          ip TEXT NOT NULL,
          user_agent TEXT NOT NULL,
          from_stop TEXT NOT NULL,
          to_stop TEXT NOT NULL,
          route_id TEXT
        );
      `);

      sqliteDb.exec(`
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

      // Seed SQLite if empty
      const countStmt = sqliteDb.prepare("SELECT COUNT(*) as count FROM routes");
      const row = countStmt.get() as { count: number };
      if (row.count === 0) {
        console.log("[SQLite Seed] Seeding SQLite database with default routes...");
        const insertRoute = sqliteDb.prepare("INSERT INTO routes (route_id, route_name, fare_per_km, minimum_fare) VALUES (?, ?, ?, ?)");
        const insertStop = sqliteDb.prepare("INSERT INTO route_stops (route_id, stop_name, cumulative_km) VALUES (?, ?, ?)");

        const transaction = sqliteDb.transaction(() => {
          for (const route of defaultRoutes) {
            insertRoute.run(route.route_id, route.route_name, route.fare_per_km, route.minimum_fare || 10.0);
            for (const stop of route.stops) {
              insertStop.run(route.route_id, stop.stop_name, stop.cumulative_km);
            }
          }
        });
        transaction();
        console.log("[SQLite Seed] Seeding completed successfully!");
      } else {
        console.log(`[SQLite Ready] Loaded local SQLite file successfully. Routes count: ${row.count}`);
      }
      isMySQLActive = false;
      isMaintenanceMode = false;
    } catch (e: any) {
      console.error("⚠️ SQLite initialization failed:", e.message || e);
      isMaintenanceMode = true;
    }
  }
}

// ---------------------------------------------------------
// Exclusively Database Retrieval Handlers
// ---------------------------------------------------------
async function loadRoutes() {
  const useMysql = process.env.USE_MYSQL === "true";

  if (useMysql) {
    if (!isMySQLActive) {
      throw new Error("MySQL database is requested but offline. Maintenance window is active.");
    }
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
  } else {
    if (!sqliteDb) {
      throw new Error("SQLite database is offline.");
    }
    const routesRows = sqliteDb.prepare("SELECT * FROM routes").all() as any[];
    const stopsRows = sqliteDb.prepare("SELECT * FROM route_stops ORDER BY id ASC").all() as any[];

    const routeMap = new Map<string, any>();
    for (const r of routesRows) {
      routeMap.set(r.route_id, {
        route_id: r.route_id,
        route_name: r.route_name,
        fare_per_km: Number(r.fare_per_km),
        minimum_fare: Number(r.minimum_fare),
        stops: []
      });
    }

    for (const s of stopsRows) {
      const r = routeMap.get(s.route_id);
      if (r) {
        r.stops.push({
          stop_name: s.stop_name,
          cumulative_km: Number(s.cumulative_km)
        });
      }
    }

    return Array.from(routeMap.values());
  }
}

async function loadSearches(): Promise<ServerSearchLog[]> {
  const useMysql = process.env.USE_MYSQL === "true";

  if (useMysql) {
    if (!isMySQLActive) return [];
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
  } else {
    if (!sqliteDb) return [];
    const rows = sqliteDb.prepare(`
      SELECT 
        id, 
        timestamp, 
        ip, 
        user_agent as userAgent, 
        from_stop as "from", 
        to_stop as "to", 
        route_id as routeId 
      FROM searches_log 
      ORDER BY timestamp DESC 
      LIMIT 100
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      ip: r.ip,
      userAgent: r.userAgent,
      from: r.from,
      to: r.to,
      routeId: r.routeId
    }));
  }
}

async function saveSearch(log: ServerSearchLog): Promise<void> {
  const useMysql = process.env.USE_MYSQL === "true";

  if (useMysql) {
    if (!isMySQLActive) return;
    const pool = await getPool();
    await pool.query(`
      INSERT INTO searches_log (id, timestamp, ip, user_agent, from_stop, to_stop, route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [log.id, log.timestamp, log.ip, log.userAgent, log.from, log.to, log.routeId || null]);
  } else {
    if (!sqliteDb) return;
    const stmt = sqliteDb.prepare(`
      INSERT INTO searches_log (id, timestamp, ip, user_agent, from_stop, to_stop, route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(log.id, log.timestamp, log.ip, log.userAgent, log.from, log.to, log.routeId || null);
  }
}

async function loadReports(): Promise<ServerReportLog[]> {
  const useMysql = process.env.USE_MYSQL === "true";

  if (useMysql) {
    if (!isMySQLActive) return [];
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
  } else {
    if (!sqliteDb) return [];
    const rows = sqliteDb.prepare(`
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

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      ip: r.ip,
      userAgent: r.userAgent,
      name: r.name,
      category: r.category,
      routeId: r.routeId,
      notes: r.notes
    }));
  }
}

async function saveReport(log: ServerReportLog): Promise<void> {
  const useMysql = process.env.USE_MYSQL === "true";

  if (useMysql) {
    if (!isMySQLActive) return;
    const pool = await getPool();
    await pool.query(`
      INSERT INTO reports_log (id, timestamp, ip, user_agent, name, category, route_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [log.id, log.timestamp, log.ip, log.userAgent, log.name, log.category, log.routeId, log.notes]);
  } else {
    if (!sqliteDb) return;
    const stmt = sqliteDb.prepare(`
        INSERT INTO reports_log (id, timestamp, ip, user_agent, name, category, route_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
    stmt.run(log.id, log.timestamp, log.ip, log.userAgent, log.name, log.category, log.routeId, log.notes);
  }
}

// ---------------------------------------------------------
// Express REST Endpoints
// ---------------------------------------------------------

// API: Get current routes from active database
app.get("/api/routes", async (req, res) => {
  if (isMaintenanceMode) {
    return res.status(503).json({
      success: false,
      maintenance: true,
      error: "Master database is undergoing active scheduled maintenance."
    });
  }

  try {
    const routes = await loadRoutes();
    res.json({ success: true, routes, isMySQLActive, isSQLiteActive: !isMySQLActive });
  } catch (error: any) {
    const errMsg = error.message || String(error);
    console.error("Database routes fetch failed:", errMsg);
    logErrorToFile(`API routes query failed: ${errMsg}`);
    res.status(503).json({
      success: false,
      maintenance: true,
      error: "Server database connection was interrupted. Please try again soon."
    });
  }
});

// API: Log a user's search query to active database
app.post("/api/searches", async (req, res) => {
  if (isMaintenanceMode) {
    return res.status(503).json({ success: false, maintenance: true, error: "System in maintenance mode." });
  }

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
    console.log(`[Database Audit Log] Recorded user search: ${from} to ${to}`);
    res.json({ success: true, logged: newLog });
  } catch (error: any) {
    console.error("Audit log write failed:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database write error: ${error.message || error}.`
    });
  }
});

// API: Get recent searches
app.get("/api/searches", async (req, res) => {
  if (isMaintenanceMode) {
    return res.status(503).json({ success: false, maintenance: true, error: "System in maintenance mode." });
  }

  try {
    const searches = await loadSearches();
    res.json({ success: true, count: searches.length, searches });
  } catch (error: any) {
    console.error("Searches loading failed:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database query error: ${error.message || error}.`
    });
  }
});

// API: Log a user report to active database
app.post("/api/reports", async (req, res) => {
  if (isMaintenanceMode) {
    return res.status(503).json({ success: false, maintenance: true, error: "System in maintenance mode." });
  }

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
    console.log(`[Database Report Log] Recorded user report in category: ${category}`);
    res.json({ success: true, logged: newReport });
  } catch (error: any) {
    console.error("Report write failed:", error.message || error);
    res.status(500).json({
      success: false,
      error: `Database write error: ${error.message || error}.`
    });
  }
});

// API: List logged reports from active database
app.get("/api/reports", async (req, res) => {
  if (isMaintenanceMode) {
    return res.status(503).json({ success: false, maintenance: true, error: "System in maintenance mode." });
  }

  try {
    const reports = await loadReports();
    res.json({ success: true, count: reports.length, reports });
  } catch (error: any) {
    console.error("Reports loading failed:", error.message || error);
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
