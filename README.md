# Dhaka Transit Responsibility Hub · Database Systems Guide

Welcome to the Database Systems Guide. This document provides step-by-step instructions and production-grade blueprints on how to transition from local file-based JSON storage (`routes_db.json`, `searches_db.json`) to a physical high-performance relational database system like **MySQL**.

This file addresses:
1. **Database Schema Design** — DDL schemas for routes, route stations, and search logs.
2. **User Search Logs** — Tracking user search parameters, target IP addresses, active timestamps, and device headers.
3. **Retrieving "Today's Searches"** — SQL queries to extract searches compiled specifically during the current day.
4. **Developing an Advanced Admin Panel** — Security pipelines, token authorization, credentials, and search log streams.

---

## 🛠️ Part 1: Relational Database Schema (MySQL)

By connecting a real relational database, you avoid filesystem lockups and support high-volume parallel connections. Below is the optimized SQL schema (DDL) to store transit routes, checkpoint stations, and visitor searches.

```sql
-- Create Database
CREATE DATABASE IF NOT EXISTS dhaka_transit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dhaka_transit_db;

-- 1. Bus Routes Table
CREATE TABLE IF NOT EXISTS routes (
    route_id VARCHAR(50) NOT NULL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    fare_per_km DECIMAL(6, 2) NOT NULL DEFAULT 2.45,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Route Checkpoints & Stops Table (Ordered by cumulative distance)
CREATE TABLE IF NOT EXISTS route_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id VARCHAR(50) NOT NULL,
    stop_name VARCHAR(255) NOT NULL,
    cumulative_km DECIMAL(6, 2) NOT NULL,
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    INDEX idx_route_stop (route_id, stop_name)
) ENGINE=InnoDB;

-- 3. Live User Search Logs Table (IP Tracker & Telemetry)
CREATE TABLE IF NOT EXISTS searches_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_ip VARCHAR(45) NOT NULL,            -- Supports both IPv4 and IPv6 formats
    user_agent VARCHAR(512),                 -- Records device, browser, and OS
    from_stop VARCHAR(255) NOT NULL,         -- Origin station name
    to_stop VARCHAR(255) NOT NULL,           -- Destination station name
    route_id VARCHAR(50),                    -- Optional specific route active when searching
    INDEX idx_today_timestamp (timestamp),
    INDEX idx_user_ip (user_ip)
) ENGINE=InnoDB;
```

---

## 📡 Part 2: Logging Searched Queries & Remote IPs

In Express (`server.ts`), we can resolve headers to log queries safely. Below is a real-world script showing how to integrate the official `mysql2` client driver dynamically.

### 1. Installation
To connect to MySQL, add the standard native client to this server:
```bash
npm install mysql2
```

### 2. Express Integration with Parameterized Queries
This server controller reads proxy-forwarded IP addresses (providing protection when behind services like Cloudflare or Nginx) and persists logs to the MySQL backend:

```typescript
import mysql from 'mysql2/promise';

// Initialize a resilient database connection pool
const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'secret',
  database: process.env.MYSQL_DATABASE || 'dhaka_transit_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Post route handler for user searches in Express node
app.post('/api/searches', async (req, res) => {
  const { from, to, routeId } = req.body;
  
  if (!from || !to) {
    return res.status(400).json({ success: false, error: 'Origin and destination stops are required.' });
  }

  // Support proxies to retrieve actual client IP addresses
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userIp = rawIp.split(',')[0].trim(); // First entry is the client
  
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown Device/Browser';

  try {
    // Save to real database securely (prevents SQL Injection)
    const sql = `
      INSERT INTO searches_log (user_ip, user_agent, from_stop, to_stop, route_id) 
      VALUES (?, ?, ?, ?, ?)
    `;
    await dbPool.execute(sql, [userIp, userAgent, from, to, routeId || null]);

    res.json({ success: true, message: 'Telemetry search logged successfully!' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, error: 'Failed to record tracking inside real DB.' });
  }
});
```

---

## 📈 Part 3: Retrieving "What Users Search" Today

You wanted to see: **What searches? Today's searches? Which user/IP address ?** Keep track of incoming traffic using standard query parameters:

### 1. SQL Query to get Today's User Searches
Run this inside your Admin dashboard API, which returns all records registered since Midnight of the current day:

```sql
SELECT 
    id,
    timestamp,
    user_ip AS ip_address,
    user_agent AS device_platform,
    from_stop AS origin,
    to_stop AS destination,
    route_id AS line_number
FROM searches_log
WHERE DATE(timestamp) = CURDATE()
ORDER BY timestamp DESC;
```

### 2. Express API Endpoint
Create a secure endpoint on the Express side to return today's searches for statistical aggregation:

```typescript
app.get('/api/analytics/today', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT 
        id, 
        timestamp, 
        user_ip, 
        user_agent, 
        from_stop, 
        to_stop, 
        route_id 
      FROM searches_log 
      WHERE DATE(timestamp) = CURDATE() 
      ORDER BY timestamp DESC
    `);
    
    res.json({ 
      success: true, 
      count: (rows as any[]).length, 
      data: rows 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch SQL dataset.' });
  }
});
```

---

## 🔐 Part 4: Future Roadmap: Building the Administrative Portal

When you are ready to implement the Admin web panel, use this architectural guide to build it safely:

1. **Authentication (JWT / Session keys)**
   - Never use plaintext passwords. Secure password entry using `bcrypt` or open OAuth services.
   - Restrict access strictly with custom middleware checking authorization headers:
     ```typescript
     function authenticateAdmin(req, res, next) {
       const token = req.headers['authorization'];
       if (!token || token !== process.env.JWT_SECRET) {
         return res.status(403).json({ error: 'Access forbidden: unauthorized administrative role' });
       }
       next();
     }
     app.get('/api/admin/logs', authenticateAdmin, async (req, res) => { ... });
     ```

2. **UI Component Layout for Analytics**
   - Incorporate tracking graphs showing peak hours of the day.
   - Render a real-time table of recent searches displaying:
     - Flag indicators for different user-agents (e.g., Mobile 📱 vs. Desktop 💻).
     - Geolocation maps derived from the stored IP address (using external Geolocation APIs like ipapi).
     - Rapid diagnostic charts indicating the most searched stations to optimize bus resources.

---

### 🛡️ Local Testing & Sandbox Compilation
In the AI Studio sandbox environment, search queries are automatically routed into the local file logger `/searches_db.json`. When launching to a live production server/applet, configure the environment variables:
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
and replace the temporary JSON save logic with the MySQL pools detailed above!
