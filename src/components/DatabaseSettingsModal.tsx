import React, { useState, useEffect } from 'react';
import { FamilyService } from '../services/api';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [apiUrl, setApiUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [dbType, setDbType] = useState('Checking...');
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = FamilyService.getApiBase();
      setApiUrl(current);
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const res = await FamilyService.checkConnection();
      setIsConnected(res.connected);
      setDbType(res.dbType);
      if (res.connected) {
        setStatusMsg({ text: `🟢 Connected to backend server with ${res.dbType} database!`, isError: false });
      } else {
        setStatusMsg({ text: '🟠 Backend server is unreachable. App is safely operating in offline local cache mode.', isError: true });
      }
    } catch {
      setIsConnected(false);
      setDbType('Offline');
      setStatusMsg({ text: '🟠 Could not reach server. Operating offline.', isError: true });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    FamilyService.setApiBase(apiUrl);
    setStatusMsg({ text: 'Testing new API connection...', isError: false });
    await checkStatus();
    onConfigSaved();
  };

  const handleReset = async () => {
    FamilyService.setApiBase(null);
    setApiUrl('');
    await checkStatus();
    onConfigSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗄️</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Database & Server Status</h2>
              <p className="text-xs text-slate-500">Configure your Developer Machine or Live Server API</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Badge */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{isConnected ? '🟢' : '🟠'}</span>
              <div>
                <p className="font-bold text-xs">
                  {isConnected ? 'Connected to Backend (Live)' : 'Offline / Local Cache'}
                </p>
                <p className="text-[11px] opacity-80">
                  Storage Engine: <b className="font-semibold">{dbType}</b>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={checkStatus}
              disabled={isTesting}
              className="text-xs font-semibold px-2.5 py-1 bg-white/80 hover:bg-white border rounded-lg shadow-2xs transition"
            >
              {isTesting ? 'Testing...' : '🔄 Refresh'}
            </button>
          </div>

          {statusMsg && (
            <div className={`text-xs p-3 rounded-xl border ${
              statusMsg.isError ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {statusMsg.text}
            </div>
          )}

          {/* API URL Config */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Backend Server URL:
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000 (Default for Local Dev)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500">
              Leave blank to connect to <code>localhost:3000</code> in development or the same domain when deployed. For your Android APK on a real phone, enter your PC local IP (e.g. <code>http://192.168.1.15:3000</code>) or Live URL.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition active:scale-95"
            >
              Save & Connect
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition"
            >
              Reset to Local
            </button>
          </div>

          {/* 2-Tier Architecture Quick Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
            <p className="font-bold text-slate-800">Quick Setup Instructions:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li><b>Developer Machine (Local):</b> Run <code>start_dev.bat</code> to launch local backend on port 3000 and Vite on port 5173.</li>
              <li><b>Direct Live (Cloud):</b> Deploy backend to Render/Railway and database to Cloud MySQL (Aiven). Paste your live URL above.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
