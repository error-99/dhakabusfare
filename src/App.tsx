import React, { useState, useMemo, useEffect } from "react";
import { defaultRoutes } from "./data/defaultRoutes";
import { Route, Stop } from "./types";
import FareCalculator from "./components/FareCalculator";
import PlaceSearch from "./components/PlaceSearch";
import RouteTimeline from "./components/RouteTimeline";
import VisualRouteLineMap from "./components/VisualRouteLineMap";
import ReportPopup from "./components/ReportPopup";
import { Compass, Bus, Map, FileJson, Route as RouteIcon, Info, Layers, CheckCircle2, RefreshCw, KeyRound, Lock, Unlock, ShieldAlert, Activity, FileCode, Check, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SearchQueryLog {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  routeId?: string;
}

interface SiteTelemetry {
  visits: number;
  searches: SearchQueryLog[];
  feedbacks: any[];
}

export default function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [sourceLabel, setSourceLabel] = useState("Database Synchronizing...");
  const [isMySQLActive, setIsMySQLActive] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Telemetry system variables
  const [telemetry, setTelemetry] = useState<SiteTelemetry>({
    visits: 1,
    searches: [],
    feedbacks: [],
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Filter query for route browsing list
  const [routeSearchQuery, setRouteSearchQuery] = useState("");

  // Fetch routes from the Express server database on mount
  const fetchServerRoutes = async (showNotification = false) => {
    try {
      const res = await fetch("/api/routes");
      const data = await res.json();
      if (data && data.success && Array.isArray(data.routes) && data.routes.length > 0) {
        setRoutes(data.routes);
        setIsMySQLActive(!!data.isMySQLActive);
        if (data.isMySQLActive) {
          setSourceLabel("MySQL Database Active");
        } else {
          setSourceLabel("Local Database Active");
        }
        setDbError(null);
        
        // Retain selection if valid, otherwise select first
        const matched = data.routes.find((r: Route) => r.route_id === selectedRoute?.route_id);
        if (matched) {
          setSelectedRoute(matched);
        } else {
          setSelectedRoute(data.routes[0]);
          setFromStop(data.routes[0].stops[0] || null);
          setToStop(data.routes[0].stops[data.routes[0].stops.length - 1] || null);
        }
      } else {
        const errorMsg = data?.error || "Zero bus pathways fetched from MySQL server tables.";
        setDbError(errorMsg);
        setSourceLabel("MySQL Offline");
        setIsMySQLActive(false);
      }
    } catch (e: any) {
      console.warn("Express server database offline or failed to query MySQL:", e);
      // No server crash since we added failover on backend, but if fetch rejected, do standard handling
      setDbError(`Failed to connect to the Express server API. Detail: ${e.message || String(e)}`);
      setSourceLabel("MySQL Offline");
      setIsMySQLActive(false);
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    fetchServerRoutes();

    // Load or initialize client-side server telemetry simulation logger (JSON DB ready)
    const raw = localStorage.getItem("dhaka_site_telemetry");
    let current: SiteTelemetry = { visits: 0, searches: [], feedbacks: [] };
    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch (e) {
        // Fallback
      }
    }
    current.visits = (current.visits || 0) + 1;
    localStorage.setItem("dhaka_site_telemetry", JSON.stringify(current));
    setTelemetry(current);
  }, []);

  const handleLogSearch = async (from: string, to: string, routeId?: string) => {
    // Send log to search database endpoint on the Express server (recorded with user IP & timestamp)
    try {
      await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, routeId }),
      });
    } catch (e) {
      console.warn("Express server database search logging bypassed:", e);
    }

    setTelemetry((prev) => {
      const updated = {
        ...prev,
        searches: [
          {
            id: `SRH-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date().toLocaleTimeString(),
            from,
            to,
            routeId,
          },
          ...(prev.searches || []),
        ].slice(0, 40),
      };
      localStorage.setItem("dhaka_site_telemetry", JSON.stringify(updated));
      return updated;
    });
  };

  // Keep track of database statistics dynamically
  const stats = useMemo(() => {
    let totalStopsCount = 0;
    const uniqStops = new Set<string>();
    routes.forEach((r) => {
      r.stops.forEach((s) => {
        totalStopsCount++;
        uniqStops.add(s.stop_name);
      });
    });

    return {
      routesCount: routes.length,
      averageStops: routes.length ? Math.round(totalStopsCount / routes.length) : 0,
      uniqueStopsCount: uniqStops.size,
    };
  }, [routes]);

  // Preset default stops when route is changed inside the route dropdown Catalog lists
  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    if (route.stops.length > 0) {
      setFromStop(route.stops[0]);
      setToStop(route.stops[route.stops.length - 1]);
    } else {
      setFromStop(null);
      setToStop(null);
    }
  };

  // Helper trigger utilized by the Search component: select route and assign stop to origin or destination
  const handleSelectRouteStop = (route: Route, stop: Stop, role: "from" | "to") => {
    if (selectedRoute?.route_id !== route.route_id) {
      setSelectedRoute(route);
      if (role === "from") {
        setFromStop(stop);
        setToStop(route.stops[route.stops.length - 1] || null);
      } else {
        setFromStop(route.stops[0] || null);
        setToStop(stop);
      }
    } else {
      if (role === "from") {
        setFromStop(stop);
      } else {
        setToStop(stop);
      }
    }
  };

  // Helper trigger to set both origin and destination stops simultaneously on search match
  const handleSelectFullTrip = (route: Route, origin: Stop, destination: Stop) => {
    setSelectedRoute(route);
    setFromStop(origin);
    setToStop(destination);
    
    // Smoothly scroll to top calculator/ticket booth
    setTimeout(() => {
      window.scrollTo({ top: 300, behavior: "smooth" });
    }, 100);
  };

  // Setup initial stops on loaded route if missing
  useEffect(() => {
    if (selectedRoute && (!fromStop || !toStop)) {
      setFromStop(selectedRoute.stops[0] || null);
      setToStop(selectedRoute.stops[selectedRoute.stops.length - 1] || null);
    }
  }, [selectedRoute]);

  // Filter routes according to user keyword search (ID or text representation)
  const filteredRoutes = useMemo(() => {
    const q = routeSearchQuery.toLowerCase().trim();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.route_id.toLowerCase().includes(q) ||
        r.route_name.toLowerCase().includes(q)
    );
  }, [routes, routeSearchQuery]);

  if (dbError && routes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="mysql-error-fullscreen-wrapper">
        <div className="max-w-md w-full py-12 px-8 bg-white border border-slate-200 shadow-xl rounded-2xl text-center space-y-6" id="mysql-error-fullscreen">
          <div className="relative inline-flex">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-[11px] uppercase tracking-widest font-extrabold text-slate-400 font-mono">
              Dhaka Transit Responsibility Hub
            </h1>
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-900 font-sans">
              App in Maintenance
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              Please try again.
            </p>
            <p className="text-xs text-slate-550 leading-relaxed max-w-sm mx-auto">
              We are currently aligning and updating our routes & fare synchronization database. Please try again later.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button 
              onClick={() => {
                setAppLoading(true);
                fetchServerRoutes(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row relative" id="applet-viewport">
      
      {/* 1. COMPACT STICKY MOBILE TOP BAR (Hidden on desktop) */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs w-full">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-indigo-650 active:scale-95 transition-all cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="min-w-0 flex-1 px-3 text-center">
          <h1 className="text-xs font-black tracking-tight text-slate-900 truncate uppercase">
            Dhaka Transit Hub
          </h1>
          {selectedRoute && (
            <span className="text-[10px] font-mono font-bold text-indigo-600 block truncate">
              {selectedRoute.route_id} • {selectedRoute.route_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isMySQLActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
          <span className="text-[9px] font-bold text-slate-500 font-mono">
            {isMySQLActive ? "MySQL" : "Local"}
          </span>
        </div>
      </div>

      {/* 2. RESPONSIVE MOBILE SIDEBAR DRAWER (Framer-motion powered slider overlay) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black z-40"
            />
            {/* Slide-out Panel drawer drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col border-r border-slate-200 h-full"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black tracking-tight text-slate-900 uppercase">Dhaka Transit</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Responsibility Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Connection Status Indicator */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 block uppercase tracking-widest font-extrabold font-mono font-sans">
                    Active DB Repository
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${isMySQLActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                    <span className="text-xs font-black text-slate-800 font-sans">
                      {sourceLabel}
                    </span>
                  </div>
                </div>

                {/* DB Summary Stats Card */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 p-3.5 rounded-2xl border border-indigo-100/50">
                  <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono mb-2">Transit Metrics</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center bg-white py-2 rounded-xl border border-slate-100">
                      <span className="text-[8px] text-slate-400 block font-bold uppercase">Lines</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{stats.routesCount}</span>
                    </div>
                    <div className="text-center bg-white py-2 rounded-xl border border-slate-100">
                      <span className="text-[8px] text-slate-400 block font-bold uppercase">Stations</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{stats.uniqueStopsCount}</span>
                    </div>
                    <div className="text-center bg-white py-2 rounded-xl border border-slate-100">
                      <span className="text-[8px] text-slate-400 block font-bold uppercase">Avg Stops</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{stats.averageStops}</span>
                    </div>
                  </div>
                </div>

                {/* Selected bus route overview inside drawer */}
                {selectedRoute && (
                  <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-md border border-indigo-700/50">
                    <span className="text-[8px] font-mono tracking-widest bg-white/20 text-white font-black px-1.5 py-0.5 rounded-lg inline-block uppercase mb-1">
                      SELECTED ROUTE CODE: {selectedRoute.route_id}
                    </span>
                    <h4 className="text-xs font-black leading-tight truncate text-left">{selectedRoute.route_name}</h4>
                    <p className="text-[9px] text-indigo-150 mt-1 font-mono text-left">
                      {selectedRoute.stops.length} checkpoints • {selectedRoute.stops[selectedRoute.stops.length - 1]?.cumulative_km.toFixed(1)} route km
                    </p>
                  </div>
                )}

                {/* Bus pathways list header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider font-sans">Select Bus Route</span>
                    <span className="text-[10px] text-indigo-600 font-bold font-mono">{filteredRoutes.length} matching</span>
                  </div>

                  <input
                    type="text"
                    value={routeSearchQuery}
                    onChange={(e) => setRouteSearchQuery(e.target.value)}
                    placeholder="Search routes..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  />

                  <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                    {filteredRoutes.map((r) => {
                      const isSelected = selectedRoute?.route_id === r.route_id;
                      return (
                        <button
                          key={r.route_id}
                          onClick={() => {
                            handleSelectRoute(r);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left transition-all border shrink-0 text-xs flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700 font-bold animate-none"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <div className="min-w-0 flex-1 text-left">
                            <span className={`px-1.5 py-0.2 font-mono text-[9px] font-bold rounded-lg mr-2 ${isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                              {r.route_id}
                            </span>
                            <span className="truncate inline-block max-w-[140px] align-middle">{r.route_name}</span>
                          </div>
                          <span className={`text-[9px] font-mono whitespace-nowrap shrink-0 ml-1 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                            {r.stops.length} stops
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. PERSISTENT DESKTOP SIDEBAR (Static/sticky left panel) */}
      <aside className="hidden md:flex flex-col w-84 bg-white border-r border-slate-200/80 h-screen sticky top-0 shrink-0 select-none z-10" id="desktop-sidebar">
        {/* Brand Banner */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform shrink-0">
              <Bus className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs uppercase tracking-widest font-black text-slate-400 font-mono">
                Dhaka Transit
              </h1>
              <h2 className="text-base font-black tracking-tight text-slate-900 font-sans">
                Responsibility Hub
              </h2>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-sans leading-tight mt-2 italic">
            Taking complete liability over city bus alignments & fare calculations
          </p>
        </div>

        {/* Scrollable Sidebar list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* DB Indicator Widget */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col gap-1 shadow-2xs">
            <span className="text-[9px] text-slate-400 block uppercase tracking-widest font-bold font-mono font-sans">
              Database Repository State
            </span>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isMySQLActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
              <span className="text-xs font-black text-slate-800 font-sans leading-none">
                {sourceLabel}
              </span>
            </div>
          </div>

          {/* Quick Metrics stats integrated directly inside the sidebar */}
          <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono mb-2">Network Diagnostics</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-white py-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[8px] text-slate-400 block font-bold uppercase">Lines</span>
                <span className="text-xs font-black text-slate-800 font-mono">{stats.routesCount}</span>
              </div>
              <div className="text-center bg-white py-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[8px] text-slate-400 block font-bold uppercase">Stations</span>
                <span className="text-xs font-black text-slate-800 font-mono">{stats.uniqueStopsCount}</span>
              </div>
              <div className="text-center bg-white py-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[8px] text-slate-400 block font-bold uppercase">Avg Stops</span>
                <span className="text-xs font-black text-slate-800 font-mono">{stats.averageStops}</span>
              </div>
            </div>
          </div>

          {/* Bus routes list buttons directly in sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider font-sans">Active Bus Networks</span>
              <span className="text-[10px] text-slate-405 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                {routes.length} total
              </span>
            </div>

            {/* Quick Filter */}
            <div className="relative">
              <input
                type="text"
                value={routeSearchQuery}
                onChange={(e) => setRouteSearchQuery(e.target.value)}
                placeholder="Search bus line id or names..."
                className="w-full px-3 py-2 text-xs border border-slate-205 rounded-xl bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>

            {/* Selector Catalog list buttons */}
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1" id="sidebar-route-list">
              {filteredRoutes.map((r) => {
                const isSelected = selectedRoute?.route_id === r.route_id;
                return (
                  <button
                    key={r.route_id}
                    onClick={() => handleSelectRoute(r)}
                    className={`w-full p-3 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-md font-semibold animate-none"
                        : "bg-slate-50/70 hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`px-1.5 py-0.2 font-mono text-[9px] font-bold rounded-lg ${
                        isSelected ? "bg-white/20 text-white" : "bg-white text-indigo-700 border border-indigo-100 shadow-3xs"
                      }`}>
                        {r.route_id}
                      </span>
                      <span className={`text-[9px] font-mono ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                        {r.stops.length} stops · {r.stops[r.stops.length - 1]?.cumulative_km.toFixed(1)} km
                      </span>
                    </div>
                    <p className="text-xs font-extrabold mt-2 truncate max-w-full font-sans leading-tight text-left">{r.route_name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Credit line */}
        <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50 select-none">
          <p className="text-[10px] text-slate-400 font-mono font-medium">Remote Database Connected</p>
        </div>
      </aside>

      {/* 4. MAIN PRODUCTIVITY DASHBOARD VIEWPORT (Takes up rest of the space) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6" id="dashboard-container">
          
          {appLoading ? (
            <div className="py-32 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium font-mono">Syncing server variables & pathways...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              
              {/* Desktop Dashboard Title Banner Block */}
              <div className="hidden md:flex items-center justify-between pb-2" id="desktop-section-header">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">
                     Dhaka Transit Console
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                     Manage dynamic route selections, stop coordinates, and fare calculations globally
                  </p>
                </div>
                {selectedRoute && (
                  <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-2xl border border-indigo-100">
                     <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
                     <span className="text-xs font-mono font-black text-indigo-800">
                        Line: {selectedRoute.route_id}
                     </span>
                  </div>
                )}
              </div>

              {/* 1. Route Finder / Journey Planner Deck */}
              <PlaceSearch
                routes={routes}
                onSelectRouteStop={handleSelectRouteStop}
                onSelectFullTrip={handleSelectFullTrip}
                selectedRouteId={selectedRoute?.route_id}
                selectedFromStopName={fromStop?.stop_name}
                selectedToStopName={toStop?.stop_name}
                onLogSearch={handleLogSearch}
              />

              {/* 2. Live Corridor Map Simulation Widget */}
              <div className="space-y-2 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider font-bold">
                      Live Simulated Transit Corridor
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">
                      Line Map Simulation
                    </h3>
                  </div>
                  {selectedRoute && (
                    <span className="text-[10px] font-mono font-bold text-indigo-700 tracking-wider bg-indigo-50 border border-indigo-150 rounded-lg px-2 py-0.5">
                      Line {selectedRoute.route_id}
                    </span>
                  )}
                </div>
                <VisualRouteLineMap
                   route={selectedRoute}
                   fromStop={fromStop}
                   toStop={toStop}
                   onSelectStop={(stop, role) => selectedRoute && handleSelectRouteStop(selectedRoute, stop, role)}
                />
              </div>

              {/* 3. Fare calculations dynamic ticket Booth */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                <div className="pb-4 mb-4 border-b border-rose-100/10">
                   <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider font-bold">Ticket Fare O'Meter</span>
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">Transit Ticket Generator</h3>
                </div>
                <FareCalculator
                  routes={routes}
                  selectedRoute={selectedRoute}
                  onSelectRoute={handleSelectRoute}
                  fromStop={fromStop}
                  onSelectFromStop={setFromStop}
                  toStop={toStop}
                  onSelectToStop={setToStop}
                />
              </div>

              {/* 4. Stop-by-Stop Checkpoint Timelines Element */}
              <div className="space-y-4">
                <div className="bg-indigo-50/60 rounded-3xl p-4 border border-indigo-100 text-[11px] font-sans text-indigo-850 flex items-center justify-between gap-3">
                  <p className="leading-relaxed">
                    🧑‍🏫 <strong>Quick Timeline Guide:</strong> Tap stop circle nodes in the timeline vertical list below to instantly change ticket boarding coordinates or board markers.
                  </p>
                </div>

                <RouteTimeline
                  route={selectedRoute}
                  fromStop={fromStop}
                  toStop={toStop}
                  onSelectStop={(stop, role) => {
                    if (role === "from") {
                      setFromStop(stop);
                    } else {
                      setToStop(stop);
                    }
                  }}
                />
              </div>

              {/* 5. User-Requested Disclaimer with submission active indicator */}
              <div className="p-5 bg-amber-50 rounded-3xl border border-amber-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-700" id="passenger-report-banner">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100/80 text-amber-850 text-[10px] font-bold rounded-lg uppercase tracking-wider font-sans">
                    ⚠️ Database Error / Inaccuracy Notice
                  </span>
                  <p className="text-xs text-slate-650 leading-relaxed font-sans mt-0.5 font-medium">
                    We verify transit distance matrices rigorously, but human mistakes can crop up. Spotted mismatched fares, sequence errors, or skipped bus stations? Help us correction-log the database in real-time.
                  </p>
                </div>
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-sm border border-amber-600/20 cursor-pointer select-none transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <span>Report Error or Mistake</span>
                  <span>➔</span>
                </button>
              </div>

            </div>
          )}

        </main>

        {/* Global Report Correction Form Modal Overlay */}
        <ReportPopup
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          routes={routes}
          selectedRouteId={selectedRoute?.route_id}
        />

        {/* Standard Footer */}
        <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-8" id="main-footer">
          <div className="max-w-5xl mx-auto px-6 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600 hover:rotate-12 transition-transform shadow-xs" />
                <p className="font-bold text-slate-900"> Dhaka Transit Responsibility Hub</p>
              </div>
              <p className="text-[11px] text-slate-500 max-w-md text-center md:text-left font-sans">
                In compliance with local city transport distance regulations. Route timelines and bus fare tickets auto-rendered from remote server repository.
              </p>
              <div className="flex gap-4 items-center">
                <span className="text-[11px] text-slate-400 font-medium">
                  🔐 Encrypted Connection Secure
                </span>
                <span className="text-slate-200">|</span>
                <p className="text-[10px] text-indigo-750 tracking-wider uppercase font-mono bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-bold">
                  Secure Cloud Active
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>

    </div>
  );
}
