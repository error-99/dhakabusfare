import React, { useState, useMemo, useEffect } from "react";
import { defaultRoutes } from "./data/defaultRoutes";
import { Route, Stop } from "./types";
import FareCalculator from "./components/FareCalculator";
import PlaceSearch from "./components/PlaceSearch";
import RouteTimeline from "./components/RouteTimeline";
import VisualRouteLineMap from "./components/VisualRouteLineMap";
import ReportPopup from "./components/ReportPopup";
import { Compass, Bus, Map, FileJson, Route as RouteIcon, Info, Layers, CheckCircle2, RefreshCw, KeyRound, Lock, Unlock, ShieldAlert, Activity, FileCode, Check } from "lucide-react";
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
  const [sourceLabel, setSourceLabel] = useState("MySQL Database Connection");
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

  const [passengerViewTab, setPassengerViewTab] = useState<"finder" | "routes">("finder");
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
        setSourceLabel("MySQL Database Active");
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
      }
    } catch (e: any) {
      console.warn("Express server database offline or failed to query MySQL:", e);
      setDbError(`Failed to connect to the Express server API. Detail: ${e.message || String(e)}`);
      setSourceLabel("MySQL Offline");
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" id="applet-viewport">
      {/* Visual Header */}
      <header className="bg-white text-slate-900 border-b border-slate-200 shadow-xs" id="main-header">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md text-white font-black hover:scale-105 transition-transform">
              <Bus className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 font-sans">
                Dhaka Transit Responsibility Hub
              </h1>
              <p className="text-xs text-slate-500 font-sans">
                Active serverization process that takes complete liability over Dhaka bus routes & fare alignments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="text-left md:text-right shrink-0">
              <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold">Active Server Database Repository</span>
              <span className="text-xs font-bold text-indigo-600 font-mono bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-150">
                {sourceLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container / Content Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6" id="dashboard-container">
        {appLoading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium font-mono">Connecting with MySQL system databases...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Banner */}
            <div className="grid grid-cols-3 gap-3" id="quick-metrics-row">
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/75 shadow-xs flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl shrink-0 border border-indigo-100">
                  <RouteIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 block font-bold uppercase tracking-wider font-sans">Active Lines</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{stats.routesCount}</span>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/75 shadow-xs flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl shrink-0 border border-emerald-100">
                  <Map className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 block font-bold uppercase tracking-wider font-sans">Stations</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{stats.uniqueStopsCount}</span>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/75 shadow-xs flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl shrink-0 border border-amber-100">
                  <Layers className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-650" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 block font-bold uppercase tracking-wider font-sans">Avg Stops</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{stats.averageStops}</span>
                </div>
              </div>
            </div>

            {/* Main Passenger Sub-page navigation Switcher with full visual rhythm */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1 max-w-xl mx-auto border border-slate-205" id="passenger-tab-switcher">
              <button
                onClick={() => setPassengerViewTab("finder")}
                className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  passengerViewTab === "finder"
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-black/5"
                    : "text-slate-600 hover:text-slate-955"
                }`}
              >
                <Compass className="w-4 h-4 shrink-0 text-indigo-550" />
                <span>🗺️ Journey Planner & Fare O'Meter</span>
              </button>
              <button
                onClick={() => setPassengerViewTab("routes")}
                className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  passengerViewTab === "routes"
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-black/5"
                    : "text-slate-600 hover:text-slate-955"
                }`}
              >
                <RouteIcon className="w-4 h-4 shrink-0 text-pink-550" />
                <span>🚏 Bus Routes & Stops Checklist</span>
                {selectedRoute && (
                  <span className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[8.5px] font-mono rounded-lg border border-indigo-200">
                    {selectedRoute.route_id}
                  </span>
                )}
              </button>
            </div>

            {passengerViewTab === "finder" ? (
              /* 1st PAGE LAYOUT: Route finders, visual maps & fare calculation ticket stacked vertically */
              <div className="space-y-6 max-w-4xl mx-auto" id="journey-planner-deck">
                
                {/* First component: Route and direction finder */}
                <PlaceSearch
                  routes={routes}
                  onSelectRouteStop={handleSelectRouteStop}
                  onSelectFullTrip={handleSelectFullTrip}
                  selectedRouteId={selectedRoute?.route_id}
                  selectedFromStopName={fromStop?.stop_name}
                  selectedToStopName={toStop?.stop_name}
                  onLogSearch={handleLogSearch}
                />

                {/* Second component: Interactive map simulation */}
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

                {/* Third component: Fare calculator & active tickets */}
                <FareCalculator
                  routes={routes}
                  selectedRoute={selectedRoute}
                  onSelectRoute={handleSelectRoute}
                  fromStop={fromStop}
                  onSelectFromStop={setFromStop}
                  toStop={toStop}
                  onSelectToStop={setToStop}
                />

                {/* Contextual navigation prompt to route lists page */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setPassengerViewTab("routes");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-black cursor-pointer bg-indigo-50/70 hover:bg-indigo-50 px-5 py-3 rounded-2xl border border-dashed border-indigo-200 transition-all shadow-xs"
                  >
                    𚏏 Looking for complete station lists? View the entire Bus Networks & Stops Timeline checklist here ➔
                  </button>
                </div>

              </div>
            ) : (
              /* 2nd PAGE LAYOUT: Full listings of all bus lines on the network & horizontal / vertical stops checkpoint timeline lists */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in" id="bus-checkpoints-deck">
                
                {/* Available Bus Networks list segment */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4" id="catalog-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider font-sans">Available Bus Networks</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Select a bus line to explore its active timeline.</p>
                    </div>
                    <input
                      type="text"
                      value={routeSearchQuery}
                      onChange={(e) => setRouteSearchQuery(e.target.value)}
                      placeholder="Search routes..."
                      className="px-3 py-2 text-xs border border-slate-205 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-44 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredRoutes.map((r) => {
                      const isSelected = selectedRoute?.route_id === r.route_id;
                      return (
                        <button
                          key={r.route_id}
                          onClick={() => handleSelectRoute(r)}
                          className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between border cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-sm font-semibold animate-none"
                              : "bg-slate-50/70 hover:bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`px-1.5 py-0.2 font-mono text-[9px] font-bold rounded-lg ${
                              isSelected ? "bg-white/20 text-white" : "bg-white text-indigo-700 border border-indigo-100"
                            }`}>
                              {r.route_id}
                            </span>
                            <span className={`text-[10px] font-mono ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                              {r.stops.length} stops · {r.stops[r.stops.length - 1].cumulative_km.toFixed(1)} km
                            </span>
                          </div>
                          <p className="text-xs font-bold mt-2 truncate max-w-full font-sans">{r.route_name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Complete stations checklist checkpoint timelines element */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-indigo-50/60 rounded-3xl p-4 border border-indigo-100 text-[11px] font-sans text-indigo-850 flex items-center justify-between gap-3">
                    <p className="leading-relaxed">
                      🧑‍🏫 <strong>Quick Tips:</strong> Tap station circles in the timeline list below to configure transit tickets automatically, or adjust boarding markers seamlessly.
                    </p>
                    <button
                      onClick={() => {
                        setPassengerViewTab("finder");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs font-bold text-indigo-650 hover:text-indigo-805 bg-white border border-indigo-200/50 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      🎫 Go to Ticket ➔
                    </button>
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

              </div>
            )}

            {/* User-Requested Disclaimer and Feedback lodger activator - Inline Report Option */}
            <div className="mt-8 p-5 bg-amber-50 rounded-3xl border border-amber-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-700" id="passenger-report-banner">
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

      {/* Structured Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-8 mt-12" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
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
  );
}
