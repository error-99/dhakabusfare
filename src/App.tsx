import React, { useState, useMemo, useEffect } from "react";
import { defaultRoutes } from "./data/defaultRoutes";
import { Route, Stop } from "./types";
import FareCalculator from "./components/FareCalculator";
import PlaceSearch from "./components/PlaceSearch";
import RouteTimeline from "./components/RouteTimeline";
import VisualRouteLineMap from "./components/VisualRouteLineMap";
import ReportPopup from "./components/ReportPopup";
import { Compass, Bus, Map, FileJson, Route as RouteIcon, Info, Layers, CheckCircle2, RefreshCw, KeyRound, Lock, Unlock, ShieldAlert, Activity, FileCode, Check, Menu, X, Home, MessageSquare, Ticket, AlertTriangle, ChevronDown, CheckCircle } from "lucide-react";
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

  const [isReportOpen, setIsReportOpen] = useState(false);

  // Tab Navigation State & Active Views (Default is "planner")
  const [activeTab, setActiveTab] = useState<"home" | "planner" | "calculator" | "timeline" | "report">("planner");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Inline database correction form states mapping
  const [reportName, setReportName] = useState("");
  const [reportCategory, setReportCategory] = useState("fare_mismatch");
  const [reportRouteId, setReportRouteId] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRoute) {
      setReportRouteId(selectedRoute.route_id);
    }
  }, [selectedRoute]);

  // Filter query for route browsing list
  const [routeSearchQuery, setRouteSearchQuery] = useState("");

  // Fetch routes from the Express server database on mount
  const fetchServerRoutes = async () => {
    try {
      const res = await fetch("/api/routes");
      const data = await res.json();
      
      if (data && data.maintenance) {
        setMaintenanceMode(true);
        setSourceLabel("System Maintenance");
        setAppLoading(false);
        return;
      }

      if (data && data.success && Array.isArray(data.routes) && data.routes.length > 0) {
        setRoutes(data.routes);
        setIsMySQLActive(!!data.isMySQLActive);
        if (data.isMySQLActive) {
          setSourceLabel("MySQL Database Active");
        } else {
          setSourceLabel("Local Database Active");
        }
        setDbError(null);
        setMaintenanceMode(false);
        
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
        throw new Error(data?.error || "Empty routes data returned");
      }
    } catch (e: any) {
      console.warn("Express server database offline or failed to query database:", e);
      // If we are locally testing or fallback database occurs:
      setRoutes(defaultRoutes);
      setDbError(null);
      setSourceLabel("Local Database Active");
      setIsMySQLActive(false);
      setMaintenanceMode(false);

      const matched = defaultRoutes.find((r: Route) => r.route_id === selectedRoute?.route_id);
      if (matched) {
        setSelectedRoute(matched);
      } else {
        setSelectedRoute(defaultRoutes[0]);
        setFromStop(defaultRoutes[0].stops[0] || null);
        setToStop(defaultRoutes[0].stops[defaultRoutes[0].stops.length - 1] || null);
      }
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
    // Automatically switch active tab to ticket / calculator option
    setActiveTab("calculator");
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
    setActiveTab("calculator");
    
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col relative" id="applet-viewport">
      {/* 1. BRAND HEADER & DATABASE INDICATOR */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs" id="main-header">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform shrink-0">
              <Bus className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 font-sans leading-none flex items-center gap-2">
                Dhaka Transit Responsibility Hub
              </h1>
              <p className="text-[11.5px] font-black text-indigo-700 font-mono mt-1.5 leading-tight uppercase flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full inline-block ${isMySQLActive ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"}`}></span>
                {sourceLabel}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN HUB DASHBOARD CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28" id="dashboard-container">
        {maintenanceMode ? (
          <div className="py-24 text-center space-y-5 max-w-md mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-rose-100 shadow-md" id="maintenance-panel">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-rose-100">
              <AlertTriangle className="w-7 h-7 mx-auto animate-bounce text-rose-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-black text-rose-950 font-sans uppercase tracking-tight">Database Maintenance Active</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                The transit system is current configured to run strictly over our MySQL cluster server. MySQL connection is offline. The system is entering a safety maintenance status. Please retry shortly.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  setAppLoading(true);
                  setMaintenanceMode(false);
                  fetchServerRoutes();
                }}
                className="px-5 py-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer font-mono shadow-xs"
              >
                Retry Server Handshake
              </button>
            </div>
          </div>
        ) : appLoading ? (
          <div className="py-32 text-center space-y-3 block">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium font-mono">Syncing server variables & pathways...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Quick Metrics stats integrated directly as an elegant top-level row */}
                  <div className="grid grid-cols-3 gap-3" id="diagnostics-metrics-row">
                    <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-4 hover:shadow-xs transition-shadow">
                      <div className="p-2 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 border border-indigo-100">
                        <RouteIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] sm:text-[9.5px] text-slate-400 block font-black uppercase tracking-wider font-mono">Active Lines</span>
                        <span className="text-xs sm:text-base font-black text-slate-900 font-mono leading-none">{stats.routesCount}</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-4 hover:shadow-xs transition-shadow">
                      <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 border border-emerald-100">
                        <Map className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] sm:text-[9.5px] text-slate-400 block font-black uppercase tracking-wider font-mono">Stations</span>
                        <span className="text-xs sm:text-base font-black text-slate-900 font-mono leading-none">{stats.uniqueStopsCount}</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5 sm:gap-4 hover:shadow-xs transition-shadow">
                      <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0 border border-amber-100">
                        <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] sm:text-[9.5px] text-slate-400 block font-black uppercase tracking-wider font-mono">Avg Stops</span>
                        <span className="text-xs sm:text-base font-black text-slate-900 font-mono leading-none">{stats.averageStops}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. TRANSIT NAVIGATION BUTTONS CATALOG PANEL */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/85 shadow-xs space-y-4" id="routes-nav-container">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono block uppercase tracking-wider font-bold">Transit Navigation System</span>
                        <h3 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-tight">Active Bus Lines (Switch Route instantly)</h3>
                      </div>
                      
                      {/* Search input inside list */}
                      <div className="relative">
                        <input
                          type="text"
                          value={routeSearchQuery}
                          onChange={(e) => setRouteSearchQuery(e.target.value)}
                          placeholder="Search bus line id or names..."
                          className="w-full md:w-64 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Grid / Flex Wrap Row of Route Selection Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1" id="routes-navbar">
                      {filteredRoutes.map((r) => {
                        const isSelected = selectedRoute?.route_id === r.route_id;
                        return (
                          <button
                            key={r.route_id}
                            onClick={() => handleSelectRoute(r)}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer shadow-3xs hover:-translate-y-0.5 active:translate-y-0 ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 font-sans shadow-md animate-none"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <span className={`px-1.5 py-0.5 font-mono text-[9px] font-extrabold rounded-lg ${
                              isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            }`}>
                              {r.route_id}
                            </span>
                            <span className="font-sans leading-none">{r.route_name}</span>
                            <span className={`text-[9px] px-1 font-mono leading-none rounded-sm ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                              ({r.stops.length} stops)
                            </span>
                          </button>
                        );
                      })}

                      {filteredRoutes.length === 0 && (
                        <div className="text-center py-6 w-full bg-slate-50/55 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs text-slate-500 font-medium font-sans">No active bus pathways found matching "{routeSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRoute && (
                    <div className="p-5 bg-indigo-600 text-white rounded-3xl shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[8.5px] font-mono tracking-widest bg-white/20 text-white font-black px-2 py-0.5 rounded-lg inline-block uppercase mb-1">
                          SELECTED ACTIVE CORRIDOR
                        </span>
                        <h4 className="text-sm sm:text-base font-black leading-tight text-white">{selectedRoute.route_name}</h4>
                        <p className="text-[10px] text-indigo-150 mt-1 font-mono">
                          Contains {selectedRoute.stops.length} checkpoint stops spanning over {selectedRoute.stops[selectedRoute.stops.length - 1]?.cumulative_km?.toFixed(1)} cumulative kilometers
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActiveTab("planner");
                          }}
                          className="bg-white/25 hover:bg-white/30 active:bg-white/40 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer select-none"
                        >
                          View Planner Map ➔
                        </button>
                      </div>
                    </div>
                  )}


                </motion.div>
              )}

              {activeTab === "planner" && (
                <motion.div
                  key="planner"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Journey Planner & Fare O'Meter Section */}
                  <PlaceSearch
                    routes={routes}
                    onSelectRouteStop={handleSelectRouteStop}
                    onSelectFullTrip={handleSelectFullTrip}
                    selectedRouteId={selectedRoute?.route_id}
                    selectedFromStopName={fromStop?.stop_name}
                    selectedToStopName={toStop?.stop_name}
                    onLogSearch={handleLogSearch}
                  />

                  {/* Live Corridor Map Simulation Widget */}
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
                        <span className="text-[10px] font-mono font-bold text-indigo-700 tracking-wider bg-indigo-50 border border-indigo-150 rounded-lg px-2 py-0.5 animate-none">
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
                </motion.div>
              )}

              {activeTab === "calculator" && (
                <motion.div
                  key="calculator"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Fare calculations dynamic ticket Booth */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                    <div className="pb-4 mb-4 border-b border-slate-100">
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
                      onOpenReport={() => setIsReportOpen(true)}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === "timeline" && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
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
                </motion.div>
              )}

              {activeTab === "report" && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Inline Database Correction Form */}
                  <div className="bg-white rounded-3xl border border-slate-200/85 p-6 shadow-xs space-y-6">
                    <div className="pb-4 border-b border-slate-150">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-755 text-[10px] font-mono font-bold rounded-lg border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        DATABASE RECONCILIATION HUB
                      </span>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-sans mt-2">
                        Report Inaccuracy / Correct Stop Sequences
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-normal">
                        Help us make Dhaka's dynamic distance matrices completely accurate. Submit precise interval records to overwrite outdated database nodes.
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      {reportSuccess ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-12 flex flex-col items-center text-center space-y-4"
                          id="report-success-screen"
                        >
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-xs animate-bounce">
                            <CheckCircle className="w-10 h-10" />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-900 uppercase tracking-wider">Report Filed Successfully!</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                              Thank you for your verification query. Your correction entry has been formatted and logged into <strong>reports_db.json</strong>.
                            </p>
                            <button
                              onClick={() => {
                                setReportSuccess(false);
                                setReportNotes("");
                              }}
                              className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                            >
                              File Another Discrepancy Report
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!reportNotes.trim()) {
                              setReportError("Please specify description details for this route correction.");
                              return;
                            }
                            setReportSubmitting(true);
                            setReportError(null);
                            try {
                              const res = await fetch("/api/reports", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: reportName.trim() || undefined,
                                  category: reportCategory,
                                  routeId: reportRouteId,
                                  notes: reportNotes.trim()
                                })
                              });
                              const d = await res.json();
                              if (d.success) {
                                setReportSuccess(true);
                                setReportName("");
                                setReportNotes("");
                              } else {
                                setReportError(d.error || "Failed to submit database update.");
                              }
                            } catch {
                              setReportError("Network failure. Preserving draft layout.");
                            } finally {
                              setReportSubmitting(false);
                            }
                          }}
                          className="space-y-5"
                          id="report-inline-form"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                                1. Affected Bus Line
                              </label>
                              <div className="relative">
                                <select
                                  value={reportRouteId}
                                  onChange={(e) => setReportRouteId(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-3 pr-10 text-xs text-slate-800 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                >
                                  {routes.map((r) => (
                                    <option key={r.route_id} value={r.route_id}>
                                      Line {r.route_id} — {r.route_name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                                Category of Error
                              </label>
                              <div className="relative">
                                <select
                                  value={reportCategory}
                                  onChange={(e) => setReportCategory(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-205 py-2.5 pl-3 pr-10 text-xs text-slate-800 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                >
                                  <option value="fare_mismatch">Wrong Fare Pricing Matrix</option>
                                  <option value="missing_stop">Missing Physical Stop</option>
                                  <option value="sequence_error">Incorrect Bus Sequence Order</option>
                                  <option value="distance_error">Inaccurate Interdistance KM</option>
                                  <option value="other_issue">Other App Bug / Platform Issue</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                              Your Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={reportName}
                              onChange={(e) => setReportName(e.target.value)}
                              placeholder="e.g. Sajid Chowdhury"
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                                Correction Details
                              </label>
                              <span className="text-[10px] text-slate-400 italic">Please be specific</span>
                            </div>
                            <textarea
                              rows={4}
                              value={reportNotes}
                              onChange={(e) => setReportNotes(e.target.value)}
                              placeholder="Describe the discrepancy... e.g. 'The fare from Shahbagh to Farmgate should be 10 BDT instead of 15 BDT' or 'Line 1 lists Mirpur-10 before Kazipara, but Kazipara is reached first'."
                              className="w-full bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 leading-relaxed"
                            />
                          </div>

                          {reportError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                              <p className="font-medium leading-normal">{reportError}</p>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={reportSubmitting}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 select-none flex items-center justify-center gap-1.5"
                          >
                            {reportSubmitting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Verifying Database Link...</span>
                              </>
                            ) : (
                              <>
                                <span>Save Correction Log</span>
                                <span>➔</span>
                              </>
                            )}
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Disclaimer at bottom with direct tab transition trigger */}
            {activeTab !== "report" && (
              <div className="p-5 bg-amber-50 rounded-3xl border border-amber-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-700" id="passenger-report-banner">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100/80 text-amber-850 text-[10px] font-bold rounded-lg uppercase tracking-wider font-sans">
                    ⚠️ Database Error / Inaccuracy Notice
                  </span>
                  <p className="text-xs text-slate-655 leading-relaxed font-sans mt-0.5 font-medium">
                    We verify transit distance matrices rigorously, but human mistakes can crop up. Spotted mismatched fares, sequence errors, or skipped bus stations? Help us correction-log the database in real-time.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setReportRouteId(selectedRoute?.route_id || routes[0]?.route_id || "");
                    setReportError(null);
                    setReportSuccess(false);
                    setActiveTab("report");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-sm border border-amber-600/20 cursor-pointer select-none transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <span>Report Inaccuracies</span>
                  <span>➔</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. HIGH FIDELITY STICKY FLOATING REAL-TIME PORTABLE BOTTOM NAVIGATION */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-full sm:max-w-md bg-slate-900/95 backdrop-blur-md rounded-3xl py-2 px-3 border border-slate-800 shadow-[0_12px_45px_rgba(0,0,0,0.38)] z-40" id="sticky-realtime-nav">
        <div className="flex items-center justify-around relative">
          
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl relative transition-all duration-200 cursor-pointer ${
              activeTab === "home" ? "text-indigo-400 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Overview & Catalog"
          >
            <Home className="w-5 h-5 transition-transform" />
            <span className="text-[9px] font-mono font-bold tracking-tight mt-1">Home</span>
            {activeTab === "home" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute -bottom-1 w-6 h-1 bg-indigo-500 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          {/* Tab 2: Ticket */}
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl relative transition-all duration-200 cursor-pointer ${
              activeTab === "calculator" ? "text-indigo-400 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Ticket Fare Calculator"
          >
            <Ticket className="w-5 h-5 transition-transform" />
            <span className="text-[9px] font-mono font-bold tracking-tight mt-1">Ticket</span>
            {activeTab === "calculator" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute -bottom-1 w-6 h-1 bg-indigo-500 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          {/* Tab 3: Centered Floating High-Contrast Indicator - Planner */}
          <div className="relative -mt-6">
            <button
              onClick={() => {
                setActiveTab("planner");
              }}
              className={`w-14 h-14 bg-gradient-to-tr from-sky-450 to-indigo-650 rounded-2xl flex flex-col items-center justify-center text-white shadow-[0_8px_30px_rgba(79,70,229,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20`}
              title="Journey Planner & Map"
            >
              <div className="relative">
                <Compass className="w-6 h-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-450 rounded-full border border-white animate-pulse"></span>
              </div>
            </button>
            <span className="text-[8px] font-mono font-extrabold tracking-widest text-indigo-400/90 block text-center uppercase mt-1">
              Planner
            </span>
          </div>

          {/* Tab 4: Routes Timeline */}
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl relative transition-all duration-200 cursor-pointer ${
              activeTab === "timeline" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Stop Timelines"
          >
            <RouteIcon className="w-5 h-5" />
            <span className="text-[9px] font-mono font-bold tracking-tight mt-1">Routes</span>
            {activeTab === "timeline" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute -bottom-1 w-6 h-1 bg-indigo-500 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          {/* Tab 5: Report Hub */}
          <button
            onClick={() => {
              setReportRouteId(selectedRoute?.route_id || routes[0]?.route_id || "");
              setReportError(null);
              setReportSuccess(false);
              setActiveTab("report");
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl relative transition-all duration-200 cursor-pointer ${
              activeTab === "report" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Report Correction Hub"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </div>
            <span className="text-[9px] font-mono font-bold tracking-tight mt-1">Report</span>
            {activeTab === "report" && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute -bottom-1 w-6 h-1 bg-indigo-500 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>

        </div>
      </div>

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
              <p className="text-[10px] text-indigo-755 tracking-wider uppercase font-mono bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-bold">
                Secure Cloud Active
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
