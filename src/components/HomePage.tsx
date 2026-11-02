import React, { useState } from 'react';
import { FamilyMember, AuthUser, ActiveCall } from '../types/member';
import { CartoonHome } from './CartoonHome';
import { Caricature } from './Caricature';
import { MembersMap } from './MembersMap';
import { FamilyGallery } from './FamilyGallery';
import { HomeSettingsModal } from './HomeSettingsModal';

interface HomePageProps {
  members: FamilyMember[];
  currentUser: AuthUser;
  onSelectMember: (id: string) => void;
  onOpenAddMember: () => void;
  onRequestDeleteMember?: (member: FamilyMember) => void;
  onOpenEditMember?: (member: FamilyMember) => void;
  onLogout: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
  onRefresh?: () => void;
  onUpdateLocation?: (lat: number, lng: number, placeName?: string) => Promise<void>;
  onTriggerCall?: (targetId?: string) => void;
  activeCall?: ActiveCall | null;
}

export const HomePage: React.FC<HomePageProps> = ({
  members,
  currentUser,
  onSelectMember,
  onOpenAddMember,
  onRequestDeleteMember,
  onOpenEditMember,
  onLogout,
  onShowToast,
  onRefresh,
  onUpdateLocation,
  onTriggerCall,
  activeCall,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const handleMemberCardClick = (member: FamilyMember) => {
    if (isAdmin) {
      onSelectMember(member.id);
      return;
    }

    // Member access: can only view his own details
    if (currentUser.memberId === member.id || currentUser.mobile_number === member.mobile_number) {
      onSelectMember(member.id);
    } else {
      onShowToast('Restricted: You can only view your own details. Contact your home.', 'error');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-pageSlideIn space-y-6">
      {/* Top Header Bar with User Access Indicator & Login Switcher */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-xs gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏡</span>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
              {currentUser.homeName || 'Our Family Home'}
            </h1>
          </div>
        </div>

        {/* User Access Level Badge & Login Switcher */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          {isAdmin ? (
            <>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl shadow-2xs">
                <span className="text-sm">🏡</span>
                <div className="text-left">
                  <span className="text-xs font-bold text-amber-900 block leading-tight">Home</span>
                  {currentUser.email && (
                    <span className="text-[10px] text-amber-700 font-medium block leading-none mt-0.5">{currentUser.email}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3.5 py-2 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                title="Home Profile & Password Settings"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-sm">👤</span>
              <div className="text-left">
                <span className="text-xs font-bold text-indigo-900 block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-indigo-700 font-medium">Mobile: {currentUser.mobile_number}</span>
              </div>
            </div>
          )}

          {/* Internet Calling Button */}
          {onTriggerCall && (
            <button
              type="button"
              onClick={() => onTriggerCall('all')}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer ${
                activeCall && activeCall.status !== 'ended'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
              title="Start or join family internet call"
            >
              <span>📞</span>
              <span>{activeCall && activeCall.status !== 'ended' ? 'Live Call (Join)' : 'Internet Call'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3.5 py-2 rounded-xl shadow-2xs transition active:scale-95"
            title="Log out of application"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Responsive Grid: Left Column (Home & Summary) + Right Column (Members, Live Map & Family Gallery) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Home Illustration & Family Summary (Col 1-4 on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-5">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

            {/* Click-and-Round Cartoon Home */}
            <CartoonHome />

            {/* Quick Family Highlights */}
            <div className="mt-5 pt-5 border-t border-slate-100 flex justify-center">
              <div className="bg-slate-50 py-2.5 px-6 rounded-2xl border border-slate-100 text-center min-w-[130px]">
                <span className="text-base font-extrabold text-indigo-600 block">{members.length}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Members</span>
              </div>
            </div>

            {/* Welcome note */}
            <p className="mt-4 text-xs text-slate-400 font-medium italic">
              "Every family has a story. Welcome to ours." ❤️
            </p>
          </div>

          {/* Family Gallery Tile (Moved below Our Home tile as requested) */}
          <FamilyGallery
            currentUserName={currentUser.name}
            currentUserRole={currentUser.role}
            currentUserId={currentUser.role === 'admin' ? 'admin' : (currentUser.memberId || currentUser.member?.id)}
            onShowToast={onShowToast}
          />
        </div>

        {/* Right Column: Members Grid + Members Live Map + Family Gallery (Col 5-12 on desktop) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6">
          {/* Members List Section */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7">
            {/* Header row: Members title on left, Add and Delete Member on right */}
            <div className="flex items-center justify-between mb-5 px-1 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">👥</span>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Members
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Tap to open profile
                </p>
              </div>

              {/* Add Member control (Admin only) */}
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenAddMember}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Member</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                  👤 Logged in as {currentUser.name}
                </span>
              )}
            </div>

            {/* Member Cards Grid */}
            {members.length === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-3xl space-y-3">
                <span className="text-4xl block">🏡</span>
                <h4 className="text-sm font-extrabold text-slate-800">No Family Members Registered Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAdmin
                    ? 'Click "+ Add Member" to register your family members with their phone numbers.'
                    : 'Please contact your home to register your family member profile.'}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAddMember}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <span>+</span>
                    <span>Add First Member</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {members.map((m) => {
                const isOwnProfile = !isAdmin && (currentUser.memberId === m.id || currentUser.mobile_number === m.mobile_number);
                const isRestricted = !isAdmin && !isOwnProfile;

                return (
                  <div
                    key={m.id}
                    className={`relative group flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-200 text-center ${
                      isOwnProfile
                        ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-200 shadow-md'
                        : isRestricted
                        ? 'border-slate-200 bg-slate-50/50 opacity-75 hover:opacity-100'
                        : 'border-slate-200/90 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/50 hover:shadow-md'
                    }`}
                  >
                    {/* Direct Edit button on member card (Admin or own profile) */}
                    {onOpenEditMember && (isAdmin || isOwnProfile) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditMember(m);
                        }}
                        title={`Edit ${m.name}`}
                        className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 border border-indigo-200 flex items-center justify-center text-xs opacity-70 group-hover:opacity-100 transition shadow-2xs active:scale-90 z-10"
                      >
                        ✏️
                      </button>
                    )}

                    {/* Direct Delete button on member card (Admin only) */}
                    {isAdmin && onRequestDeleteMember && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDeleteMember(m);
                        }}
                        title={`Delete ${m.name}`}
                        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 border border-rose-200 flex items-center justify-center text-xs opacity-60 group-hover:opacity-100 transition shadow-2xs active:scale-90 z-10"
                      >
                        ✕
                      </button>
                    )}

                    {/* Direct Call button on member card */}
                    {onTriggerCall && !isOwnProfile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerCall(m.id);
                        }}
                        title={`Call ${m.name}`}
                        className={`absolute top-2 w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs opacity-75 group-hover:opacity-100 transition shadow-2xs active:scale-90 z-10 ${
                          isAdmin ? 'right-9' : 'right-2'
                        }`}
                      >
                        📞
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleMemberCardClick(m)}
                      className="w-full flex flex-col items-center focus:outline-hidden"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-slate-200 shadow-2xs group-hover:scale-105 group-hover:border-indigo-300 transition-transform flex items-center justify-center overflow-hidden relative">
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Caricature type={m.caricature_key} />
                        )}
                        {isRestricted && (
                          <div className="absolute inset-0 bg-slate-900/40 rounded-xl flex items-center justify-center text-white text-xs backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity">
                            🔒
                          </div>
                        )}
                      </div>
                      <span className="mt-2.5 text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate max-w-full flex items-center gap-1">
                        <span>{m.name}</span>
                        {isOwnProfile && <span className="text-[10px] text-indigo-600 font-extrabold">(You)</span>}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-full">
                        {m.role || 'Member'}
                      </span>
                      {m.mobile_number && (
                        <span className="text-[10px] text-indigo-600 font-bold font-mono truncate max-w-full mt-0.5">
                          📞 {m.mobile_number}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {/* Members Live Map (Visible to all members and admin) */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7">
            <MembersMap
              members={members}
              currentUser={currentUser}
              onUpdateLocation={onUpdateLocation}
              onSelectMember={(id) => {
                if (isAdmin) {
                  onSelectMember(id);
                } else {
                  const target = members.find((m) => m.id === id);
                  if (target) handleMemberCardClick(target);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Home Administrator Profile Settings Modal */}
      {isAdmin && (
        <HomeSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          onSettingsUpdated={(updatedName) => {
            onShowToast(`Home settings updated successfully! Welcome to ${updatedName}.`);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
