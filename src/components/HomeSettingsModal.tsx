import React, { useState } from 'react';
import { AuthUser } from '../types/member';
import { FamilyService } from '../services/api';

interface HomeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onSettingsUpdated: (updatedHomeName: string) => void;
}

export const HomeSettingsModal: React.FC<HomeSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSettingsUpdated,
}) => {
  const [homeName, setHomeName] = useState<string>(currentUser.homeName || currentUser.name || '');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = homeName.trim();
    if (!cleanName) {
      setError('Home Name cannot be empty.');
      return;
    }

    if (isChangingPassword) {
      if (!currentPassword) {
        setError('Please enter your current password to set a new password.');
        return;
      }
      if (!newPassword || newPassword.length < 3) {
        setError('New password must be at least 3 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await FamilyService.updateHomeProfile(
        cleanName !== currentUser.homeName ? cleanName : undefined,
        isChangingPassword ? currentPassword : undefined,
        isChangingPassword ? newPassword : undefined
      );

      onSettingsUpdated(res.homeName);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update home settings.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800">Home Profile Settings</h3>
              <p className="text-xs text-slate-400">Manage household name & security credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" data-testid="settings-form">
          {/* Decoy fields to intercept aggressive browser credential autofill */}
          <input type="text" name="decoy_settings_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" name="decoy_settings_pass" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

          {/* Home Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
              Home / Family Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                🏡
              </span>
              <input
                type="text"
                name="settings_homename_input"
                data-testid="settings-input-homename"
                value={homeName}
                onChange={(e) => {
                  setHomeName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. The Miller Family Home"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Registered Email (Read-Only) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
              Registered Home Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                ✉️
              </span>
              <input
                type="email"
                value={currentUser.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold cursor-not-allowed outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 ml-1">
              Email serves as unique tenant identity and cannot be altered directly.
            </p>
          </div>

          {/* Password Change Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsChangingPassword(!isChangingPassword);
                setError(null);
              }}
              className="flex items-center justify-between w-full text-xs font-bold text-indigo-600 hover:text-indigo-800 transition py-1"
            >
              <span className="flex items-center gap-1.5">
                <span>🔒</span>
                <span>{isChangingPassword ? 'Cancel Password Change' : 'Change Home Password'}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">{isChangingPassword ? 'Hide ▲' : 'Edit ▼'}</span>
            </button>
          </div>

          {/* Password Fields */}
          {isChangingPassword && (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 ml-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 ml-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 3 characters"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 ml-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                  <span>✓</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
