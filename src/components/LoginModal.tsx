import React, { useState } from 'react';
import { FamilyMember, AuthUser } from '../types/member';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMembers: FamilyMember[];
  currentUser: AuthUser;
  onLogin: (mobileNumber: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  allMembers,
  currentUser,
  onLogin,
}) => {
  const [mobileInput, setMobileInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileInput.trim();
    if (!clean) {
      setError('Please enter a mobile number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(clean);
      setMobileInput('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid mobile number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = async (phone: string) => {
    setMobileInput(phone);
    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(phone);
      setMobileInput('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-lg shadow-inner">
              🔑
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                User Access & Login
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                Login with your registered mobile number
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Current User Status Banner */}
        <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{currentUser.role === 'admin' ? '👑' : '👤'}</span>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {currentUser.name} ({currentUser.role === 'admin' ? 'Admin Access' : 'Member Access'})
              </div>
              <div className="text-[10px] text-slate-400">Mobile: {currentUser.mobile_number}</div>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Active
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobileInput}
              onChange={(e) => {
                setMobileInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 2000 for Admin, or member mobile"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-medium"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Select Chips */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Quick Login Accounts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {/* Admin Chip */}
              <button
                type="button"
                onClick={() => handleQuickSelect('2000')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-700'
                }`}
              >
                <span>👑</span>
                <span>Admin (2000)</span>
              </button>

              {/* Registered Members Chips */}
              {allMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleQuickSelect(m.mobile_number || '9876543210')}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                    currentUser.memberId === m.id
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                      : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-700'
                  }`}
                >
                  <span>👤</span>
                  <span>{m.name} ({m.mobile_number})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Log In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
