import React, { useState } from 'react';
import { getActiveFirebaseConfig, saveActiveFirebaseConfig, FirebaseAppConfig } from '../services/firebaseConfig';
import { firebaseService } from '../services/firebaseService';
import { FamilyService } from '../services/api';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = getActiveFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [rawJson, setRawJson] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const isCloudActive = firebaseService.isAvailable();

  const handleParseRawJson = () => {
    try {
      // Find JSON object or JS object snippet
      const clean = rawJson
        .replace(/const\s+firebaseConfig\s*=\s*/, '')
        .replace(/;/g, '')
        .trim();
      
      // Handle unquoted keys in JS snippet
      const normalized = clean.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"');
      const parsed = JSON.parse(normalized);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.projectId) {
        setProjectId(parsed.projectId);
        if (!authDomain) setAuthDomain(`${parsed.projectId}.firebaseapp.com`);
      }
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.appId) setAppId(parsed.appId);

      setShowJsonInput(false);
      setStatusMsg({ text: 'Config parsed successfully! Click "Save & Connect" below.', isError: false });
    } catch {
      setStatusMsg({ text: 'Could not parse config snippet. Please fill the fields manually.', isError: true });
    }
  };

  const handleSave = async () => {
    if (!projectId.trim() || !apiKey.trim()) {
      setStatusMsg({ text: 'Project ID and API Key are required.', isError: true });
      return;
    }

    const newConfig: FirebaseAppConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim() || undefined,
    };

    saveActiveFirebaseConfig(newConfig);
    const connected = firebaseService.reloadConfig();
    await FamilyService.checkConnection();

    if (connected) {
      setStatusMsg({ text: '🎉 Successfully connected to Firebase Cloud Firestore!', isError: false });
      setTimeout(() => {
        onConfigSaved();
        onClose();
      }, 1200);
    } else {
      setStatusMsg({
        text: 'Configuration saved, but could not connect. Check your Project ID and API Key.',
        isError: true,
      });
    }
  };

  const handleClear = () => {
    saveActiveFirebaseConfig(null);
    firebaseService.reloadConfig();
    setApiKey('');
    setProjectId('');
    setAuthDomain('');
    setAppId('');
    setStatusMsg({ text: 'Firebase configuration cleared. Switched back to local storage/server.', isError: false });
    setTimeout(() => {
      onConfigSaved();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">☁️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Remote Cloud Database</h2>
              <p className="text-xs text-slate-400">Sync all family phones & web apps live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Live Status Pill */}
        <div
          className={`flex items-center gap-3 p-3.5 rounded-2xl text-xs font-semibold ${
            isCloudActive
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <span className="text-base">{isCloudActive ? '🟢' : '🟡'}</span>
          <div>
            <p className="font-bold">
              {isCloudActive
                ? 'Cloud Firestore Active (Live Syncing)'
                : 'Using Local Database / SQLite Server'}
            </p>
            <p className="text-[11px] font-normal opacity-90">
              {isCloudActive
                ? 'All updates are pushing live to all mobile devices and web browsers.'
                : 'Connect Firebase below so all family members can sync from their phones.'}
            </p>
          </div>
        </div>

        {/* Status Msg */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium ${
              statusMsg.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Quick Paste or Form */}
        {showJsonInput ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Paste Firebase Config Code:
            </label>
            <textarea
              rows={5}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "family-home-xyz"\n};'}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleParseRawJson}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-xl transition"
              >
                Apply Pasted Config
              </button>
              <button
                type="button"
                onClick={() => setShowJsonInput(false)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1.5 px-3 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowJsonInput(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1.5 px-3 rounded-xl transition flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>Paste Firebase Config snippet from Console</span>
          </button>
        )}

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Project ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                if (!authDomain) setAuthDomain(`${e.target.value}.firebaseapp.com`);
              }}
              placeholder="e.g. family-home-123"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              API Key <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Auth Domain</label>
              <input
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="project-id.firebaseapp.com"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">App ID (Optional)</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:12345678:web:abc"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-[11px] text-slate-600">
          <p className="font-bold text-slate-700">How to get your free Firebase keys (2 mins):</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">console.firebase.google.com</a> and click <b>Create a project</b>.</li>
            <li>Click <b>Build ➔ Firestore Database ➔ Create Database</b> (choose Test mode).</li>
            <li>Click <b>Project Settings (⚙️) ➔ Web App (&lt;/&gt;)</b> and copy the config.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {currentConfig ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition"
            >
              Disconnect Cloud
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-xl shadow-md transition active:scale-95"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
