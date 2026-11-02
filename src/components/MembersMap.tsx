import React, { useState, useEffect } from 'react';
import { FamilyMember, AuthUser } from '../types/member';
import { Caricature } from './Caricature';
import { FamilyService } from '../services/api';

interface MembersMapProps {
  members: FamilyMember[];
  currentUser?: AuthUser;
  onSelectMember: (id: string) => void;
  onUpdateLocation?: (lat: number, lng: number, placeName?: string) => Promise<void>;
}

export const MembersMap: React.FC<MembersMapProps> = ({
  members,
  currentUser: _currentUser,
  onSelectMember,
  onUpdateLocation,
}) => {
  const [selectedPinMemberId, setSelectedPinMemberId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'google' | 'radar'>('google');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Request browser live geolocation and optionally sync to profile
  const detectLiveLocation = (syncToDatabase: boolean = false) => {
    if (!navigator.geolocation) {
      setSyncStatus('Geolocation not supported by device');
      return;
    }

    setIsDetecting(true);
    setSyncStatus('Detecting GPS satellite coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLiveLocation({ lat: latitude, lng: longitude });
        setIsDetecting(false);
        setSyncStatus('Live GPS coordinates acquired');

        if (syncToDatabase && onUpdateLocation) {
          try {
            await onUpdateLocation(latitude, longitude, 'Live Current Area');
            FamilyService.recordLocationUsage(selectedPinMemberId || undefined);
            setSyncStatus('📍 Live location shared with family!');
            setTimeout(() => setSyncStatus(null), 4000);
          } catch {
            setSyncStatus('Could not save live location.');
          }
        } else {
          setTimeout(() => setSyncStatus(null), 3000);
        }
      },
      (error) => {
        setIsDetecting(false);
        setSyncStatus(`GPS error: ${error.message}`);
        setTimeout(() => setSyncStatus(null), 4000);
        // Fallback default coordinates
        setLiveLocation({ lat: 12.9716, lng: 77.5946 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    detectLiveLocation(false);
  }, []);

  const selectedMember = members.find((m) => m.id === selectedPinMemberId) || null;

  // Active target coordinates: selected member -> current user GPS -> fallback
  const currentLat = selectedMember?.location?.lat || liveLocation?.lat || 12.9716;
  const currentLng = selectedMember?.location?.lng || liveLocation?.lng || 77.5946;

  const handleOpenGoogleMaps = (lat: number, lng: number) => {
    FamilyService.recordLocationUsage(selectedPinMemberId || undefined);
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>Family Live Location Map</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time GPS tracking across all family members
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Share / Update GPS Button */}
          {onUpdateLocation && (
            <button
              type="button"
              data-testid="map-btn-update-location"
              onClick={() => detectLiveLocation(true)}
              disabled={isDetecting}
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Detect and broadcast your current live GPS position"
            >
              <span>{isDetecting ? '📡' : '📍'}</span>
              <span>{isDetecting ? 'Locating...' : 'Update My Location'}</span>
            </button>
          )}

          {/* View switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              data-testid="map-tab-google"
              onClick={() => setActiveView('google')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeView === 'google'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Map
            </button>
            <button
              type="button"
              data-testid="map-tab-radar"
              onClick={() => setActiveView('radar')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeView === 'radar'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Family Radar
            </button>
          </div>

          <button
            type="button"
            data-testid="map-btn-open-google"
            onClick={() => handleOpenGoogleMaps(currentLat, currentLng)}
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 active:scale-95 cursor-pointer"
            title="Open coordinates in Google Maps"
          >
            <span>Open Maps</span>
            <span>↗</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="mb-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 animate-fadeIn flex items-center gap-2">
          <span>📡</span>
          <span>{syncStatus}</span>
        </div>
      )}

      {isExpanded && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-100 bg-slate-900 shadow-md">
          {activeView === 'google' ? (
            /* Live Interactive Google Map Embed */
            <div className="relative w-full h-72 sm:h-80 bg-slate-100 overflow-hidden">
              <iframe
                title="Google Map Live Location"
                src={`https://maps.google.com/maps?q=${currentLat},${currentLng}&z=14&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen
              />

              {/* Floating Live GPS Status Pill */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-slate-800 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {selectedMember ? `${selectedMember.name}'s Location` : 'Your Live GPS'}: {currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°
                </span>
                <button
                  type="button"
                  onClick={() => detectLiveLocation(false)}
                  disabled={isDetecting}
                  className="ml-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold underline disabled:opacity-50"
                >
                  {isDetecting ? '...' : 'Refresh'}
                </button>
              </div>

              {/* Member Quick-Pin Selector Bar over Google Map */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 overflow-x-auto py-1 z-10 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setSelectedPinMemberId(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md transition shadow-md whitespace-nowrap ${
                    selectedPinMemberId === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/95 text-slate-700 hover:bg-white'
                  }`}
                >
                  📍 My Live GPS
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedPinMemberId(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md transition shadow-md whitespace-nowrap flex items-center gap-1.5 ${
                      selectedPinMemberId === m.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/95 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span>👤</span>
                    <span>{m.name}</span>
                    {m.location && <span className="text-[10px] opacity-75">📍</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Family Radar Layout */
            <div className="relative w-full h-72 sm:h-80 bg-[#e5e9ec] overflow-hidden select-none">
              <svg viewBox="0 0 400 240" className="w-full h-full object-cover opacity-90">
                <rect width="400" height="240" fill="#f1f5f9" />
                <path d="M 10 130 C 40 120, 80 140, 90 190 C 70 230, 20 220, 10 190 Z" fill="#dcfce7" />
                <path d="M 280 20 C 320 10, 370 30, 390 70 C 370 90, 310 80, 290 50 Z" fill="#dcfce7" />
                <path d="M 140 60 C 180 50, 210 70, 200 110 C 170 120, 130 100, 140 60 Z" fill="#fef3c7" opacity="0.6" />
                <path d="M 0 60 Q 100 80 180 40 T 360 80 T 400 60" stroke="#bae6fd" strokeWidth="14" fill="none" strokeLinecap="round" />
                <path d="M 0 120 L 400 120" stroke="#ffffff" strokeWidth="8" />
                <path d="M 0 120 L 400 120" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 4" />
                <path d="M 200 0 L 200 240" stroke="#ffffff" strokeWidth="8" />
                <path d="M 200 0 L 200 240" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 4" />
                <path d="M 60 0 L 140 240" stroke="#ffffff" strokeWidth="6" />
                <path d="M 260 0 L 340 240" stroke="#ffffff" strokeWidth="6" />
                <path d="M 0 180 Q 200 190 400 170" stroke="#ffffff" strokeWidth="6" />
              </svg>

              {/* Live Location Marker for Current Device */}
              {liveLocation && (
                <div
                  style={{ left: '50%', top: '50%' }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
                >
                  <span className="w-12 h-12 rounded-full border-2 border-indigo-600 animate-ping absolute -top-1" />
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg ring-4 ring-indigo-200">
                    📍
                  </div>
                  <div className="mt-1 bg-indigo-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    You Are Here
                  </div>
                </div>
              )}

              {/* Member Pins */}
              {members.map((m, idx) => {
                const posX = 20 + ((idx * 27 + (m.name.charCodeAt(0) || 0) * 11) % 60);
                const posY = 20 + ((idx * 31 + (m.name.charCodeAt(1) || 0) * 13) % 55);
                const isSelected = selectedPinMemberId === m.id;

                return (
                  <div
                    key={m.id}
                    style={{ left: `${posX}%`, top: `${posY}%` }}
                    onClick={() => setSelectedPinMemberId(isSelected ? null : m.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                  >
                    <div
                      className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white p-0.5 border-2 border-indigo-500 shadow-md flex items-center justify-center transition-transform duration-200 group-hover:scale-125 ${
                        isSelected ? 'scale-125 ring-4 ring-indigo-300' : ''
                      }`}
                    >
                      <Caricature type={m.caricature_key} className="w-full h-full" />
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow pointer-events-none group-hover:block">
                      {m.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Pin Info Card Overlay */}
          {selectedMember && (
            <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 p-1 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <Caricature type={selectedMember.caricature_key} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{selectedMember.name}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                      {selectedMember.location?.status || 'Active GPS'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                    <span>📍</span>
                    <span>{selectedMember.location?.name || selectedMember.location?.address || 'Current Live Area'}</span>
                    <span className="text-slate-400">({selectedMember.location?.updated_at || 'Recently'})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenGoogleMaps(currentLat, currentLng)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition shadow-2xs"
                >
                  Open in Google Maps ↗
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMember(selectedMember.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-2xs"
                >
                  View Profile →
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPinMemberId(null)}
                  className="p-1.5 text-xs text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Map Footer info */}
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>🗺️ Google Maps Live Location Viewer</span>
            <button
              type="button"
              onClick={() => handleOpenGoogleMaps(currentLat, currentLng)}
              className="text-indigo-600 font-bold hover:underline"
            >
              Open Full Google Map ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
