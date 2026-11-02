import React, { useState } from 'react';
import { CartoonHome } from './CartoonHome';
import { FamilyService } from '../services/api';
import { AuthUser } from '../types/member';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'member' | 'home' | 'register_home';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('member');

  // Inputs
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [homeName, setHomeName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Clear errors and input fields when switching modes
  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setMobileNumber('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setHomeName('');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'member') {
        const cleanPhone = mobileNumber.trim();
        if (!cleanPhone) {
          throw new Error('Please enter your registered mobile number.');
        }
        const user = await FamilyService.loginMember(cleanPhone);
        onLoginSuccess(user);
      } else if (mode === 'home') {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = password.trim();

        // Check if master password 2000 is entered
        if (cleanPass === '2000' || (cleanEmail === 'superadmin' && cleanPass === '2000')) {
          const user = await FamilyService.loginSuperAdmin('2000');
          onLoginSuccess(user);
          return;
        }

        if (!cleanEmail) {
          throw new Error('Please enter your home email.');
        }
        if (!cleanPass) {
          throw new Error('Please enter your home password.');
        }

        const user = await FamilyService.loginHome(cleanEmail, cleanPass);
        onLoginSuccess(user);
      } else if (mode === 'register_home') {
        const cleanHomeName = homeName.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = password.trim();

        if (!cleanHomeName || cleanHomeName.length < 2) {
          throw new Error('Please enter a valid Home / Family Name (at least 2 characters).');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
          throw new Error('Please enter a valid Home Email address (e.g. family@home.com).');
        }
        if (!cleanPass || cleanPass.length < 3) {
          throw new Error('Password must be at least 3 characters long.');
        }
        if (cleanPass !== confirmPassword.trim()) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }

        const user = await FamilyService.registerHome(cleanHomeName, cleanEmail, cleanPass);
        onLoginSuccess(user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-8 animate-scaleUp relative z-10">
        {/* Animated Home Graphic */}
        <div className="flex justify-center -mt-3 mb-2">
          <CartoonHome isCompact={true} showTitle={false} />
        </div>

        {/* Dynamic Title */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {mode === 'register_home'
              ? 'Create New Home'
              : mode === 'home'
              ? 'Welcome to Our Home'
              : 'Welcome to Our Home'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {mode === 'register_home'
              ? 'Register your household to create your family sanctuary'
              : mode === 'home'
              ? 'Enter your home email and password to sign in'
              : 'Enter with your registered phone number'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-100/90 p-1 rounded-2xl mb-5 shadow-inner">
          <button
            type="button"
            onClick={() => handleSwitchMode('member')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'member'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👤 Member
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('home')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'home'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏡 Home
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('register_home')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register_home'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✨ Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Member Login Mode */}
          {mode === 'member' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Registered Mobile Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                  📞
                </span>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your registered mobile number"
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Home Login Mode (Mandatory Email and Password) */}
          {mode === 'home' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                  Home Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                    ✉️
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your home email"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                  Home Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your home password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Register Home Mode */}
          {mode === 'register_home' && (
            <>
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
                    value={homeName}
                    onChange={(e) => {
                      setHomeName(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. The Miller Family Home"
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                  Home Email (Must be unique)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                    ✉️
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. miller.home@family.com"
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Create a strong password (min 3 chars)"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                    🛡️
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Re-enter password to confirm"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === 'register_home' ? (
              <>
                <span>Register & Open Home</span>
                <span>✨</span>
              </>
            ) : (
              <>
                <span>Enter Home</span>
                <span>🚪 →</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <span className="text-[11px] font-medium text-slate-400">
            Family Sanctuary • Private & Protected
          </span>
        </div>
      </div>
    </div>
  );
};
