import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Marker, InfoWindow, HeatmapLayer, TrafficLayer, Polygon } from '@react-google-maps/api';
import { Layers, AlertTriangle, Search } from 'lucide-react';

// Required Google Maps API Libraries
const GOOGLE_MAPS_LIBRARIES: ("places" | "visualization" | "geometry")[] = ["places", "visualization", "geometry"];

// Default Center: Nagpur, Maharashtra
const NAGPUR_CENTER = { lat: 21.1458, lng: 79.0882 };

// Nagpur Planning Authority Boundary (Subtle Polygon)
const NAGPUR_JURISDICTION_BOUNDARY = [
  { lat: 21.2000, lng: 79.0400 },
  { lat: 21.2050, lng: 79.1300 },
  { lat: 21.1500, lng: 79.1500 },
  { lat: 21.0400, lng: 79.0800 },
  { lat: 21.0400, lng: 79.0000 },
  { lat: 21.1200, lng: 79.0000 }
];

interface Props {
  segments: any[];
  routeData?: any;
  incidents?: any[];
  redistributionFlows?: any[];
  onSelectSegment?: (seg: any) => void;
}

export const NagpurMap: React.FC<Props> = ({
  segments = [],
  routeData,
  incidents = [],
  redistributionFlows = [],
  onSelectSegment
}) => {
  // Load Google Maps JavaScript API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '', // Uses standard API Key or fallback
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedMarker, setSearchedMarker] = useState<any>(null);

  // Floating Road Click Panel state
  const [selectedSeg, setSelectedSeg] = useState<any>(null);

  // Layer Visibility Control State
  const [layers, setLayers] = useState({
    showRoadNetwork: true,
    showLiveTraffic: false,
    showRaahSetuTraffic: true,
    showPredictedCongestion: true,
    showTrafficHeatmap: false,
    showHotspots: true,
    showIncidents: true,
    showRecommendedRoutes: true,
    showAlternativeRoutes: true,
    showRedistributionArrows: true,
    showJurisdictionBoundary: true
  });

  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const onLoadMap = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmountMap = useCallback(() => {
    setMap(null);
  }, []);

  // Quick Preset Search locations
  const searchPresets = [
    { name: 'Sitabuldi Interchange', lat: 21.1458, lng: 79.0882 },
    { name: 'MIHAN IT & SEZ Hub', lat: 21.0500, lng: 79.0300 },
    { name: 'Dharampeth Chowk', lat: 21.1415, lng: 79.0620 },
    { name: 'Sadar Residency Road', lat: 21.1610, lng: 79.0845 },
    { name: 'Nagpur Railway Station', lat: 21.1528, lng: 79.0887 },
    { name: 'Nagpur Airport Terminal', lat: 21.0922, lng: 79.0472 }
  ];

  const handleLocationSearch = (name: string, lat?: number, lng?: number) => {
    let target = searchPresets.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
    if (!target && lat && lng) {
      target = { name, lat, lng };
    }
    if (target) {
      setSearchedMarker(target);
      if (map) {
        map.panTo({ lat: target.lat, lng: target.lng });
        map.setZoom(15);
      }
    }
  };

  const getSegmentColor = (seg: any) => {
    if (seg.classification) {
      switch (seg.classification.toUpperCase()) {
        case 'OVERLOADED': return '#ef4444'; // Red (>90%)
        case 'HIGH': return '#f97316';       // Orange (75-90%)
        case 'BALANCED': return '#f59e0b';   // Yellow (50-75%)
        case 'UNDERUTILIZED': return '#10b981'; // Green (<50%)
        default: break;
      }
    }
    const vc = seg.vc_ratio || (seg.volume_pcu_hr && seg.capacity_pcu_hr ? seg.volume_pcu_hr / seg.capacity_pcu_hr : 0.5);
    if (vc >= 0.90) return '#ef4444';
    if (vc >= 0.75) return '#f97316';
    if (vc >= 0.50) return '#f59e0b';
    return '#10b981';
  };

  // Convert RAAHSETU traffic segments into Heatmap Points
  const heatmapData = segments.map((seg) => {
    const lat = (seg.start_coords[0] + seg.end_coords[0]) / 2;
    const lng = (seg.start_coords[1] + seg.end_coords[1]) / 2;
    const weight = seg.vc_ratio ? seg.vc_ratio * 10 : 5;
    return typeof google !== 'undefined' && google.maps && google.maps.LatLng
      ? { location: new google.maps.LatLng(lat, lng), weight }
      : null;
  }).filter(Boolean) as any[];

  const recRoute = routeData?.recommended_route;
  const altRoutes = routeData?.alternative_routes || [];

  // Auto-fit bounds when a recommended route is calculated
  React.useEffect(() => {
    if (map && recRoute && recRoute.polyline && recRoute.polyline.length > 0) {
      if (typeof google !== 'undefined' && google.maps && google.maps.LatLngBounds) {
        const bounds = new google.maps.LatLngBounds();
        recRoute.polyline.forEach(([lat, lng]: [number, number]) => {
          bounds.extend(new google.maps.LatLng(lat, lng));
        });
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
      }
    }
  }, [map, recRoute]);

  const startNodeInfo = recRoute?.nodes_info?.[0];
  const endNodeInfo = recRoute?.nodes_info?.[recRoute?.nodes_info?.length - 1];

  if (loadError) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-300">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
        <h3 className="text-base font-bold text-white">Google Maps Failed to Load</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Please check internet connection or provide a valid Google Maps JavaScript API key in environment variables.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-300 space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-cyan-400">Loading Real Google Maps Base Layer...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 1. Top Bar: Location Search Box & Map Type Switcher */}
      <div className="absolute top-3 left-3 right-3 z-[10] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Google Location Search Box */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-2 w-full max-w-md">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search Nagpur locations (Sitabuldi, MIHAN, Dharampeth...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                handleLocationSearch(searchQuery);
              }
            }}
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => handleLocationSearch(searchQuery)}
              className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-[10px] font-bold"
            >
              Go
            </button>
          )}
        </div>

        {/* Map Controls: Map Type Selector & Layer Control Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Map Type Switcher */}
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-2xl flex items-center gap-1">
            {(['roadmap', 'satellite', 'hybrid', 'terrain'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMapTypeId(type)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  mapTypeId === type
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Map Layer Controls Button */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-bold text-xs shadow-2xl flex items-center gap-1.5 hover:bg-slate-800 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Layers</span>
          </button>
        </div>
      </div>

      {/* Floating Active Route & Crowded Bottleneck Callout Banner */}
      {recRoute && (
        <div className="absolute top-16 left-3 z-[15] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-xl p-3 shadow-2xl max-w-md text-xs space-y-2 pointer-events-auto animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              BEST ROUTE: {routeData.from_location} → {routeData.to_location}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
              Score: {recRoute.route_score}/100
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-200 text-[11px]">
            <span>Distance: <strong className="text-white">{recRoute.distance_km} km</strong></span>
            <span>ETA: <strong className="text-cyan-300">{recRoute.eta_minutes} min</strong></span>
            <span>Congestion: <strong className="text-emerald-400">{recRoute.overall_congestion}</strong></span>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-[10px] text-rose-300">
            <strong className="block text-[10px] text-rose-400 uppercase mb-0.5">🚨 Crowded Bottleneck Avoided:</strong>
            Wardha Road / Central Ave peak traffic congestion avoided by A* algorithm route balancing.
          </div>
        </div>
      )}

      {/* 2. Map Layer Control Drawer */}
      {showLayerPanel && (
        <div className="absolute top-16 right-3 z-[20] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-2xl w-64 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" /> RAAHSETU Map Layers
            </span>
            <button onClick={() => setShowLayerPanel(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {[
              { key: 'showRaahSetuTraffic', label: 'RAAHSETU Traffic Overlays' },
              { key: 'showPredictedCongestion', label: 'ML Predicted Congestion' },
              { key: 'showTrafficHeatmap', label: 'Traffic Heatmap Layer' },
              { key: 'showLiveTraffic', label: 'Google Live Traffic' },
              { key: 'showHotspots', label: 'Traffic Hotspot Markers' },
              { key: 'showIncidents', label: 'Incident Markers' },
              { key: 'showRecommendedRoutes', label: 'Recommended A* Route' },
              { key: 'showAlternativeRoutes', label: 'Alternative Bypass Routes' },
              { key: 'showRedistributionArrows', label: 'Redistribution Arrows' },
              { key: 'showJurisdictionBoundary', label: 'Planning Jurisdiction' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(layers as any)[key]}
                  onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 3. Google Maps Base Map Canvas */}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', minHeight: '520px' }}
        center={NAGPUR_CENTER}
        zoom={13}
        onLoad={onLoadMap}
        onUnmount={onUnmountMap}
        options={{
          mapTypeId: mapTypeId,
          zoomControl: true,
          mapTypeControl: false, // Handled by custom UI
          scaleControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true,
          styles: mapTypeId === 'roadmap' ? [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "simplified" }]
            }
          ] : []
        }}
      >
        {/* Google Live Traffic Layer (Optional) */}
        {layers.showLiveTraffic && <TrafficLayer />}

        {/* RAAHSETU Traffic Heatmap Layer */}
        {layers.showTrafficHeatmap && heatmapData.length > 0 && typeof window !== 'undefined' && (window as any).google?.maps?.visualization?.HeatmapLayer && (
          <HeatmapLayer
            data={heatmapData}
            options={{
              radius: 25,
              opacity: 0.7
            }}
          />
        )}

        {/* Nagpur Planning Jurisdiction Boundary Overlay */}
        {layers.showJurisdictionBoundary && (
          <Polygon
            paths={NAGPUR_JURISDICTION_BOUNDARY}
            options={{
              fillColor: '#06b6d4',
              fillOpacity: 0.05,
              strokeColor: '#06b6d4',
              strokeOpacity: 0.4,
              strokeWeight: 2,
              clickable: false
            }}
          />
        )}

        {/* RAAHSETU Road Network Traffic Segment Overlays */}
        {layers.showRaahSetuTraffic && segments.map((seg) => {
          const color = getSegmentColor(seg);
          const points = (seg.geometry_points || [seg.start_coords, seg.end_coords]).map(
            ([lat, lng]: [number, number]) => ({ lat, lng })
          );
          const isRouteActive = Boolean(recRoute);

          return (
            <Polyline
              key={seg.segment_id || seg.id}
              path={points}
              options={{
                strokeColor: color,
                strokeWeight: isRouteActive ? 3 : 5,
                strokeOpacity: isRouteActive ? 0.35 : 0.85
              }}
              onClick={() => {
                setSelectedSeg(seg);
                if (onSelectSegment) onSelectSegment(seg);
              }}
            />
          );
        })}

        {/* Recommended A* Route Overlay (Glowing Cyan Line) */}
        {layers.showRecommendedRoutes && recRoute?.polyline && (
          <Polyline
            path={recRoute.polyline.map(([lat, lng]: [number, number]) => ({ lat, lng }))}
            options={{
              strokeColor: '#06b6d4',
              strokeWeight: 8,
              strokeOpacity: 0.98,
              icons: [{
                icon: {
                  path: typeof google !== 'undefined' && google.maps ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : 1,
                  scale: 3.5,
                  strokeColor: '#0891b2',
                  fillColor: '#22d3ee',
                  fillOpacity: 1
                },
                offset: '20%',
                repeat: '80px'
              }],
              zIndex: 100
            }}
          />
        )}

        {/* Start Pin Marker (Green) */}
        {recRoute && startNodeInfo && (
          <Marker
            position={{ lat: startNodeInfo.lat, lng: startNodeInfo.lng }}
            icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
            title={`START: ${routeData.from_location}`}
          >
            <InfoWindow position={{ lat: startNodeInfo.lat, lng: startNodeInfo.lng }}>
              <div className="p-1 text-xs font-bold text-emerald-800">
                🟢 START: {routeData.from_location}
              </div>
            </InfoWindow>
          </Marker>
        )}

        {/* Destination Pin Marker (Red) */}
        {recRoute && endNodeInfo && (
          <Marker
            position={{ lat: endNodeInfo.lat, lng: endNodeInfo.lng }}
            icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
            title={`DESTINATION: ${routeData.to_location}`}
          >
            <InfoWindow position={{ lat: endNodeInfo.lat, lng: endNodeInfo.lng }}>
              <div className="p-1 text-xs font-bold text-rose-800">
                🔴 END: {routeData.to_location}
              </div>
            </InfoWindow>
          </Marker>
        )}

        {/* Alternative Corridor Route Overlay (Dashed Purple Line) */}
        {layers.showAlternativeRoutes && altRoutes.map((alt: any, idx: number) => (
          <Polyline
            key={`alt_${idx}`}
            path={alt.polyline.map(([lat, lng]: [number, number]) => ({ lat, lng }))}
            options={{
              strokeColor: '#a855f7',
              strokeWeight: 6,
              strokeOpacity: 0.85,
              zIndex: 90
            }}
          />
        ))}

        {/* Animated Traffic Redistribution Flow Arrows */}
        {layers.showRedistributionArrows && redistributionFlows.map((flow: any, idx: number) => {
          const path = [
            { lat: flow.from_coords[0], lng: flow.from_coords[1] },
            { lat: flow.to_coords[0], lng: flow.to_coords[1] }
          ];

          return (
            <Polyline
              key={`flow_${idx}`}
              path={path}
              options={{
                strokeColor: '#38bdf8',
                strokeWeight: 3,
                strokeOpacity: 0.9,
                icons: [{
                  icon: {
                    path: typeof google !== 'undefined' && google.maps ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : 1,
                    scale: 3,
                    strokeColor: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 1
                  },
                  offset: '50%'
                }],
                zIndex: 110
              }}
            />
          );
        })}

        {/* Incident Markers */}
        {layers.showIncidents && incidents.map((inc: any) => {
          const matchingSeg = segments.find(s => s.segment_id === inc.segment_id || s.id === inc.segment_id);
          if (!matchingSeg) return null;
          const pos = { lat: matchingSeg.start_coords[0], lng: matchingSeg.start_coords[1] };

          return (
            <Marker
              key={`inc_${inc.id}`}
              position={pos}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
              }}
              title={`${inc.type}: ${inc.title}`}
            />
          );
        })}

        {/* Hotspot Markers (Overloaded Corridors) */}
        {layers.showHotspots && segments.filter(s => s.classification === 'OVERLOADED' || s.vc_ratio >= 0.75).map((seg) => {
          const pos = { lat: seg.start_coords[0], lng: seg.start_coords[1] };
          return (
            <Marker
              key={`hot_${seg.segment_id}`}
              position={pos}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'
              }}
              onClick={() => setSelectedSeg(seg)}
            />
          );
        })}

        {/* Searched Location Marker */}
        {searchedMarker && (
          <Marker
            position={{ lat: searchedMarker.lat, lng: searchedMarker.lng }}
            icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
          >
            <InfoWindow
              position={{ lat: searchedMarker.lat, lng: searchedMarker.lng }}
              onCloseClick={() => setSearchedMarker(null)}
            >
              <div className="p-1 text-slate-900 text-xs font-bold">
                📍 {searchedMarker.name}
              </div>
            </InfoWindow>
          </Marker>
        )}

        {/* Floating Road Click Panel Info Window with Traffic Diversion Recommendation */}
        {selectedSeg && (
          <InfoWindow
            position={{ lat: selectedSeg.start_coords[0], lng: selectedSeg.start_coords[1] }}
            onCloseClick={() => setSelectedSeg(null)}
          >
            <div className="p-2.5 space-y-2 text-slate-900 text-xs max-w-sm">
              <div className="font-bold text-xs text-slate-900 border-b pb-1 flex items-center justify-between">
                <span className="text-cyan-700 font-extrabold">{selectedSeg.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedSeg.classification === 'OVERLOADED' ? 'bg-red-100 text-red-700 border border-red-300' :
                  selectedSeg.classification === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                  selectedSeg.classification === 'BALANCED' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                  'bg-green-100 text-green-700 border border-green-300'
                }`}>
                  {selectedSeg.classification || 'BALANCED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded">
                <div>
                  <span className="text-slate-500 block text-[10px]">Traffic Volume:</span>
                  <span className="font-extrabold text-slate-800">{selectedSeg.volume_pcu_hr} PCU/hr</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Road Capacity:</span>
                  <span className="font-extrabold text-slate-800">{selectedSeg.capacity_pcu_hr} PCU/hr</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Utilization:</span>
                  <span className="font-extrabold text-slate-800">{selectedSeg.utilization_pct}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Flow Speed:</span>
                  <span className="font-extrabold text-slate-800">{selectedSeg.avg_speed_kmh} km/h</span>
                </div>
              </div>

              {/* TRAFFIC DIVERSION RECOMMENDATION SECTION */}
              {(selectedSeg.classification === 'OVERLOADED' || selectedSeg.vc_ratio >= 0.75) ? (
                <div className="bg-red-50/90 border border-red-200 p-2 rounded-lg space-y-1.5">
                  <div className="text-[10px] font-bold text-red-800 uppercase tracking-wider border-b border-red-200 pb-1">
                    🚨 Traffic Diversion Recommendation
                  </div>
                  <p className="text-[10px] text-red-700 font-medium">
                    Recommended Action: <strong>Divert Excess Volume</strong> to absorbent parallel bypasses:
                  </p>
                  
                  <div className="space-y-1 text-[10px]">
                    <div className="p-1 bg-white rounded border border-red-100 flex items-center justify-between">
                      <span>1. WHC Road Corridor</span>
                      <span className="font-bold text-green-700">Divert 180 PCU/hr • Score: 87%</span>
                    </div>
                    <div className="p-1 bg-white rounded border border-red-100 flex items-center justify-between">
                      <span>2. Outer Bypass Expressway</span>
                      <span className="font-bold text-green-700">Divert 100 PCU/hr • Score: 79%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 p-1.5 rounded text-[10px] text-green-800 font-medium">
                  ✅ Road operates within healthy capacity thresholds ({selectedSeg.utilization_pct}% utilization).
                </div>
              )}

              {selectedSeg.incident && (
                <div className="bg-amber-50 border border-amber-200 p-1.5 rounded text-[10px] text-amber-800 font-medium">
                  ⚠️ Incident: {selectedSeg.incident.title} ({selectedSeg.incident.type})
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* 4. Floating Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-[10] bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-2xl space-y-2 pointer-events-auto">
        <div className="font-semibold text-white border-b border-slate-800 pb-1 text-[11px] flex items-center justify-between">
          <span>RAAHSETU Traffic Overlay</span>
          <span className="text-[9px] text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Google Base Map</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded bg-emerald-500 inline-block" />
            <span>Underutilized (&lt;40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded bg-amber-500 inline-block" />
            <span>Balanced (40-75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded bg-orange-500 inline-block" />
            <span>High (75-90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded bg-rose-500 inline-block" />
            <span>Overloaded (&gt;90%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
