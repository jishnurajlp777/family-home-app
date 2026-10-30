import React from 'react';
import { FamilyMember } from '../types/member';

interface FamilyDropdownProps {
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onOpenManageModal: () => void;
  isElevated?: boolean;
}

export const FamilyDropdown: React.FC<FamilyDropdownProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenManageModal,
  isElevated = false,
}) => {
  return (
    <div
      className={`transition-all duration-500 ease-out flex flex-col items-center justify-center my-3 ${
        isElevated ? '-translate-y-2 mb-1' : ''
      }`}
    >
      <div className="w-full max-w-[280px] sm:max-w-[310px] flex flex-col gap-1.5">
        <label htmlFor="familySelect" className="text-xs font-bold text-slate-600 flex items-center justify-between px-1">
          <span>Family Member</span>
          <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            {members.length} records
          </span>
        </label>

        <div className="relative flex items-center">
          <select
            id="familySelect"
            value={selectedMemberId || ''}
            onChange={(e) => onSelectMember(e.target.value)}
            className="w-full appearance-none bg-slate-50 text-slate-800 border-2 border-slate-300 focus:border-indigo-600 hover:border-slate-400 rounded-xl py-3 pl-4 pr-10 text-sm font-semibold shadow-sm transition-all outline-none cursor-pointer focus:ring-4 focus:ring-indigo-100"
          >
            <option value="" disabled>
              — Select a family member —
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Custom Arrow */}
          <div className="pointer-events-none absolute right-3.5 flex items-center text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Single Action Button: Add / Edit / Remove */}
        <div className="flex items-center justify-center mt-3">
          <button
            type="button"
            onClick={onOpenManageModal}
            className="inline-flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold py-2 px-4 rounded-xl shadow-xs transition-all hover:shadow-sm active:scale-98"
          >
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Manage Family (Add / Edit / Remove)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
