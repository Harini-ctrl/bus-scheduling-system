import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
  Plus, Trash2, MapPin, Navigation,
  AlertTriangle, ExternalLink, X, ChevronDown, ChevronUp
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Topbar from '../components/layout/Topbar';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import { routeService } from '../services/routeService';
import { useFetch } from '../hooks/useFetch';
import type { Route, AddRouteResponse, Coordinate } from '../types';
import { useRole } from '../hooks/useRole';

// ── Fix Leaflet marker icons ──
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ROUTE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
];

function getRouteColor(routeId: string): string {
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    hash = routeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ROUTE_COLORS[Math.abs(hash) % ROUTE_COLORS.length];
}

// ── Map renderer ──
function MapRenderer({
  routes,
  selectedId,
  overlappingIds,
  onSelectRoute,
  previewCoords,
}: {
  routes: Route[];
  selectedId: string | null;
  overlappingIds: Set<string>;
  onSelectRoute: (route: Route) => void;
  previewCoords: Coordinate[];
}) {
  const map = useMap();
  const layersRef = useRef<Map<string, L.LayerGroup>>(new Map());
  const previewRef = useRef<L.LayerGroup | null>(null);
  const overlappingIdsStr = Array.from(overlappingIds).sort().join(',');

  // Fit bounds once when routes first load
  useEffect(() => {
    if (routes.length === 0) return;
    const allCoords = routes.flatMap(r =>
      r.coordinates.map(c => [c.lat, c.lng] as [number, number])
    );
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [40, 40] });
    }
  }, [routes.length]);

  // Draw existing routes
  useEffect(() => {
    layersRef.current.forEach(group => map.removeLayer(group));
    layersRef.current.clear();

    routes.forEach(route => {
      if (route.coordinates.length < 2) return;

      const isSelected = route._id === selectedId;
      const isOverlapping = overlappingIds.has(route._id);
      const baseColor = getRouteColor(route._id);
      const color = isSelected ? '#1d4ed8' : isOverlapping ? '#ef4444' : baseColor;
      const positions = route.coordinates.map(c => [c.lat, c.lng] as [number, number]);
      const group = L.layerGroup();

      if (isSelected) {
        L.polyline(positions, { color: '#ffffff', weight: 16, opacity: 0.6 }).addTo(group);
      }

      const line = L.polyline(positions, {
        color,
        weight: isSelected ? 8 : 4,
        opacity: isSelected ? 1 : 0.65,
        dashArray: isOverlapping && !isSelected ? '8 4' : undefined,
      });

      line.bindPopup(`
        <div style="font-size:12px;min-width:160px">
          <p style="font-weight:700;font-size:13px;margin-bottom:4px">${route.routeName}</p>
          <p style="color:#6b7280">${route.startLocation} → ${route.endLocation}</p>
          <p style="color:#6b7280;margin-top:2px">${route.distance} km · ${route.stops.length} stops</p>
          ${isOverlapping ? '<p style="color:#ef4444;margin-top:4px;font-weight:600">⚠ Overlapping route</p>' : ''}
          ${isSelected ? '<p style="color:#1d4ed8;margin-top:4px;font-weight:600">● Selected</p>' : ''}
        </div>
      `);

      line.on('click', () => onSelectRoute(route));
      line.on('mouseover', () => { if (!isSelected) line.setStyle({ weight: 6, opacity: 1 }); });
      line.on('mouseout', () => { if (!isSelected) line.setStyle({ weight: 4, opacity: 0.65 }); });
      line.addTo(group);

      route.coordinates.forEach(coord => {
        const marker = L.circleMarker([coord.lat, coord.lng], {
          radius: isSelected ? 8 : 5,
          fillColor: color, color: '#ffffff',
          weight: 2, opacity: 1, fillOpacity: 1,
        });
        marker.bindPopup(`
          <div style="font-size:12px">
            <p style="font-weight:700">${coord.label}</p>
            <p style="color:#6b7280">${route.routeName}</p>
          </div>
        `);
        marker.on('click', () => onSelectRoute(route));
        marker.addTo(group);
      });

      group.addTo(map);
      layersRef.current.set(route._id, group);
    });
  }, [routes, selectedId, overlappingIdsStr, onSelectRoute]);

  // Draw live preview as user adds stops in the form
  useEffect(() => {
    if (previewRef.current) {
      map.removeLayer(previewRef.current);
      previewRef.current = null;
    }

    if (previewCoords.length === 0) return;

    const group = L.layerGroup();
    const positions = previewCoords.map(c => [c.lat, c.lng] as [number, number]);

    if (positions.length >= 2) {
      L.polyline(positions, {
        color: '#f97316', weight: 4,
        opacity: 0.9, dashArray: '6 4',
      }).addTo(group);
    }

    previewCoords.forEach((coord, index) => {
      const isFirst = index === 0;
      const isLast = index === previewCoords.length - 1;
      const bgColor = isFirst ? '#22c55e' : isLast ? '#f97316' : '#3b82f6';

      const icon = L.divIcon({
        html: `
          <div style="
            background:${bgColor};color:white;
            width:26px;height:26px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">${index + 1}</div>
        `,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      L.marker([coord.lat, coord.lng], { icon })
        .bindPopup(`
          <div style="font-size:12px">
            <b>${coord.label}</b><br/>
            <span style="color:#6b7280">${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}</span>
          </div>
        `)
        .addTo(group);
    });

    group.addTo(map);
    previewRef.current = group;

    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [60, 60], maxZoom: 13 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 13);
    }

    return () => {
      if (previewRef.current) {
        map.removeLayer(previewRef.current);
        previewRef.current = null;
      }
    };
  }, [previewCoords, map]);

  return null;
}

// ── Empty stop ──
// ── Empty stop — counter ensures unique IDs ──
let stopCounter = 0;
const emptyStop = (): Coordinate & { id: number } => ({
  id: ++stopCounter,
  lat: 0,
  lng: 0,
  label: '',
});

const emptyForm = {
  routeName: '',
  distance: '',
};

export default function Routes() {
  const { data: routes, loading, refetch } = useFetch(routeService.getAll);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [stops, setStops] = useState<(Coordinate & { id: number })[]>([emptyStop(), emptyStop()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<AddRouteResponse['overlaps']>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const { canEdit, canDelete } = useRole();

  const validStops = stops.filter(s =>
    s.label.trim() && s.lat !== 0 && s.lng !== 0
  );

  const previewCoords: Coordinate[] = validStops.map(s => ({
    lat: s.lat, lng: s.lng, label: s.label,
  }));

  const total = routes?.length ?? 0;
  const withCoords = routes?.filter(r => r.coordinates.length > 0).length ?? 0;

  const overlappingRouteIds = new Set<string>();
  if (routes) {
    routes.forEach((r1, i) => {
      routes.forEach((r2, j) => {
        if (i >= j) return;
        const shared = r1.stops.filter(s => r2.stops.includes(s));
        if (shared.length > 0) {
          overlappingRouteIds.add(r1._id);
          overlappingRouteIds.add(r2._id);
        }
      });
    });
  }

  const openAdd = () => {
    setForm(emptyForm);
    setStops([emptyStop(), emptyStop()]);
    setFormError(null);
    setOverlapWarning([]);
    setExpandedStop(0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setStops([emptyStop(), emptyStop()]);
    setFormError(null);
    setOverlapWarning([]);
    setExpandedStop(null);
  };

  const updateStop = (id: number, field: keyof Coordinate, value: string | number) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const parseLatLng = (id: number, value: string) => {
    const parts = value.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setStops(prev => prev.map(s => s.id === id ? { ...s, lat, lng } : s));
      }
    }
  };

  const addStop = () => {
    const newStop = emptyStop();
    setStops(prev => [...prev, newStop]);
    setExpandedStop(newStop.id);
  };

  const removeStop = (id: number) => {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter(s => s.id !== id));
  };

  const validate = () => {
    if (!form.routeName.trim()) return 'Route name is required';
    if (validStops.length < 2) return 'At least 2 complete stops are required (name + coordinates)';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }

    setSubmitting(true);
    setFormError(null);

    try {
      const coords: Coordinate[] = validStops.map(s => ({
        lat: s.lat, lng: s.lng, label: s.label.trim(),
      }));

      const response = await routeService.add({
        routeName: form.routeName.trim(),
        startLocation: coords[0].label,
        endLocation: coords[coords.length - 1].label,
        stops: coords.map(c => c.label),
        distance: Number(form.distance) || 0,
        coordinates: coords,
      });

      if (response.overlaps && response.overlaps.length > 0) {
        setOverlapWarning(response.overlaps);
      } else {
        closeModal();
      }
      refetch();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (route: Route) => {
    if (!window.confirm(`Delete ${route.routeName}?`)) return;
    try {
      await routeService.delete(route._id);
      if (selectedRoute?._id === route._id) setSelectedRoute(null);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete route');
    }
  };

  const handleSelectRoute = useCallback((route: Route) => {
    setSelectedRoute(prev => prev?._id === route._id ? null : route);
  }, []);

  return (
    <>
      <Topbar title="Routes" subtitle="Route management and map visualization" />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        <PageHeader
          title="Route Management"
          subtitle="Add routes with real coordinates — previewed live on map"
          action={
            canEdit && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Route
              </button>
            )
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Routes"
            value={total}
            subtitle="configured"
            icon={MapPin}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="On Map"
            value={withCoords}
            subtitle="with coordinates"
            icon={Navigation}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Overlapping"
            value={overlappingRouteIds.size}
            subtitle="shared stops"
            icon={AlertTriangle}
            color="amber"
            loading={loading}
          />
          <StatCard
            title="Total Stops"
            value={routes?.reduce((a, r) => a + r.stops.length, 0) ?? 0}
            subtitle="across all routes"
            icon={MapPin}
            color="purple"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Live Route Map</h2>
                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-1.5 bg-blue-500 rounded inline-block" />
                    Normal
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-1.5 bg-red-500 rounded inline-block" />
                    Overlapping
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-1.5 bg-orange-400 rounded inline-block" />
                    Preview
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>Click route to highlight</span>
                </div>
              </div>
              <div className="h-[300px] sm:h-[480px]">
                <MapContainer
                  center={[28.6139, 77.2090]}
                  zoom={11}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {routes && (
                    <MapRenderer
                      routes={routes}
                      selectedId={selectedRoute?._id ?? null}
                      overlappingIds={overlappingRouteIds}
                      onSelectRoute={handleSelectRoute}
                      previewCoords={previewCoords}
                    />
                  )}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Route sidebar */}
          <div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  All Routes
                  <span className="ml-2 text-xs text-gray-400 font-normal">{total} total</span>
                </h2>
              </div>

              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (routes ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <MapPin size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No routes yet</p>
                  <button
                    onClick={openAdd}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Add first route
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[280px] sm:max-h-[440px] overflow-y-auto">
                  {(routes ?? []).map(route => {
                    const isOverlapping = overlappingRouteIds.has(route._id);
                    const isSelected = selectedRoute?._id === route._id;
                    const color = getRouteColor(route._id);

                    return (
                      <div
                        key={route._id}
                        onClick={() => handleSelectRoute(route)}
                        className={`px-4 py-3.5 cursor-pointer transition-all border-l-4 relative ${isSelected
                            ? 'bg-blue-50 border-blue-600'
                            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                              style={{
                                background: isSelected
                                  ? '#1d4ed8'
                                  : isOverlapping
                                    ? '#ef4444'
                                    : color
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {route.routeName}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                {route.startLocation} → {route.endLocation}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-gray-400">{route.distance} km</span>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs text-gray-400">{route.stops.length} stops</span>
                                {isOverlapping && (
                                  <span className="text-xs text-red-500 font-medium flex items-center gap-0.5">
                                    <AlertTriangle size={10} />
                                    Overlap
                                  </span>
                                )}
                                {route.coordinates.length < 2 && (
                                  <span className="text-xs text-gray-400 italic">No map data</span>
                                )}
                                {isSelected && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    ● Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {canDelete && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(route); }}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                        </div>

                        {isSelected && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {route.stops.map(stop => (
                              <span
                                key={stop}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                              >
                                {stop}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Route Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add New Route"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

          {overlapWarning.length > 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} />
                Route saved — but overlaps detected
              </p>
              {overlapWarning.map(o => (
                <div key={o.routeId} className="text-xs text-amber-600 mt-1">
                  Shares stops with{' '}
                  <span className="font-semibold">{o.routeName}</span>:{' '}
                  {o.overlappingStops.join(', ')}
                </div>
              ))}
              <button
                onClick={closeModal}
                className="mt-3 w-full text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg"
              >
                Got it — close
              </button>
            </div>
          ) : (
            <>
              {/* How to get coordinates tip */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  How to get coordinates
                </p>
                <ol className="text-xs text-blue-600 space-y-0.5 list-decimal list-inside">
                  <li>Click "Google Maps" link next to any stop</li>
                  <li>Search the stop location on Google Maps</li>
                  <li>Right-click the location → click the coordinates shown</li>
                  <li>Paste them in the coordinates field — auto-parsed instantly</li>
                </ol>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ExternalLink size={11} />
                  Open Google Maps
                </a>
              </div>

              {/* Route name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Route Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Route 302"
                  value={form.routeName}
                  onChange={e => setForm(f => ({ ...f, routeName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Distance */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Distance (km)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 22"
                  value={form.distance}
                  onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Stops */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Stops <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 ml-1">
                      ({validStops.length} ready · min 2)
                    </span>
                  </label>
                  <button
                    onClick={addStop}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add stop
                  </button>
                </div>

                <div className="space-y-2">
                  {stops.map((stop, index) => {
                    const isExpanded = expandedStop === stop.id;
                    const isValid = Boolean(stop.label.trim() && stop.lat !== 0 && stop.lng !== 0);
                    const isFirst = index === 0;
                    const isLast = index === stops.length - 1;

                    return (
                      <div
                        key={stop.id}
                        className={`border rounded-lg overflow-hidden transition-all ${isValid
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-white'
                          }`}
                      >
                        {/* Stop header */}
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                          onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isFirst ? 'bg-green-500' : isLast ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                            {index + 1}
                          </div>

                          <span className={`text-xs flex-1 ${stop.label.trim() ? 'text-gray-800 font-medium' : 'text-gray-400'
                            }`}>
                            {stop.label.trim() || `Stop ${index + 1} — click to fill`}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isValid && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="7" fill="#22c55e" />
                                <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {stops.length > 2 && (
                              <button
                                onClick={e => { e.stopPropagation(); removeStop(stop.id); }}
                                className="text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            )}
                            {isExpanded
                              ? <ChevronUp size={13} className="text-gray-400" />
                              : <ChevronDown size={13} className="text-gray-400" />
                            }
                          </div>
                        </div>

                        {/* Stop fields — expanded */}
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Stop name</label>
                              <input
                                type="text"
                                placeholder="e.g. Connaught Place"
                                value={stop.label}
                                onChange={e => updateStop(stop.id, 'label', e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-gray-500">
                                  Coordinates
                                  {stop.lat !== 0 && (
                                    <span className="text-green-600 ml-1">
                                      ✓ {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                                    </span>
                                  )}
                                </label>
                                <a
                                  href={`https://maps.google.com/maps?q=${encodeURIComponent(stop.label || 'Delhi')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink size={10} />
                                  Google Maps
                                </a>
                              </div>
                              <input
                                type="text"
                                placeholder="Paste: 28.6315, 77.2167"
                                onChange={e => parseLatLng(stop.id, e.target.value)}
                                defaultValue={stop.lat !== 0 ? `${stop.lat}, ${stop.lng}` : ''}
                                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                              />
                              <p className="text-xs text-gray-400 mt-1">
                                Right-click on Google Maps → click the coordinates to copy
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live preview indicator */}
              {validStops.length >= 2 && (
                <div className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="w-3 h-1.5 bg-orange-400 rounded" />
                  <span className="text-xs text-orange-700 font-medium">
                    Route preview is live on the map — {validStops.length} stops connected
                  </span>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  ⚠ {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="flex-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || validStops.length < 2}
                  className="flex-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
                >
                  {submitting
                    ? 'Saving...'
                    : `Save Route (${validStops.length} stops)`
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}