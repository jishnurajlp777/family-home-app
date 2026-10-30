import React, { useState } from 'react';
import { FamilyMember } from '../types/member';
import { CartoonHome } from './CartoonHome';

interface LoginScreenProps {
  members?: FamilyMember[];
  onLogin: (mobileNumber: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber.trim()) {
      setError('Please enter a mobile number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onLogin(mobileNumber.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid mobile number.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-sky-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 animate-scaleUp">
        {/* Animated Home Graphic (without "Our Home" label) */}
        <div className="flex justify-center -mt-2 mb-2">
          <CartoonHome isCompact={true} showTitle={false} />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Welcome to Our Home
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">
                📞
              </span>
              <input
                type="text"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  setError(null);
                }}
                placeholder="Enter mobile number"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold outline-none transition"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <span>Enter Our Home</span>
                <span>🚪 →</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
