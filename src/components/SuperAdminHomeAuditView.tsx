import React, { useState, useEffect, useCallback } from 'react';
import { Home, HomeAuditSummary, HomeAuditEntity } from '../types/member';
import { FamilyService } from '../services/api';

interface SuperAdminHomeAuditViewProps {
  home: Home;
  onBack: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const SuperAdminHomeAuditView: React.FC<SuperAdminHomeAuditViewProps> = ({
  home,
  onBack,
  onShowToast,
}) => {
  const [auditData, setAuditData] = useState<HomeAuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAuditData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await FamilyService.getSuperAdminHomeAudit(home.id);
      setAuditData(data);
    } catch {
      onShowToast('Could not load audit data from server.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [home.id, onShowToast]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Not yet active';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Inactive';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      if (isNaN(diffMs)) return 'Recently';
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const entities = auditData?.entities || [];
  const totalLocationUsage = auditData?.totalLocationUsage ?? 0;
  const memberCount = entities.filter((e) => e.type === 'member').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-pageSlideIn pb-12">
      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-5 py-4 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition active:scale-95 cursor-pointer"
            title="Back to Platform Console"
          >
            ←
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>🏡</span>
              <span>{home.name}</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Super Admin Home Audit
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Activity time track & Google Location usage audit • ID: <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">{home.id}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadAuditData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span>↻</span>
            <span>Refresh Audit</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>← Exit to Console</span>
          </button>
        </div>
      </header>

      {/* Security & Access Restriction Notice */}
      <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-900 shadow-2xs">
        <span className="text-lg shrink-0">🛡️</span>
        <div>
          <span className="font-bold block text-indigo-950">Strict Access Restriction & Privacy Policy</span>
          <p className="text-indigo-800/90 mt-0.5 leading-relaxed">
            Personal family secrets, telephone numbers, room notes, and checklists are restricted and hidden by system policy. 
            Super Admin view is strictly limited to <strong>activity timestamps</strong> and <strong>Google location service usage counts</strong>.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Home Account</span>
          <span className="text-lg font-black text-slate-800 block mt-1 truncate">{home.name}</span>
          <span className="text-[11px] text-slate-400 truncate block">✉️ {home.email}</span>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Google Location Usages</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1">📍 {totalLocationUsage}</span>
          <span className="text-[11px] text-slate-400">Total times location features used</span>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Enrolled Members</span>
          <span className="text-2xl font-black text-indigo-600 block mt-1">{memberCount}</span>
          <span className="text-[11px] text-slate-400">Registered inside this home</span>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Home User Active Time</span>
          <span className="text-xs font-black text-amber-600 block mt-1.5 truncate">
            {formatDateTime(auditData?.home.last_active_at)}
          </span>
          <span className="text-[11px] text-slate-400">
            {getRelativeTime(auditData?.home.last_active_at)}
          </span>
        </div>
      </div>

      {/* Activity Time Track & Location Usage Table */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>⏱️</span>
              <span>Activity Time Track & Location Usage Log</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Live audit records of all user activity timestamps and Google Maps service queries
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-xl">
            {entities.length} tracked entities
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            <span className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading activity and location audit records...</p>
          </div>
        ) : entities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-2xl">
            No activity logged yet for this home.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">User / Entity</th>
                  <th className="py-3 px-4">Access Role</th>
                  <th className="py-3 px-4">Activity Time Track</th>
                  <th className="py-3 px-4">Google Location Usage</th>
                  <th className="py-3 px-4">GPS Status</th>
                  <th className="py-3 px-4 text-right">Activity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entities.map((entity: HomeAuditEntity) => {
                  const isHomeUser = entity.type === 'home';
                  const hasLocation = Boolean(entity.has_location);
                  const usageCount = entity.location_usage_count || 0;

                  return (
                    <tr
                      key={entity.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isHomeUser ? 'bg-amber-50/30 font-semibold' : ''
                      }`}
                    >
                      {/* Name / User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{isHomeUser ? '🏡' : '👤'}</span>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{entity.name}</span>
                            <span className="text-[10px] text-slate-400">ID: {entity.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Access Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isHomeUser
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {isHomeUser ? '👑 Home User' : `👤 ${entity.role || 'Member'}`}
                        </span>
                      </td>

                      {/* Activity Time Track */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {formatDateTime(entity.last_active_at)}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {getRelativeTime(entity.last_active_at)}
                        </span>
                      </td>

                      {/* Google Location Usage Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                              usageCount > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span>📍</span>
                            <span>{usageCount} {usageCount === 1 ? 'time used' : 'times used'}</span>
                          </span>
                        </div>
                      </td>

                      {/* GPS Coordinates Status */}
                      <td className="py-3.5 px-4">
                        {isHomeUser ? (
                          <span className="text-[11px] text-slate-400">Home Console</span>
                        ) : hasLocation ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span>●</span>
                            <span>Live GPS Logged</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            <span>○</span>
                            <span>Never Shared</span>
                          </span>
                        )}
                      </td>

                      {/* Activity Status */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Logged</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
