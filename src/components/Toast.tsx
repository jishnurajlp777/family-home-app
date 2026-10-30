import React from 'react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div
      className={`text-center text-xs py-2 px-3 rounded-xl mx-auto mb-2 max-w-xs font-semibold shadow-xs transition-opacity duration-300 animate-fadeIn ${
        type === 'error'
          ? 'bg-rose-100 text-rose-800 border border-rose-200'
          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      }`}
    >
      {message}
    </div>
  );
};
