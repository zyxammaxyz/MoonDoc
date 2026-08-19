import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MoonlightingShift, FilterState, MedicalSpecialty, CredentialDocument } from '../types';
import { MapPin, Search, DollarSign, Navigation, ShieldCheck, Clock, Hospital, Filter, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Target, Compass, Map, ChevronDown, ChevronUp, SlidersHorizontal, ArrowUp } from 'lucide-react';

interface MapViewProps {
  shifts: MoonlightingShift[];
  onSelectShift: (shift: MoonlightingShift) => void;
  userDocuments: CredentialDocument[];
}

// Haversine formula to compute distance in miles between two lat/lng points
function calcDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Preset locations
const PRESET_LOCATIONS = [
  { name: 'Hawthorne, CA (South Bay)', address: 'Hawthorne Blvd & W 120th St, Hawthorne, CA 90250', lat: 33.9164, lng: -118.3526 },
  { name: 'Torrance, CA', address: '20700 Hawthorne Blvd, Torrance, CA 90503', lat: 33.8358, lng: -118.3526 },
  { name: 'Santa Monica, CA', address: '1250 2nd St, Santa Monica, CA 90401', lat: 34.0195, lng: -118.4912 },
  { name: 'Downtown Los Angeles', address: '700 S Flower St, Los Angeles, CA 90017', lat: 34.0488, lng: -118.2588 },
  { name: 'Pasadena, CA', address: '300 E Colorado Blvd, Pasadena, CA 91101', lat: 34.1458, lng: -118.1445 },
];

export const MapView: React.FC<MapViewProps> = ({ shifts, onSelectShift, userDocuments }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Current User Location State - Default to Hawthorne, CA
  const [currentAddress, setCurrentAddress] = useState<string>('Hawthorne Blvd, Hawthorne, CA 90250');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 33.9164,
    lng: -118.3526,
  });

  // Location Selector Dropdown toggle
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  // Real browser geolocation state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Filter Panel Toggle (Collapsible)
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(true);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    specialty: 'All',
    maxDistance: 25,
    minPayRate: 120,
    shiftType: 'All',
    searchQuery: '',
    onlyEligible: false,
  });

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const PRE_CLEARED_SITE_IDS = ['hosp_st_francis', 'hosp_exer_sm'];

  // Helper to check resident eligibility / pre-clearance for a shift
  const isEligibleForShift = (shift: MoonlightingShift) => {
    return PRE_CLEARED_SITE_IDS.includes(shift.hospitalId);
  };

  // Calculate dynamic distances for all shifts based on current userLocation
  const shiftsWithComputedDistance = shifts.map((shift) => {
    const computedDist = calcDistanceMiles(userLocation.lat, userLocation.lng, shift.lat, shift.lng);
    return {
      ...shift,
      distanceMiles: computedDist,
    };
  });

  // Filter shifts
  const filteredShifts = shiftsWithComputedDistance.filter((shift) => {
    // Specialty
    if (filters.specialty !== 'All' && shift.specialty !== filters.specialty) return false;
    // Pay Rate
    if (shift.hourlyRate < filters.minPayRate) return false;
    // Distance from current location
    if (shift.distanceMiles > filters.maxDistance) return false;
    // Shift Type
    if (filters.shiftType !== 'All' && shift.shiftType !== filters.shiftType) return false;
    // Search Query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchName = shift.hospitalName.toLowerCase().includes(q);
      const matchTitle = shift.title.toLowerCase().includes(q);
      const matchSpec = shift.specialty.toLowerCase().includes(q);
      const matchCity = shift.facilityLocation.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchSpec && !matchCity) return false;
    }
    // Only Eligible
    if (filters.onlyEligible && !isEligibleForShift(shift)) return false;

    return true;
  });

  // Set preset location
  const handleSelectPresetLocation = (preset: typeof PRESET_LOCATIONS[0]) => {
    setUserLocation({ lat: preset.lat, lng: preset.lng });
    setCurrentAddress(preset.address);
    setShowLocationPicker(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], 11, { duration: 1.2 });
    }
  };

  // Handle setting the default SoCal hub location (Hawthorne, CA) — used by the map's quick region switcher
  const handleSetHawthorneLocation = () => {
    const hawthorne = PRESET_LOCATIONS[0];
    setUserLocation({ lat: hawthorne.lat, lng: hawthorne.lng });
    setCurrentAddress(hawthorne.address);
    setShowLocationPicker(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([hawthorne.lat, hawthorne.lng], 11, { duration: 1.2 });
    }
  };

  // Handle "Use My Current Location" — real browser geolocation, reverse-geocoded to a readable address
  const handleUseMyActualLocation = () => {
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setLocationError('Your browser does not support location detection. Pick a preset location instead.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setShowLocationPicker(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 12, { duration: 1.2 });
        }

        // Best-effort reverse geocode to a readable address (falls back to coordinates if unavailable)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`,
            { headers: { Accept: 'application/json' } }
          );
          if (res.ok) {
            const data = await res.json();
            setCurrentAddress(data?.display_name || `Your Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          } else {
            setCurrentAddress(`Your Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch {
          setCurrentAddress(`Your Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location access was denied. Enable location permissions for this site in your browser settings, or pick a preset location below.');
        } else {
          setLocationError('Could not detect your location. Pick a preset location below instead.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center: Hawthorne, CA
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [33.9164, -118.3526],
        zoom: 11,
        zoomControl: false,
      });

      // CartoDB Voyager Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Radius Circle when location, filters, or shifts change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    markersLayerRef.current.clearLayers();

    // 1. Draw / Update User Location Beacon Pin
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    const userPinHtml = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
        <div class="relative w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl border-2 border-white font-black text-xs">
          📍
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userPinHtml,
      className: 'user-location-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
    userMarker.bindTooltip(`📍 <b>My Location</b><br/>${currentAddress}`, { permanent: false, direction: 'top' });
    markersLayerRef.current.addLayer(userMarker);
    userMarkerRef.current = userMarker;

    // 2. Draw / Update Radius Circle
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
    }

    const radiusMeters = filters.maxDistance * 1609.34; // Miles to meters
    const circle = L.circle([userLocation.lat, userLocation.lng], {
      radius: radiusMeters,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 6',
    });
    circle.addTo(map);
    radiusCircleRef.current = circle;

    // 3. Draw Shift Markers
    filteredShifts.forEach((shift) => {
      const isEligible = isEligibleForShift(shift);
      const isSelected = selectedShiftId === shift.id;

      const markerHtml = `
        <div class="group cursor-pointer transform transition-all duration-200 ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}">
          <div class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-md border ${
            isSelected
              ? 'bg-blue-600 text-white ring-4 ring-blue-300 border-blue-700'
              : isEligible
              ? 'bg-white text-blue-900 border-2 border-blue-600 hover:bg-blue-50'
              : 'bg-white text-slate-900 border-2 border-amber-500 hover:bg-amber-50'
          }">
            <span class="w-2.5 h-2.5 rounded-full shrink-0 ${isEligible ? 'bg-blue-600' : 'bg-amber-500'}"></span>
            <div class="flex flex-col leading-tight">
              <span class="font-extrabold text-xs">$${shift.hourlyRate}/hr</span>
              <span class="text-[9px] font-black ${isEligible ? 'text-blue-700' : 'text-amber-700'} uppercase tracking-tight">
                ${isEligible ? 'Available' : 'Requires Clearance'}
              </span>
            </div>
          </div>
          <div class="w-3 h-3 bg-white border-b-2 border-r-2 ${
            isSelected ? 'border-blue-700 bg-blue-600' : isEligible ? 'border-blue-600' : 'border-amber-500'
          } rotate-45 -mt-1.5 mx-auto"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-map-pin',
        iconSize: [110, 42],
        iconAnchor: [55, 42],
      });

      const marker = L.marker([shift.lat, shift.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedShiftId(shift.id);
        onSelectShift(shift);
      });

      markersLayerRef.current?.addLayer(marker);
    });

  }, [filteredShifts, selectedShiftId, userLocation, filters.maxDistance, userDocuments]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-slate-50 text-slate-900">
       {/* Sidebar Controls & Shift List - Fully Scrollable Container */}
      <div
        ref={sidebarRef}
        className="w-full md:w-2/5 h-1/2 md:h-full bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar z-20 shadow-sm flex flex-col"
      >
        {/* Sticky Top Bar (Search + Location + Filter Toggle Header) */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-3.5 border-b border-slate-200 space-y-2.5 shadow-xs">
          
          {/* User Location Bar */}
          <div className="relative bg-blue-50/80 border border-blue-200 rounded-2xl p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                    My Location ({filters.maxDistance} mi radius)
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentAddress}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-300 text-blue-700 text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 flex items-center space-x-1 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            </div>

            {/* Location Selector Drawer */}
            {showLocationPicker && (
              <div className="mt-3 pt-3 border-t border-blue-200 space-y-2 animate-fade-in">
                <button
                  onClick={handleUseMyActualLocation}
                  disabled={isLocating}
                  className="w-full text-left px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs cursor-pointer transition-colors"
                >
                  <span className="flex items-center space-x-1.5">
                    <Target className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detecting your location…' : '📍 Use My Current Location'}</span>
                  </span>
                  <span className="text-[10px] bg-blue-700 px-2 py-0.5 rounded-md">GPS</span>
                </button>

                {locationError && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 leading-snug">
                    {locationError}
                  </p>
                )}

                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 pt-1">
                  Preset SoCal Medical Hubs:
                </p>

                <div className="space-y-1">
                  {PRESET_LOCATIONS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectPresetLocation(preset)}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        currentAddress === preset.address
                          ? 'bg-blue-100 text-blue-900 font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{preset.name}</span>
                      <span className="text-[10px] text-slate-400">Set</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Title & Filter Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-extrabold text-slate-900">
                Moonlighting Opportunities
              </h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-black">
                {filteredShifts.length}
              </span>
            </div>

            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
              title="Toggle Preferences & Radius Sliders"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>{showFiltersPanel ? 'Hide Filters' : 'Filters'}</span>
              {showFiltersPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Search Input Bar (Always Sticky at Top) */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Search hospital, specialty, or location..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-medium"
            />
          </div>
        </div>

        {/* Collapsible Filter Preferences Panel */}
        {showFiltersPanel && (
          <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/70 text-xs transition-all animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                <Filter className="w-3 h-3 text-blue-600" />
                <span>Search Preferences & Filters</span>
              </span>
              <button
                onClick={() =>
                  setFilters({
                    specialty: 'All',
                    maxDistance: 25,
                    minPayRate: 120,
                    shiftType: 'All',
                    searchQuery: '',
                    onlyEligible: false,
                  })
                }
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            {/* Specialty & Shift Type Selectors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Specialty
                </label>
                <select
                  value={filters.specialty}
                  onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
                >
                  <option value="All">All Specialties</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Family Medicine">Family Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Anesthesiology">Anesthesiology</option>
                  <option value="Urgent Care">Urgent Care</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Shift Type
                </label>
                <select
                  value={filters.shiftType}
                  onChange={(e) => setFilters({ ...filters, shiftType: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
                >
                  <option value="All">All Shift Types</option>
                  <option value="Night Shift">Night Shift / Nocturnist</option>
                  <option value="Day Shift">Day Shift</option>
                  <option value="Swing Shift">Swing Shift</option>
                  <option value="24-Hour Call">24-Hour Call</option>
                </select>
              </div>
            </div>

            {/* Sliders for distance & pay */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium text-[11px]">Min Hourly Rate:</span>
                <span className="font-extrabold text-blue-600">${filters.minPayRate}/hr+</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                step="10"
                value={filters.minPayRate}
                onChange={(e) => setFilters({ ...filters, minPayRate: Number(e.target.value) })}
                className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium text-[11px]">Max Radius from My Location:</span>
                <span className="font-extrabold text-blue-600">{filters.maxDistance} miles</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={filters.maxDistance}
                onChange={(e) => setFilters({ ...filters, maxDistance: Number(e.target.value) })}
                className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Toggle: Eligible Only */}
            <div className="pt-2 border-t border-slate-200/80 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-800 font-extrabold flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Only show pre-cleared sites</span>
                  </span>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Hides opportunities requiring new passport clearance
                  </p>
                </div>
                <button
                  onClick={() => setFilters({ ...filters, onlyEligible: !filters.onlyEligible })}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ml-2 cursor-pointer ${
                    filters.onlyEligible ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                      filters.onlyEligible ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Divider & Job Listings Counter Header */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 flex items-center space-x-1.5">
            <Hospital className="w-3.5 h-3.5 text-blue-600" />
            <span>Matching Jobs ({filteredShifts.length})</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            Scroll down for all listings ↓
          </span>
        </div>

        {/* Scrollable Shift List Cards */}
        <div className="p-3 space-y-3 bg-slate-50/50 flex-1 min-h-[350px] pb-12">
          {filteredShifts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Hospital className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-sm">No shifts match current filters</p>
              <p className="text-xs text-slate-500 mt-1">
                Try widening your distance radius or lowering the minimum hourly rate.
              </p>
              <button
                onClick={() =>
                  setFilters({
                    specialty: 'All',
                    maxDistance: 50,
                    minPayRate: 100,
                    shiftType: 'All',
                    searchQuery: '',
                    onlyEligible: false,
                  })
                }
                className="mt-3 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredShifts.map((shift) => {
              const eligible = isEligibleForShift(shift);
              const isSelected = selectedShiftId === shift.id;

              return (
                <div
                  key={shift.id}
                  onClick={() => {
                    setSelectedShiftId(shift.id);
                    onSelectShift(shift);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200 mb-1.5 inline-block">
                        {shift.specialty}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {shift.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium flex items-center space-x-1 mt-0.5">
                        <Hospital className="w-3.5 h-3.5 text-slate-400 inline shrink-0" />
                        <span>{shift.hospitalName}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-blue-600 leading-none">
                        ${shift.hourlyRate}
                        <span className="text-[10px] font-normal text-slate-500">/hr</span>
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        ${shift.totalPay} total
                      </p>
                    </div>
                  </div>

                  {/* Badges & Meta */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 font-medium">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{shift.shiftType} ({shift.durationHours}h)</span>
                    </span>

                    <span className="flex items-center space-x-1 bg-blue-50 text-blue-900 px-2 py-1 rounded-md border border-blue-200 font-bold">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>{shift.distanceMiles} mi away</span>
                    </span>

                    {/* Eligibility Badge */}
                    {eligible ? (
                      <span className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 font-extrabold ml-auto">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Available (Pre-Cleared)</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300 font-bold ml-auto">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Requires Clearance</span>
                      </span>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Date: <strong className="text-slate-800">{shift.date}</strong> ({shift.startTime} - {shift.endTime})
                    </span>
                    <span className="text-blue-600 font-bold flex items-center space-x-1 hover:underline">
                      <span>Shift Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Jump to top helper */}
          {filteredShifts.length > 3 && (
            <div className="pt-4 text-center">
              <button
                onClick={() => {
                  if (sidebarRef.current) {
                    sidebarRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Back to Top / Search</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Container Viewport */}
      <div className="flex-1 h-1/2 md:h-full relative">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Quick Region Switcher Buttons Overlay */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 flex items-center">
            Set Location:
          </span>
          <button
            onClick={handleSetHawthorneLocation}
            className="px-2.5 py-1 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1"
          >
            <span>📍 Hawthorne (South Bay)</span>
          </button>
          <button
            onClick={() => handleSelectPresetLocation(PRESET_LOCATIONS[3])}
            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Downtown LA
          </button>
          <button
            onClick={() => handleSelectPresetLocation(PRESET_LOCATIONS[2])}
            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Santa Monica
          </button>
        </div>

        {/* Floating Legend */}
        <div className="absolute bottom-20 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-3 rounded-2xl border border-slate-200 text-xs space-y-2 shadow-lg hidden sm:block">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
            <span>Available (pre-cleared)</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>Requires clearance</span>
          </div>
        </div>
      </div>

    </div>
  );
};

