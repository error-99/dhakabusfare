import React, { useState, useMemo } from "react";
import { Route, Stop } from "../types";
import { MapPin, Search, ArrowRight, Check, Compass, Sliders, RefreshCw, Navigation, Navigation2 } from "lucide-react";
import { getEnglishName } from "../utils/stationNames";

interface PlaceSearchProps {
  routes: Route[];
  onSelectRouteStop: (route: Route, stop: Stop, role: "from" | "to") => void;
  onSelectFullTrip?: (route: Route, fromStop: Stop, toStop: Stop) => void;
  selectedRouteId?: string;
  selectedFromStopName?: string;
  selectedToStopName?: string;
  onLogSearch?: (from: string, to: string, routeId?: string) => void;
}

export default function PlaceSearch({
  routes,
  onSelectRouteStop,
  onSelectFullTrip,
  selectedRouteId,
  selectedFromStopName,
  selectedToStopName,
  onLogSearch,
}: PlaceSearchProps) {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");

  // Synchronise search inputs with props so clicking station or map node updates text boxes
  React.useEffect(() => {
    if (selectedFromStopName) {
      setStartQuery(selectedFromStopName);
    } else {
      setStartQuery("");
    }
  }, [selectedFromStopName]);

  React.useEffect(() => {
    if (selectedToStopName) {
      setEndQuery(selectedToStopName);
    } else {
      setEndQuery("");
    }
  }, [selectedToStopName]);

  // Swap input fields
  const handleSwap = () => {
    const temp = startQuery;
    setStartQuery(endQuery);
    setEndQuery(temp);
  };

  // Compute matched connections
  // Compute matched connections
  const matchedConnections = useMemo(() => {
    // Normalise text function that covers standard Bengali variations
    const normalizeText = (text: string): string => {
      if (!text) return "";
      let val = text.normalize("NFC").toLowerCase().trim();
      // Replace Bengali dot letter variants to be interchangeable with their non-dot/composite forms:
      val = val.replace(/\u09a1\u09bc/g, "ড়"); // uniform equivalent
      val = val.replace(/ড়/g, "ড়");           // standard characters to uniform ড়
      val = val.replace(/\u09a2\u09bc/g, "ঢ়");
      val = val.replace(/ঢ়/g, "ঢ়");
      val = val.replace(/\u09af\u09bc/g, "য়");
      val = val.replace(/য়/g, "য়");
      val = val.replace(/য়/g, "য়");
      return val;
    };

    const qStart = normalizeText(startQuery);
    const qEnd = normalizeText(endQuery);

    // Case 1: Both Start and End are typed - Find Direct Trip Connections
    if (qStart && qEnd) {
      const results: Array<{
        route: Route;
        fromStop: Stop;
        toStop: Stop;
        startIndex: number;
        endIndex: number;
        distance: number;
        fare: number;
        stopsCount: number;
        direction: "forward" | "reverse";
      }> = [];

      routes.forEach((route) => {
        const startMatches = route.stops
          .map((stop, index) => ({ stop, index }))
          .filter((item) => {
            const bNorm = normalizeText(item.stop.stop_name);
            const enNorm = getEnglishName(item.stop.stop_name).toLowerCase();
            return bNorm.includes(qStart) || enNorm.includes(qStart) || item.stop.stop_name.toLowerCase().includes(qStart);
          });

        const endMatches = route.stops
          .map((stop, index) => ({ stop, index }))
          .filter((item) => {
            const bNorm = normalizeText(item.stop.stop_name);
            const enNorm = getEnglishName(item.stop.stop_name).toLowerCase();
            return bNorm.includes(qEnd) || enNorm.includes(qEnd) || item.stop.stop_name.toLowerCase().includes(qEnd);
          });

        startMatches.forEach((sm) => {
          endMatches.forEach((em) => {
            if (sm.index < em.index) {
              const distance = em.stop.cumulative_km - sm.stop.cumulative_km;
              const fare = Math.round(Math.max(route.minimum_fare || 10, distance * route.fare_per_km));
              results.push({
                route,
                fromStop: sm.stop,
                toStop: em.stop,
                startIndex: sm.index,
                endIndex: em.index,
                distance,
                fare,
                stopsCount: em.index - sm.index,
                direction: "forward",
              });
            } else if (sm.index > em.index) {
              // Bidirectional route support (Return Trip)
              const distance = sm.stop.cumulative_km - em.stop.cumulative_km;
              const fare = Math.round(Math.max(route.minimum_fare || 10, distance * route.fare_per_km));
              results.push({
                route,
                fromStop: sm.stop,
                toStop: em.stop,
                startIndex: sm.index,
                endIndex: em.index,
                distance,
                fare,
                stopsCount: sm.index - em.index,
                direction: "reverse",
              });
            }
          });
        });
      });

      return { type: "both", data: results };
    }

    // Case 2: Only Start is typed - Find passing routes through this origin
    if (qStart) {
      const results: Array<{
        route: Route;
        matchingStop: Stop;
        stopIndex: number;
      }> = [];

      routes.forEach((route) => {
        route.stops.forEach((stop, index) => {
          const bNorm = normalizeText(stop.stop_name);
          const enNorm = getEnglishName(stop.stop_name).toLowerCase();
          if (bNorm.includes(qStart) || enNorm.includes(qStart) || stop.stop_name.toLowerCase().includes(qStart)) {
            results.push({
              route,
              matchingStop: stop,
              stopIndex: index,
            });
          }
        });
      });

      return { type: "start", data: results };
    }

    // Case 3: Only End is typed - Find passing routes through this destination
    if (qEnd) {
      const results: Array<{
        route: Route;
        matchingStop: Stop;
        stopIndex: number;
      }> = [];

      routes.forEach((route) => {
        route.stops.forEach((stop, index) => {
          const bNorm = normalizeText(stop.stop_name);
          const enNorm = getEnglishName(stop.stop_name).toLowerCase();
          if (bNorm.includes(qEnd) || enNorm.includes(qEnd) || stop.stop_name.toLowerCase().includes(qEnd)) {
            results.push({
              route,
              matchingStop: stop,
              stopIndex: index,
            });
          }
        });
      });

      return { type: "end", data: results };
    }

    // Case 4: None
    return { type: "none", data: [] };
  }, [routes, startQuery, endQuery]);

  const handleApplyTrip = (route: Route, fromStop: Stop, toStop: Stop) => {
    if (onLogSearch) {
      onLogSearch(fromStop.stop_name, toStop.stop_name, route.route_id);
    }
    if (onSelectFullTrip) {
      onSelectFullTrip(route, fromStop, toStop);
    } else {
      // Fallback
      onSelectRouteStop(route, fromStop, "from");
      setTimeout(() => {
        onSelectRouteStop(route, toStop, "to");
      }, 50);
    }
  };

  const hasSearch = !!(startQuery || endQuery);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4" id="place-search-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Compass className="w-4 h-4 text-indigo-600 animate-pulse" />
            Route & Directions Finder
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
            Search station pairs to find direct bus routes ("rules") connecting your journey.
          </p>
        </div>
        {hasSearch && (
          <button
            onClick={() => {
              setStartQuery("");
              setEndQuery("");
            }}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Clear Journey
          </button>
        )}
      </div>

      {/* Dual Search Fields Input Cluster */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-stretch gap-3 relative">
        {/* From (Start) Station */}
        <div className="flex-1 space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
            🛫 Boarding From (Start Point)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Navigation className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <input
              type="text"
              value={startQuery}
              onChange={(e) => setStartQuery(e.target.value)}
              placeholder="e.g. মিরপুর-১০, ফার্মগেট, কালশী"
              className="w-full pl-9 pr-8 py-2 border border-slate-200 bg-white text-slate-800 placeholder-slate-400 font-sans text-xs rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
            />
            {startQuery && (
              <button
                onClick={() => setStartQuery("")}
                className="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-400 hover:text-slate-650 cursor-pointer border-0 bg-transparent font-sans"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Swap Buttons Row for UX and precision */}
        <div className="flex items-center justify-center bg-transparent shrink-0">
          <button
            onClick={handleSwap}
            title="Swap locations"
            className="p-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-xs cursor-pointer transition-colors flex items-center justify-center self-end md:mb-0.5"
          >
            <Sliders className="w-3.5 h-3.5 rotate-90" />
          </button>
        </div>

        {/* To (Destination) Station */}
        <div className="flex-1 space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
            🛬 Alighting At (Destination)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Navigation2 className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <input
              type="text"
              value={endQuery}
              onChange={(e) => setEndQuery(e.target.value)}
              placeholder="e.g. মতিঝিল, শাহবাগ, উত্তরা"
              className="w-full pl-9 pr-8 py-2 border border-slate-200 bg-white text-slate-800 placeholder-slate-400 font-sans text-xs rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
            />
            {endQuery && (
              <button
                onClick={() => setEndQuery("")}
                className="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-400 hover:text-slate-650 cursor-pointer border-0 bg-transparent font-sans"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Stations Lists - To minimize on-screen clutter and aid quick testing */}
      {!hasSearch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Boarding Helpers */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
              Quick start terminals
            </span>
            <div className="flex flex-wrap gap-1">
              {["মিরপুর-১০", "কালশী", "ফার্মগেট", "সাভার", "মহাখালী"].map((node) => (
                <button
                  key={node}
                  onClick={() => {
                    setStartQuery(node);
                    const matched = routes.find((r) => r.stops.some((s) => s.stop_name === node));
                    if (matched) {
                      const stop = matched.stops.find((s) => s.stop_name === node)!;
                      onSelectRouteStop(matched, stop, "from");
                    }
                  }}
                  className="px-2 py-1 text-[10px] font-bold bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer"
                >
                  🟢 {node}
                </button>
              ))}
            </div>
          </div>

          {/* Alighting Helpers */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
              Quick destination terminals
            </span>
            <div className="flex flex-wrap gap-1">
              {["মতিঝিল", "শাহবাগ", "উত্তরা", "গুলিস্তান", "কাঁচপুর"].map((node) => (
                <button
                  key={node}
                  onClick={() => {
                    setEndQuery(node);
                    const matched = routes.find((r) => r.stops.some((s) => s.stop_name === node));
                    if (matched) {
                      const stop = matched.stops.find((s) => s.stop_name === node)!;
                      onSelectRouteStop(matched, stop, "to");
                    }
                  }}
                  className="px-2 py-1 text-[10px] font-bold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                >
                  🔵 {node}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Display Search Outcome Results */}
      {hasSearch && (
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1" id="search-outcome-panel">
          
          {/* Header indicator explaining the search bounds */}
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
            {matchedConnections.type === "both" && (
              <span>Direct Connection Routes ("Rules") ({matchedConnections.data.length})</span>
            )}
            {matchedConnections.type === "start" && (
              <span>Routes passing through start landmark ({matchedConnections.data.length})</span>
            )}
            {matchedConnections.type === "end" && (
              <span>Routes passing through destination ({matchedConnections.data.length})</span>
            )}
          </div>

          {/* Result card renderer */}
          {matchedConnections.data.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-slate-800">No direct connection found</p>
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans max-w-sm mx-auto">
                No active routes directly connect these two terminal markers. Try looking up wider hubs like "মিরপুর-১০" or "মতিঝিল", or search them individually to inspect route timelines.
              </p>
            </div>
          ) : (
            matchedConnections.type === "both" ? (
              // CASE 1: Render Connected Journeys (Both inputs configured)
              (matchedConnections.data as any[]).map(({ route, fromStop, toStop, distance, fare, stopsCount, direction }) => {
                const isSelected = selectedRouteId === route.route_id &&
                                  selectedFromStopName === fromStop.stop_name &&
                                  selectedToStopName === toStop.stop_name;

                return (
                  <div
                    key={`${route.route_id}-${fromStop.stop_name}-${toStop.stop_name}`}
                    onClick={() => handleApplyTrip(route, fromStop, toStop)}
                    className={`p-4 rounded-xl border transition-all text-left cursor-pointer space-y-3 font-sans ${
                      isSelected
                        ? "bg-indigo-55/60 bg-indigo-50/50 border-indigo-400 shadow-sm"
                        : "bg-slate-50/80 hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    {/* Header line with Route ID, direction badge and fare info */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono font-black rounded-lg text-[9.5px] uppercase tracking-wider shrink-0">
                          {route.route_id}
                        </span>
                        {direction === "reverse" ? (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-bold rounded-md border border-amber-200 shrink-0 uppercase tracking-widest font-sans flex items-center gap-0.5">
                            🔄 Return
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-bold rounded-md border border-emerald-200 shrink-0 uppercase tracking-widest font-sans flex items-center gap-0.5">
                            ➔ Outbound
                          </span>
                        )}
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {route.route_name}
                        </h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-indigo-700 font-mono">
                          ৳{fare} ticket
                        </span>
                      </div>
                    </div>

                    {/* Step details strip */}
                    <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between gap-3 font-sans">
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] uppercase tracking-wider text-emerald-500 font-black block">Start Stop</span>
                        <span className="text-xs font-bold text-slate-800 block truncate">{fromStop.stop_name}</span>
                        <span className="text-[9px] text-slate-400 block font-mono truncate">{getEnglishName(fromStop.stop_name)}</span>
                      </div>
                      
                      {/* Visual link arrow */}
                      <div className="flex flex-col items-center justify-center shrink-0 min-w-[50px]">
                        <span className="text-[9px] font-bold text-slate-500 block font-mono">
                          {distance.toFixed(1)} km
                        </span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="w-6 h-[1.5px] bg-slate-200" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        </div>
                        <span className="text-[8px] text-slate-400 block font-sans mt-0.5">
                          {stopsCount} stations
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 text-right">
                        <span className="text-[8px] uppercase tracking-wider text-indigo-500 font-black block">Destination Stop</span>
                        <span className="text-xs font-bold text-slate-800 block truncate">{toStop.stop_name}</span>
                        <span className="text-[9px] text-slate-400 block font-mono truncate">{getEnglishName(toStop.stop_name)}</span>
                      </div>
                    </div>

                    {/* Action Selector */}
                    <div className="flex items-center justify-between pt-1 text-[11px] font-sans">
                      <span className="text-slate-400 font-normal">
                        Fare multiplier: <code className="font-mono bg-white border border-slate-150 px-1 py-0.5 text-indigo-700 rounded text-[10px]">৳{route.fare_per_km}/km</code>
                      </span>
                      {isSelected ? (
                        <span className="flex items-center gap-0.5 text-emerald-600 font-bold font-sans">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Live On Ticket
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTrip(route, fromStop, toStop);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          🎫 Board Bus Journey
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              // CASE 2: Render Single Field Passing Matches (Start OR End ONLY)
              (matchedConnections.data as any[]).map(({ route, matchingStop, stopIndex }) => {
                const isCurrentRouteSelected = selectedRouteId === route.route_id;
                const isOriginSearch = matchedConnections.type === "start";
                const isFromSelected = selectedFromStopName === matchingStop.stop_name && isCurrentRouteSelected;
                const isToSelected = selectedToStopName === matchingStop.stop_name && isCurrentRouteSelected;

                const prevStopName = stopIndex > 0 ? route.stops[stopIndex - 1].stop_name : null;
                const nextStopName = stopIndex < route.stops.length - 1 ? route.stops[stopIndex + 1].stop_name : null;

                return (
                  <div
                    key={`${route.route_id}-${matchingStop.stop_name}`}
                    onClick={() => {
                      if (onLogSearch) {
                        onLogSearch(
                          isOriginSearch ? matchingStop.stop_name : "Airport / Terminal",
                          isOriginSearch ? "Airport / Terminal" : matchingStop.stop_name,
                          route.route_id
                        );
                      }
                      if (isOriginSearch) {
                        setStartQuery(matchingStop.stop_name);
                        onSelectRouteStop(route, matchingStop, "from");
                      } else {
                        setEndQuery(matchingStop.stop_name);
                        onSelectRouteStop(route, matchingStop, "to");
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left font-sans ${
                      isCurrentRouteSelected
                        ? "bg-slate-50/50 border-indigo-400"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-mono font-bold rounded-lg text-[9px] uppercase tracking-wider shrink-0 border border-indigo-150">
                          {route.route_id}
                        </span>
                        <h4 className="text-xs font-bold text-slate-850 truncate">
                          {route.route_name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-100">
                        ৳{route.fare_per_km}/km
                      </span>
                    </div>

                    {/* Sequential segment indicator */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 mb-2.5 bg-white p-2 rounded-lg border border-slate-150/70 font-sans">
                      {prevStopName && (
                        <>
                          <span className="text-slate-400 max-w-[80px] truncate" title={prevStopName}>{prevStopName}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-350 shrink-0" />
                        </>
                      )}
                      <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-650 font-bold rounded inline-flex items-center gap-1 shrink-0">
                        <MapPin className="w-2.5 h-2.5 text-indigo-600 animate-pulse" />
                        <span>{matchingStop.stop_name} <span className="text-[9.5px] font-mono font-medium text-slate-450 text-indigo-550/80">({getEnglishName(matchingStop.stop_name)})</span></span>
                      </span>
                      {nextStopName && (
                        <>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-350 shrink-0" />
                          <span className="text-slate-400 max-w-[80px] truncate" title={nextStopName}>{nextStopName}</span>
                        </>
                      )}
                      <span className="text-[9.5px] font-mono text-slate-400 ml-auto bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                        {matchingStop.cumulative_km} km marker
                      </span>
                    </div>

                    {/* Mini selection actions footer */}
                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200/60 relative z-10" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-slate-450 text-slate-500 font-sans">
                        👉 Quick configuration controls:
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setStartQuery(matchingStop.stop_name);
                            onSelectRouteStop(route, matchingStop, "from");
                          }}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-all cursor-pointer ${
                            isFromSelected
                              ? "bg-indigo-600 text-white font-black"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isFromSelected ? "Start Stop (Active)" : "Set as Start"}
                        </button>
                        <button
                          onClick={() => {
                            setEndQuery(matchingStop.stop_name);
                            onSelectRouteStop(route, matchingStop, "to");
                          }}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-all cursor-pointer ${
                            isToSelected
                              ? "bg-indigo-600 text-white font-black"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isToSelected ? "Destination (Active)" : "Set as Alight"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      )}
    </div>
  );
}
