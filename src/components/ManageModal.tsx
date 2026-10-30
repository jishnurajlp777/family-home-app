import React, { useState, useEffect } from 'react';
import { FamilyMember, CaricatureType } from '../types/member';

interface ManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onSave: (data: { id?: string; name: string; caricature_key: CaricatureType; role: string; quote: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExportJson: () => void;
  onResetDefaults: () => Promise<void>;
  isServerConnected: boolean;
  editingMember: FamilyMember | null;
  onClearEditing: () => void;
}

export const ManageModal: React.FC<ManageModalProps> = ({
  isOpen,
  onClose,
  members,
  onSave,
  onDelete,
  onExportJson,
  onResetDefaults,
  isServerConnected,
  editingMember,
  onClearEditing,
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [formId, setFormId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [caricatureKey, setCaricatureKey] = useState<CaricatureType>('boy');
  const [role, setRole] = useState('');
  const [quote, setQuote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation Popup State for Delete
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);

  useEffect(() => {
    if (editingMember) {
      setFormId(editingMember.id);
      setName(editingMember.name);
      setCaricatureKey(editingMember.caricature_key);
      setRole(editingMember.role || '');
      setQuote(editingMember.quote || '');
      setView('form');
    } else {
      setFormId(undefined);
      setName('');
      setCaricatureKey('boy');
      setRole('');
      setQuote('');
    }
  }, [editingMember]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    onClearEditing();
    setFormId(undefined);
    setName('');
    setCaricatureKey('boy');
    setRole('');
    setQuote('');
    setView('form');
  };

  const handleStartEdit = (m: FamilyMember) => {
    setFormId(m.id);
    setName(m.name);
    setCaricatureKey(m.caricature_key);
    setRole(m.role || '');
    setQuote(m.quote || '');
    setView('form');
  };

  const handleCancelForm = () => {
    onClearEditing();
    setView('list');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: formId,
        name: name.trim(),
        caricature_key: caricatureKey,
        role: role.trim(),
        quote: quote.trim(),
      });
      setView('list');
      onClearEditing();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🏡</span>
              <div>
                <h3 className="font-bold text-base text-slate-800">Family Database Manager</h3>
                <p className="text-xs text-slate-500">
                  {isServerConnected
                    ? 'Live SQLite Database (family.db on Node.js Server)'
                    : 'Device localStorage (Run server for SQLite DB)'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              ✕
            </button>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center justify-between gap-2 mt-3.5 pt-1">
            <button
              onClick={() => setView('list')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition text-center shadow-xs ${
                view === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📋 Records ({members.length})
            </button>
            <button
              onClick={handleStartAdd}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition text-center ${
                view === 'form' && !formId
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ➕ Add Record
            </button>
          </div>

          {/* View 1: List View */}
          {view === 'list' ? (
            <div className="flex flex-col gap-2.5 mt-3.5 overflow-y-auto pr-1 flex-1 max-h-72">
              {members.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No records found. Click "Add Record" to start!</p>
              ) : (
                members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition group bg-slate-50/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700 uppercase flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{m.role || 'Family Member'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="text-xs font-semibold px-2 py-1 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                        title="Edit record"
                      >
                        Edit
                      </button>
                      {/* Triggers Validation Confirmation Popup */}
                      <button
                        onClick={() => setMemberToDelete(m)}
                        className="text-xs font-semibold px-2 py-1 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                        title="Remove record"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* View 2: Form View */
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-3.5 overflow-y-auto pr-1 flex-1">
              <div className="flex items-center justify-between bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100">
                <span className="text-xs font-bold text-indigo-800">
                  {formId ? '✏️ Edit Family Member' : '➕ Add New Family Member'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya, Uncle David"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Caricature Avatar Style</label>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {(
                    [
                      { key: 'boy', label: 'Boy', emoji: '👦' },
                      { key: 'girl', label: 'Girl', emoji: '👧' },
                      { key: 'elder', label: 'Elder', emoji: '🧓' },
                      { key: 'pet', label: 'Pet', emoji: '🐶' },
                    ] as const
                  ).map(({ key, label, emoji }) => (
                    <label key={key} className="cursor-pointer">
                      <input
                        type="radio"
                        name="caricatureType"
                        value={key}
                        checked={caricatureKey === key}
                        onChange={() => setCaricatureKey(key)}
                        className="peer sr-only"
                      />
                      <div className="p-2 border-2 border-slate-200 rounded-xl peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:bg-slate-50 transition">
                        <span className="text-lg block">{emoji}</span>
                        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Passion</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Loves reading & gardening"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Family Motto / Quote</label>
                <input
                  type="text"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="e.g. Always smiling and spreading joy!"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
                >
                  Back to List
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          )}

          {/* Footer with Database Utilities */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportJson}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 font-bold p-1 rounded transition"
                title="Export database rows as JSON"
              >
                <span>💾</span> Export JSON
              </button>
              <button
                type="button"
                onClick={onResetDefaults}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 font-semibold p-1 rounded transition"
                title="Reset back to default seed records"
              >
                <span>🔄</span> Reset
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Validation Popup Dialog before Delete */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 space-y-4 animate-pageSlideIn">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl flex-shrink-0 font-bold border border-rose-200">
                ⚠️
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Family Member?</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-slate-900">"{memberToDelete.name}"</span>?
                  This will permanently delete their profile from Our Home.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = memberToDelete.id;
                  setMemberToDelete(null);
                  await onDelete(id);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md transition active:scale-95"
              >
                Yes, Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
