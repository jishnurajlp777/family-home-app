import React, { useState, useEffect } from 'react';
import { FamilyMember, CaricatureType, ChecklistItem, AuthUser } from '../types/member';
import { Caricature } from './Caricature';
import { FamilyGallery } from './FamilyGallery';

interface MemberPageProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onBackToHome: () => void;
  onSelectMember: (id: string) => void;
  onQuickEdit: (member: FamilyMember) => void;
  onUpdateMember?: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  currentUser?: AuthUser;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

type TabType = 'about' | 'room' | 'gallery';

const CARICATURE_THEMES: Record<
  CaricatureType,
  { bgGradient: string; badgeBg: string; ringColor: string }
> = {
  jishnu: {
    bgGradient: 'from-blue-500/10 via-sky-500/10 to-indigo-500/10',
    badgeBg: 'bg-blue-100 text-blue-800',
    ringColor: 'border-blue-300 shadow-blue-100',
  },
  ashna: {
    bgGradient: 'from-rose-500/10 via-pink-500/10 to-purple-500/10',
    badgeBg: 'bg-rose-100 text-rose-800',
    ringColor: 'border-rose-300 shadow-rose-100',
  },
  raju: {
    bgGradient: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    ringColor: 'border-emerald-300 shadow-emerald-100',
  },
  lalitha: {
    bgGradient: 'from-amber-500/10 via-orange-500/10 to-rose-500/10',
    badgeBg: 'bg-amber-100 text-amber-800',
    ringColor: 'border-amber-300 shadow-amber-100',
  },
  boy: {
    bgGradient: 'from-sky-500/10 via-cyan-500/10 to-blue-500/10',
    badgeBg: 'bg-sky-100 text-sky-800',
    ringColor: 'border-sky-300 shadow-sky-100',
  },
  girl: {
    bgGradient: 'from-purple-500/10 via-fuchsia-500/10 to-pink-500/10',
    badgeBg: 'bg-purple-100 text-purple-800',
    ringColor: 'border-purple-300 shadow-purple-100',
  },
  elder: {
    bgGradient: 'from-teal-500/10 via-emerald-500/10 to-slate-500/10',
    badgeBg: 'bg-teal-100 text-teal-800',
    ringColor: 'border-teal-300 shadow-teal-100',
  },
  pet: {
    bgGradient: 'from-amber-500/10 via-yellow-500/10 to-orange-500/10',
    badgeBg: 'bg-amber-100 text-amber-800',
    ringColor: 'border-amber-300 shadow-amber-100',
  },
};

export const MemberPage: React.FC<MemberPageProps> = ({
  member,
  allMembers,
  onBackToHome,
  onSelectMember,
  onQuickEdit,
  onUpdateMember,
  currentUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('about');

  // Room Notes State
  const [roomNotes, setRoomNotes] = useState<string>(member.room_notes || '');
  const [isSavedNotes, setIsSavedNotes] = useState<boolean>(false);

  // Room Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>(member.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState<string>('');

  // Keep local notes and checklist synchronized with latest member updates
  useEffect(() => {
    setRoomNotes(member.room_notes || '');
    setChecklist(member.checklist || []);
  }, [member]);

  // Tags & Image Quick State
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>('');

  const theme = CARICATURE_THEMES[member.caricature_key] || CARICATURE_THEMES.boy;
  const otherMembers = allMembers.filter((m) => m.id !== member.id);

  // Quick image add/upload handler with client-side compression
  const handleQuickImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateMember) return;

    if (!file.type.startsWith('image/')) {
      if (onShowToast) onShowToast('Only image files are allowed.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else if (h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          onUpdateMember(member.id, { image_url: compressed });
          if (onShowToast) onShowToast('Profile photo updated!', 'success');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick image remove handler
  const handleRemoveImage = () => {
    if (onUpdateMember) {
      onUpdateMember(member.id, { image_url: '' });
    }
  };

  // Quick tag remove handler
  const handleRemoveTagDirect = (tagToRemove: string) => {
    if (onUpdateMember && member.tags) {
      const updated = member.tags.filter((t) => t !== tagToRemove);
      onUpdateMember(member.id, { tags: updated });
    }
  };

  // Quick tag add handler
  const handleAddTagDirect = () => {
    const clean = newTagInput.trim();
    if (clean && onUpdateMember) {
      const existing = member.tags || [];
      if (!existing.includes(clean)) {
        onUpdateMember(member.id, { tags: [...existing, clean] });
      }
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  // Save notes handler
  const handleSaveNotes = async () => {
    if (onUpdateMember) {
      await onUpdateMember(member.id, { room_notes: roomNotes });
    }
    setIsSavedNotes(true);
    setTimeout(() => setIsSavedNotes(false), 2000);
  };

  // Checklist handlers
  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    if (onUpdateMember) {
      onUpdateMember(member.id, { checklist: updated });
    }
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem: ChecklistItem = {
      id: 'c_' + Date.now().toString(36),
      text: newChecklistText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText('');
    if (onUpdateMember) {
      onUpdateMember(member.id, { checklist: updated });
    }
  };

  const handleRemoveChecklistItem = (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    if (onUpdateMember) {
      onUpdateMember(member.id, { checklist: updated });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-pageSlideIn space-y-6 pb-12">
      {/* Top Floating Navigation Bar */}
      <nav className="flex items-center justify-between bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-xs">
        <button
          onClick={onBackToHome}
          data-testid="member-btn-back"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3.5 py-2 rounded-xl transition-all active:scale-95 group"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Home</span>
        </button>

        {/* Member breadcrumb indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>🏡 Our Home</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-800">{member.name}</span>
        </div>

        {/* Quick Actions */}
        <button
          onClick={() => onQuickEdit(member)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition shadow-2xs hover:shadow-xs active:scale-95"
          title="Edit member details"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span>Edit Profile</span>
        </button>
      </nav>

      {/* Full-Page Responsive 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Member Hero Card & Quick Switch (Col 1-5 on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Member Spotlight Hero Banner */}
          <div className={`relative overflow-hidden bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 bg-gradient-to-br ${theme.bgGradient}`}>
            <div className="flex flex-col items-center text-center">
              {/* Large Avatar (Photo or Caricature) with Add/Remove Image */}
              <div className="relative group mb-3">
                <div className={`w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-white p-2.5 border-4 ${theme.ringColor} shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105 overflow-hidden`}>
                  {member.image_url ? (
                    <img
                      src={member.image_url}
                      alt={member.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <Caricature type={member.caricature_key} />
                  )}
                </div>

                {/* Direct Add / Remove Image */}
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs transition">
                    <span>📷 {member.image_url ? 'Change Image' : 'Add Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQuickImageUpload}
                      className="hidden"
                    />
                  </label>
                  {member.image_url && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Remove custom photo"
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Role & Mobile Number */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <span className="text-xs text-slate-600 font-semibold bg-white/90 border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
                  📍 {member.role || 'Cherished Family'}
                </span>
                {member.mobile_number && (
                  <span className="text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-2xs flex items-center gap-1">
                    <span>📞</span>
                    <span>{member.mobile_number}</span>
                  </span>
                )}
              </div>

              {/* Name & Bio */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
                <span>Hi, I am "{member.name}"</span>
                <span className="inline-block animate-wiggle">👋</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-medium">
                {member.bio}
              </p>

              {/* Tags with Add / Remove */}
              <div className="mt-4 w-full">
                <div className="flex flex-wrap gap-1.5 justify-center items-center">
                  {member.tags && member.tags.length > 0 ? (
                    member.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-white/95 border border-slate-200 text-slate-700 px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTagDirect(tag)}
                          title={`Remove tag "${tag}"`}
                          className="text-slate-300 hover:text-rose-600 font-bold transition text-[11px]"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  ) : null}

                  {/* Add Tag Inline */}
                  {isAddingTag ? (
                    <div className="inline-flex items-center gap-1 bg-white border border-indigo-400 p-0.5 rounded-xl shadow-xs">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTagDirect();
                          } else if (e.key === 'Escape') {
                            setIsAddingTag(false);
                            setNewTagInput('');
                          }
                        }}
                        autoFocus
                        placeholder="New tag..."
                        className="w-24 text-xs px-2 py-0.5 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleAddTagDirect}
                        className="text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded-lg"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingTag(false);
                          setNewTagInput('');
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-white/80 hover:bg-white border border-indigo-200 border-dashed px-2.5 py-1 rounded-xl shadow-2xs transition"
                    >
                      <span>+ Add Tag</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Switch Card (Admin only; members can only see their own details) */}
          {currentUser?.role === 'admin' && otherMembers.length > 0 && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
                Quick Switch Family Member
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {otherMembers.map((other) => (
                  <button
                    key={other.id}
                    onClick={() => onSelectMember(other.id)}
                    className="flex items-center justify-between bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 p-2.5 rounded-2xl transition group active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <Caricature type={other.caricature_key} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">{other.name}</div>
                        <div className="text-[10px] text-slate-400">{other.role || 'Member'}</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-indigo-600 font-bold pr-2">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tabbed Content Area (Col 6-12 on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Section Tabs Navigation */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <button
              data-testid="member-tab-about"
              onClick={() => setActiveTab('about')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>👤</span>
              <span>About & Story</span>
            </button>

            <button
              data-testid="member-tab-room"
              onClick={() => setActiveTab('room')}
              className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'room'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>🛋️</span>
              <span>My Room</span>
            </button>

            <button
              data-testid="member-tab-gallery"
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>📸</span>
              <span>Family Gallery</span>
            </button>
          </div>

          {/* Tab 1: About & Story View */}
          {activeTab === 'about' && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl animate-fadeIn space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <span>🌟</span>
                <span>Personal Spotlight</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{member.name}'s Family Story</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {member.bio}
              </p>
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span>Registered Mobile</span>
                  <span className="font-bold text-indigo-700 font-mono">
                    📞 {member.mobile_number || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span>Character Avatar Style</span>
                  <span className="font-bold text-slate-700 capitalize bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {member.caricature_key}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: My Room View (Notes + Checklist + Active removed) */}
          {activeTab === 'room' && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl animate-fadeIn space-y-6">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛋️</span>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{member.room_title || `${member.name}'s Cozy Corner`}</h3>
                    <p className="text-xs text-slate-500">{member.room_desc || 'Personal room sanctuary and workspace.'}</p>
                  </div>
                </div>
              </div>

              {/* Room Notes Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="roomNotesInput" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>📝</span>
                    <span>Personal Room Notes</span>
                  </label>
                  {isSavedNotes && (
                    <span className="text-xs text-emerald-600 font-bold animate-fadeIn">✓ Saved!</span>
                  )}
                </div>

                <textarea
                  id="roomNotesInput"
                  rows={3}
                  value={roomNotes}
                  onChange={(e) => setRoomNotes(e.target.value)}
                  placeholder="Write thoughts, reminders, or tasks for your room..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-2xl p-3.5 text-xs font-medium text-slate-800 outline-none transition resize-none leading-relaxed"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition active:scale-95"
                  >
                    Save Room Notes
                  </button>
                </div>
              </div>

              {/* Room Checklist */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>✅</span>
                    <span>Room Checklist & Tasks</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-semibold">
                    {checklist.filter((i) => i.completed).length} of {checklist.length} completed
                  </span>
                </div>

                <div className="space-y-2">
                  {checklist.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No checklist items yet. Add one below!</p>
                  ) : (
                    checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/30 transition group"
                      >
                        <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(item.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span
                            className={`text-xs font-semibold truncate ${
                              item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {item.text}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          title="Remove task"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg text-xs font-bold transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Add a new checklist task..."
                    className="flex-1 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-medium outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-indigo-600 text-white shadow-2xs transition active:scale-95 flex-shrink-0"
                  >
                    + Add Task
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 3: Family Gallery View (Accessible to members: view/upload all, delete own only) */}
          {activeTab === 'gallery' && (
            <div className="animate-fadeIn">
              <FamilyGallery
                currentUserName={currentUser?.name || member.name}
                currentUserRole={currentUser?.role || 'member'}
                currentUserId={currentUser?.memberId || member.id}
                onShowToast={onShowToast || ((_msg, _type) => {})}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
