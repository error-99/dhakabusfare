import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { defaultRoutes } from "./src/data/defaultRoutes";

const app = express();
const PORT = 3000;
const ROUTES_DB_FILE = path.join(process.cwd(), "routes_db.json");
const SEARCH_DB_FILE = path.join(process.cwd(), "searches_db.json");
const REPORT_DB_FILE = path.join(process.cwd(), "reports_db.json");

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

// Load persistent routes data from JSON Database
function loadRoutes() {
  if (fs.existsSync(ROUTES_DB_FILE)) {
    try {
      const content = fs.readFileSync(ROUTES_DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading routes database file, falling back to presets:", e);
    }
  }
  return defaultRoutes;
}

// Load persistent search logs from JSON Database
function loadSearches(): ServerSearchLog[] {
  if (fs.existsSync(SEARCH_DB_FILE)) {
    try {
      const content = fs.readFileSync(SEARCH_DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading searches database:", e);
    }
  }
  return [];
}

// Append and save search log records to Database safely
function saveSearch(log: ServerSearchLog) {
  try {
    const list = loadSearches();
    list.unshift(log); // Add to beginning of local index
    // Keep last 500 logs to preserve preview size while remaining highly performant
    fs.writeFileSync(SEARCH_DB_FILE, JSON.stringify(list.slice(0, 500), null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to commit search log to database file:", e);
  }
}

// Load persistent report logs from JSON Database
function loadReports(): ServerReportLog[] {
  if (fs.existsSync(REPORT_DB_FILE)) {
    try {
      const content = fs.readFileSync(REPORT_DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading reports database:", e);
    }
  }
  return [];
}

// Append and save report log records to Database safely
function saveReport(log: ServerReportLog) {
  try {
    const list = loadReports();
    list.unshift(log); // Add to beginning
    fs.writeFileSync(REPORT_DB_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to commit report log to database file:", e);
  }
}

// API: Get current routes
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
  console.log(`[SQL Sim DB Log Live] IP: ${ip} | User searched: ${from} to ${to}`);
  
  res.json({ success: true, logged: newLog });
});

// API: Get recent searches (database index listing)
app.get("/api/searches", (req, res) => {
  const searches = loadSearches();
  res.json({ success: true, count: searches.length, searches });
});

// API: Log a user's mistake/error report to the persistent database file reports_db.json
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
