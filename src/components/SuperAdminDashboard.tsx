import React, { useState, useEffect, useCallback } from 'react';
import { Home, FamilyMember } from '../types/member';
import { FamilyService } from '../services/api';
import { Caricature } from './Caricature';

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onEnterHomeAsAdmin?: (home: Home) => void;
  onEnterHomeAudit?: (home: Home) => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onLogout,
  onEnterHomeAsAdmin,
  onEnterHomeAudit,
  onShowToast,
}) => {
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Expanded home details (members inside)
  const [expandedHomeId, setExpandedHomeId] = useState<string | null>(null);
  const [homeMembers, setHomeMembers] = useState<Record<string, FamilyMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  // Modal: Create New Home
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newHomeName, setNewHomeName] = useState<string>('');
  const [newHomeEmail, setNewHomeEmail] = useState<string>('');
  const [newHomePassword, setNewHomePassword] = useState<string>('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Modal: Reset Password
  const [resetTargetHome, setResetTargetHome] = useState<Home | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [isSubmittingReset, setIsSubmittingReset] = useState<boolean>(false);

  // Modal: Delete Home
  const [deleteTargetHome, setDeleteTargetHome] = useState<Home | null>(null);

  // Helper to open create modal with fresh blank inputs
  const handleOpenCreateModal = () => {
    setNewHomeName('');
    setNewHomeEmail('');
    setNewHomePassword('');
    setIsCreateModalOpen(true);
  };

  // Helper to open reset password modal with fresh blank input
  const handleOpenResetPasswordModal = (home: Home) => {
    setResetTargetHome(home);
    setResetNewPassword('');
  };

  // Load all homes
  const loadHomes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await FamilyService.getSuperAdminHomes();
      setHomes(data);
    } catch {
      onShowToast('Could not load homes from server.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadHomes();
  }, [loadHomes]);

  // Toggle expand home members
  const handleToggleExpand = async (homeId: string) => {
    if (expandedHomeId === homeId) {
      setExpandedHomeId(null);
      return;
    }

    setExpandedHomeId(homeId);
    if (!homeMembers[homeId]) {
      try {
        setLoadingMembers(true);
        const members = await FamilyService.getSuperAdminHomeMembers(homeId);
        setHomeMembers((prev) => ({ ...prev, [homeId]: members }));
      } catch {
        onShowToast('Could not load members for this home.', 'error');
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  // Submit Create Home
  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeName.trim() || !newHomeEmail.trim() || !newHomePassword.trim()) {
      onShowToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      await FamilyService.createHome(newHomeName.trim(), newHomeEmail.trim(), newHomePassword.trim());
      onShowToast(`Home "${newHomeName}" provisioned successfully!`, 'success');
      setIsCreateModalOpen(false);
      setNewHomeName('');
      setNewHomeEmail('');
      setNewHomePassword('');
      await loadHomes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create home.';
      onShowToast(msg, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetHome || !resetNewPassword.trim()) return;

    try {
      setIsSubmittingReset(true);
      await FamilyService.resetHomePassword(resetTargetHome.id, resetNewPassword.trim(), resetTargetHome.email);
      onShowToast(`Password for "${resetTargetHome.name}" reset successfully!`, 'success');
      setResetTargetHome(null);
      setResetNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password.';
      onShowToast(msg, 'error');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Confirm Delete Home
  const handleDeleteHome = async () => {
    if (!deleteTargetHome) return;
    const targetName = deleteTargetHome.name;
    const targetId = deleteTargetHome.id;
    try {
      await FamilyService.deleteHome(targetId);
      onShowToast(`Home "${targetName}" deleted successfully.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete home.';
      onShowToast(msg, 'error');
    } finally {
      setDeleteTargetHome(null);
      await loadHomes();
    }
  };

  const totalMembers = homes.reduce((acc, h) => acc + (Number(h.member_count) || 0), 0);
  const totalPhotos = homes.reduce((acc, h) => acc + (Number(h.photo_count) || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-pageSlideIn pb-12">
      {/* Top Header Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-5 py-4 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md">
            👑
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>Super Admin Platform Console</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Master View
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Manage all registered family homes and member directories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            data-testid="sa-btn-create-home"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>+</span>
            <span>Create New Home</span>
          </button>

          <button
            type="button"
            data-testid="sa-btn-logout"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3.5 py-2.5 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Homes</span>
          <span className="text-2xl font-black text-indigo-600 block mt-1">{homes.length}</span>
          <span className="text-[11px] text-slate-400">Independent household sanctuaries</span>
        </div>
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registered Members</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1">{totalMembers}</span>
          <span className="text-[11px] text-slate-400">Across all platform households</span>
        </div>
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Family Memories</span>
          <span className="text-2xl font-black text-amber-600 block mt-1">{totalPhotos}</span>
          <span className="text-[11px] text-slate-400">Photos stored across all galleries</span>
        </div>
      </div>

      {/* Homes Management Section */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>🏡</span>
              <span>All Registered Family Homes ({homes.length})</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Click any home to inspect member details, set password, or view dashboard
            </p>
          </div>
          <button
            type="button"
            onClick={loadHomes}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
          >
            ↻ Refresh Homes
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            <span className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading registered homes...</p>
          </div>
        ) : homes.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <span className="text-4xl block mb-2">🏡</span>
            <h3 className="text-sm font-extrabold text-slate-800">No Homes Registered Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Homes registered by family admins or created via Super Admin will appear here.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-xs transition"
            >
              + Create First Home
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {homes.map((h) => {
              const isExpanded = expandedHomeId === h.id;
              const members = homeMembers[h.id] || [];

              return (
                <div
                  key={h.id}
                  className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:border-indigo-300 transition-all bg-white"
                >
                  {/* Home Summary Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0">
                        🏡
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{h.name}</span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-md">
                            {h.member_count || 0} members
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          ✉️ {h.email} • ID: <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">{h.id}</code>
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(h.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                          isExpanded
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isExpanded ? '▲ Hide Members' : '👥 View Members'}
                      </button>

                      <button
                        type="button"
                        data-testid="sa-btn-reset-password"
                        onClick={() => handleOpenResetPasswordModal(h)}
                        className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        🔄 Reset Password
                      </button>

                      {(onEnterHomeAudit || onEnterHomeAsAdmin) && (
                        <button
                          type="button"
                          onClick={() => (onEnterHomeAudit ? onEnterHomeAudit(h) : onEnterHomeAsAdmin!(h))}
                          className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          🚪 Enter Home
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid="sa-btn-delete-home"
                        onClick={() => setDeleteTargetHome(h)}
                        className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                        title="Delete Home"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Expanded Members Directory for this Home */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                        <span>Directory of Family Members</span>
                        {loadingMembers && <span className="text-[11px] text-indigo-600">Loading members...</span>}
                      </h4>

                      {members.length === 0 && !loadingMembers ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No family members registered inside this home yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {members.map((m) => (
                            <div
                              key={m.id}
                              className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3"
                            >
                              <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                                <Caricature type={m.caricature_key} className="w-8 h-8 drop-shadow-xs" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-slate-900 truncate">{m.name}</h5>
                                <p className="text-[11px] text-indigo-700 font-semibold">{m.role}</p>
                                <p className="text-[10px] text-slate-400">📞 {m.mobile_number}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create New Home */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Provision New Family Home
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create an isolated household account and set its initial administrator password.
            </p>

            <form onSubmit={handleCreateHome} className="space-y-3.5" data-testid="sa-form-create-home">
              {/* Decoy fields to intercept aggressive browser credential managers */}
              <input type="text" name="decoy_sa_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="decoy_sa_pass" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Home Name</label>
                <input
                  type="text"
                  name="sa_new_home_name_input"
                  data-testid="sa-input-home-name"
                  required
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  placeholder="e.g. The Anderson Family Home"
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Home Email</label>
                <input
                  type="email"
                  name="sa_new_home_email_input"
                  data-testid="sa-input-home-email"
                  required
                  value={newHomeEmail}
                  onChange={(e) => setNewHomeEmail(e.target.value)}
                  placeholder="e.g. anderson@family.com"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  name="sa_new_home_pass_input"
                  data-testid="sa-input-home-password"
                  required
                  value={newHomePassword}
                  onChange={(e) => setNewHomePassword(e.target.value)}
                  placeholder="Set password for this home"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  data-testid="sa-btn-cancel-create"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="sa-btn-submit-create"
                  disabled={isSubmittingCreate}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {isSubmittingCreate ? 'Provisioning...' : 'Create Home'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Home Password */}
      {resetTargetHome && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🔄</span>
              <h3 className="text-base font-extrabold text-slate-900">
                Reset Password for "{resetTargetHome.name}"
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new password for <span className="font-semibold text-slate-700">{resetTargetHome.email}</span>. The home administrator can immediately sign in with this new password.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5" data-testid="sa-form-reset-password">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  data-testid="sa-input-reset-password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  data-testid="sa-btn-cancel-reset"
                  onClick={() => setResetTargetHome(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="sa-btn-submit-reset-password"
                  disabled={isSubmittingReset}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {isSubmittingReset ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Home */}
      {deleteTargetHome && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner text-2xl">
              🗑️
            </div>

            <h4 className="text-base font-extrabold text-slate-900">
              Delete Home & All Data?
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This will permanently remove <span className="font-bold text-rose-600">"{deleteTargetHome.name}"</span> along with all its family members and gallery photos.
            </p>

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                data-testid="sa-btn-cancel-delete-home"
                onClick={() => setDeleteTargetHome(null)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="sa-btn-confirm-delete-home"
                onClick={handleDeleteHome}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition"
              >
                Delete Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
