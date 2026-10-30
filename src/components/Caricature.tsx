import React from 'react';
import { CaricatureType } from '../types/member';

interface CaricatureProps {
  type: CaricatureType;
  className?: string;
}

export const Caricature: React.FC<CaricatureProps> = ({ type, className = 'w-full h-full drop-shadow' }) => {
  switch (type) {
    case 'jishnu':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="52" r="28" fill="#fbcfe8" />
          <ellipse cx="50" cy="54" rx="26" ry="27" fill="#fed7aa" />
          <path d="M 23 48 C 22 28, 42 20, 52 20 C 68 20, 78 28, 77 48 C 72 40, 68 34, 52 35 C 38 35, 30 42, 23 48 Z" fill="#1e293b" />
          <path d="M 44 20 Q 55 12 66 22" fill="#1e293b" />
          <rect x="33" y="47" width="14" height="11" rx="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
          <rect x="53" y="47" width="14" height="11" rx="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
          <line x1="47" y1="52" x2="53" y2="52" stroke="#0284c7" strokeWidth="2" />
          <circle cx="40" cy="52" r="2.2" fill="#0f172a" />
          <circle cx="60" cy="52" r="2.2" fill="#0f172a" />
          <path d="M 43 65 Q 50 71 57 65" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="62" r="3" fill="#fda4af" opacity="0.6" />
          <circle cx="66" cy="62" r="3" fill="#fda4af" opacity="0.6" />
          <path d="M 24 88 C 30 76, 70 76, 76 88 L 78 98 L 22 98 Z" fill="#3b82f6" />
        </svg>
      );
    case 'ashna':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path d="M 20 44 C 18 82, 30 88, 30 92 L 70 92 C 70 88, 82 82, 80 44 Z" fill="#451a03" />
          <ellipse cx="50" cy="53" rx="25" ry="26" fill="#fde68a" />
          <path d="M 24 45 C 28 26, 44 22, 50 22 C 64 22, 74 28, 76 46 C 70 34, 58 32, 50 36 C 42 32, 30 35, 24 45 Z" fill="#451a03" />
          <circle cx="68" cy="34" r="4.5" fill="#f43f5e" />
          <circle cx="68" cy="34" r="1.8" fill="#fef08a" />
          <circle cx="40" cy="51" r="2.8" fill="#1c1917" />
          <circle cx="60" cy="51" r="2.8" fill="#1c1917" />
          <path d="M 37 47 L 41 49" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 63 47 L 59 49" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 44 64 Q 50 69 56 64" stroke="#db2777" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="33" cy="59" r="4" fill="#fb7185" opacity="0.65" />
          <circle cx="67" cy="59" r="4" fill="#fb7185" opacity="0.65" />
          <path d="M 26 88 C 32 76, 68 76, 74 88 L 76 98 L 24 98 Z" fill="#ec4899" />
        </svg>
      );
    case 'raju':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <ellipse cx="50" cy="52" rx="27" ry="28" fill="#fed7aa" />
          <path d="M 22 45 C 22 25, 42 19, 50 19 C 68 19, 78 28, 77 46 C 70 32, 55 28, 42 30 C 30 32, 25 38, 22 45 Z" fill="#334155" />
          <path d="M 34 44 Q 41 42 45 44" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 55 44 Q 59 42 66 44" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="40" cy="49" r="2.5" fill="#0f172a" />
          <circle cx="60" cy="49" r="2.5" fill="#0f172a" />
          <path d="M 39 63 Q 50 60 50 65 Q 50 60 61 63 Q 50 70 39 63 Z" fill="#1e293b" />
          <path d="M 44 68 Q 50 72 56 68" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 23 88 C 29 76, 71 76, 77 88 L 78 98 L 22 98 Z" fill="#059669" />
          <polygon points="50,78 44,87 56,87" fill="#ffffff" />
        </svg>
      );
    case 'lalitha':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="22" r="14" fill="#1c1917" />
          <ellipse cx="50" cy="54" rx="26" ry="27" fill="#fed7aa" />
          <path d="M 23 48 C 24 28, 40 25, 50 25 C 60 25, 76 28, 77 48 C 72 36, 62 34, 50 36 C 38 34, 28 36, 23 48 Z" fill="#1c1917" />
          <circle cx="50" cy="43" r="2.4" fill="#dc2626" />
          <circle cx="39" cy="51" r="2.4" fill="#0f172a" />
          <circle cx="61" cy="51" r="2.4" fill="#0f172a" />
          <path d="M 33 46 Q 39 44 44 47" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 56 47 Q 61 44 67 46" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="23" cy="56" r="2.5" fill="#eab308" />
          <circle cx="77" cy="56" r="2.5" fill="#eab308" />
          <path d="M 43 65 Q 50 71 57 65" stroke="#b91c1c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 23 88 C 29 76, 71 76, 77 88 L 78 98 L 22 98 Z" fill="#ea580c" />
          <path d="M 42 78 L 74 98" stroke="#facc15" strokeWidth="3" />
        </svg>
      );
    case 'girl':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="20" cy="45" r="9" fill="#78350f" />
          <circle cx="80" cy="45" r="9" fill="#78350f" />
          <ellipse cx="50" cy="54" rx="26" ry="26" fill="#fbcfe8" />
          <path d="M 24 45 C 28 26, 44 22, 50 22 C 64 22, 74 28, 76 46 C 70 34, 50 32, 24 45 Z" fill="#78350f" />
          <circle cx="41" cy="53" r="2.5" fill="#1e293b" />
          <circle cx="59" cy="53" r="2.5" fill="#1e293b" />
          <path d="M 44 65 Q 50 70 56 65" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="61" r="3.5" fill="#f43f5e" opacity="0.5" />
          <circle cx="66" cy="61" r="3.5" fill="#f43f5e" opacity="0.5" />
          <path d="M 26 88 C 32 76, 68 76, 74 88 L 76 98 L 24 98 Z" fill="#8b5cf6" />
        </svg>
      );
    case 'elder':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <ellipse cx="50" cy="54" rx="26" ry="27" fill="#fed7aa" />
          <path d="M 22 48 C 22 28, 42 22, 50 22 C 68 22, 78 28, 78 48 C 72 36, 60 34, 50 34 C 40 34, 28 36, 22 48 Z" fill="#94a3b8" />
          <rect x="33" y="48" width="13" height="10" rx="3" fill="#f1f5f9" stroke="#475569" strokeWidth="1.8" />
          <rect x="54" y="48" width="13" height="10" rx="3" fill="#f1f5f9" stroke="#475569" strokeWidth="1.8" />
          <line x1="46" y1="53" x2="54" y2="53" stroke="#475569" strokeWidth="1.8" />
          <circle cx="39.5" cy="53" r="1.8" fill="#1e293b" />
          <circle cx="60.5" cy="53" r="1.8" fill="#1e293b" />
          <path d="M 43 67 Q 50 72 57 67" stroke="#9a3412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M 24 88 C 30 76, 70 76, 76 88 L 78 98 L 22 98 Z" fill="#0d9488" />
        </svg>
      );
    case 'pet':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path d="M 22 30 C 15 45, 18 62, 28 55 Z" fill="#78350f" />
          <path d="M 78 30 C 85 45, 82 62, 72 55 Z" fill="#78350f" />
          <circle cx="50" cy="54" r="27" fill="#d97706" />
          <ellipse cx="50" cy="62" rx="16" ry="12" fill="#fef3c7" />
          <circle cx="40" cy="48" r="4" fill="#1e293b" />
          <circle cx="41.5" cy="46.5" r="1.4" fill="#ffffff" />
          <circle cx="60" cy="48" r="4" fill="#1e293b" />
          <circle cx="61.5" cy="46.5" r="1.4" fill="#ffffff" />
          <ellipse cx="50" cy="58" rx="4.5" ry="3.5" fill="#1e293b" />
          <path d="M 50 61.5 L 50 67" stroke="#1e293b" strokeWidth="1.5" />
          <path d="M 47 67 Q 50 73 53 67" stroke="#1e293b" strokeWidth="1.5" fill="none" />
          <path d="M 48 68 Q 50 76 52 68 Z" fill="#f43f5e" />
          <path d="M 32 82 C 40 86, 60 86, 68 82" stroke="#dc2626" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="85" r="3" fill="#facc15" />
        </svg>
      );
    case 'boy':
    default:
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="54" r="26" fill="#fde68a" />
          <path d="M 23 46 C 24 24, 44 20, 52 20 C 66 20, 77 26, 77 46 C 70 36, 60 32, 50 34 C 40 32, 30 36, 23 46 Z" fill="#b45309" />
          <circle cx="41" cy="52" r="2.5" fill="#0f172a" />
          <circle cx="59" cy="52" r="2.5" fill="#0f172a" />
          <path d="M 44 65 Q 50 71 56 65" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="61" r="3.5" fill="#f87171" opacity="0.5" />
          <circle cx="66" cy="61" r="3.5" fill="#f87171" opacity="0.5" />
          <path d="M 25 88 C 30 76, 70 76, 75 88 L 76 98 L 24 98 Z" fill="#0284c7" />
        </svg>
      );
  }
};
