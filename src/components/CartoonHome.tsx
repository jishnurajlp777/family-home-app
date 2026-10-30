import React, { useState } from 'react';

interface CartoonHomeProps {
  isCompact?: boolean;
  showTitle?: boolean;
}

export const CartoonHome: React.FC<CartoonHomeProps> = ({ isCompact = false, showTitle = true }) => {
  const [rotation, setRotation] = useState(0);

  const handleSpin = () => {
    setRotation((prev) => prev + 360);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-500 mb-2 ${
        isCompact ? 'scale-90 opacity-90 -mb-2' : ''
      }`}
    >
      {/* Clickable rotatable Home Container */}
      <div
        onClick={handleSpin}
        className="relative w-36 h-30 sm:w-44 sm:h-36 flex items-center justify-center cursor-pointer select-none group"
      >
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="w-full h-full flex items-center justify-center animate-float group-hover:scale-105 transition-transform"
        >
          <svg viewBox="0 0 200 170" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Chimney Smoke */}
            <circle cx="148" cy="18" r="6" fill="#cbd5e1" className="smoke-1" />
            <circle cx="152" cy="10" r="7" fill="#cbd5e1" className="smoke-2" />
            <circle cx="156" cy="3" r="8" fill="#e2e8f0" className="smoke-3" />

            {/* Chimney */}
            <rect x="140" y="24" width="16" height="26" rx="2" fill="#e11d48" stroke="#9f1239" strokeWidth="2.5" />
            <rect x="137" y="22" width="22" height="6" rx="2" fill="#be123c" />

            {/* Roof */}
            <polygon points="100,20 18,78 182,78" fill="#f97316" stroke="#c2410c" strokeWidth="3" strokeLinejoin="round" />
            <path d="M50 60 Q 60 52 70 60 Q 80 52 90 60 Q 100 52 110 60 Q 120 52 130 60 Q 140 52 150 60" stroke="#fb923c" strokeWidth="2.5" fill="none" />
            <path d="M70 42 Q 80 34 90 42 Q 100 34 110 42 Q 120 34 130 42" stroke="#fb923c" strokeWidth="2.5" fill="none" />

            {/* Attic Window */}
            <circle cx="100" cy="54" r="10" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
            <line x1="100" y1="44" x2="100" y2="64" stroke="#ca8a04" strokeWidth="1.5" />
            <line x1="90" y1="54" x2="110" y2="54" stroke="#ca8a04" strokeWidth="1.5" />

            {/* Base Wall */}
            <rect x="36" y="76" width="128" height="74" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />

            {/* Left Window */}
            <rect x="48" y="90" width="26" height="26" rx="4" fill="#67e8f9" stroke="#0891b2" strokeWidth="2" />
            <line x1="61" y1="90" x2="61" y2="116" stroke="#0891b2" strokeWidth="2" />
            <line x1="48" y1="103" x2="74" y2="103" stroke="#0891b2" strokeWidth="2" />
            <path d="M 46 88 L 76 88" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />

            {/* Right Window */}
            <rect x="126" y="90" width="26" height="26" rx="4" fill="#67e8f9" stroke="#0891b2" strokeWidth="2" />
            <line x1="139" y1="90" x2="139" y2="116" stroke="#0891b2" strokeWidth="2" />
            <line x1="126" y1="103" x2="152" y2="103" stroke="#0891b2" strokeWidth="2" />
            <path d="M 124 88 L 154 88" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />

            {/* Front Door */}
            <path d="M 87 150 L 87 98 A 13 13 0 0 1 113 98 L 113 150 Z" fill="#84cc16" stroke="#4d7c0f" strokeWidth="2.5" />
            <circle cx="93" cy="124" r="2.5" fill="#facc15" stroke="#a16207" strokeWidth="1" />
            <rect x="81" y="147" width="38" height="5" rx="2" fill="#a16207" />

            {/* Bushes & Flowers */}
            <ellipse cx="28" cy="149" rx="14" ry="7" fill="#4ade80" />
            <ellipse cx="36" cy="147" rx="10" ry="8" fill="#22c55e" />
            <ellipse cx="172" cy="149" rx="14" ry="7" fill="#4ade80" />
            <ellipse cx="164" cy="147" rx="10" ry="8" fill="#22c55e" />
            <circle cx="24" cy="143" r="3" fill="#f43f5e" />
            <circle cx="24" cy="143" r="1.2" fill="#fde047" />
            <circle cx="176" cy="143" r="3" fill="#ec4899" />
            <circle cx="176" cy="143" r="1.2" fill="#fde047" />
          </svg>
        </div>
      </div>

      {/* Title */}
      {showTitle && (
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight mt-1 text-center">
          Our Home
        </h1>
      )}
    </div>
  );
};
