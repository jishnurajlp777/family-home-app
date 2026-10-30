import React, { useState } from 'react';
import { FamilyMember, TabType } from '../types/member';
import { Caricature } from './Caricature';

interface MemberProfileCardProps {
  member: FamilyMember;
  onClose: () => void;
  onQuickEdit: (member: FamilyMember) => void;
}

export const MemberProfileCard: React.FC<MemberProfileCardProps> = ({
  member,
  onClose,
  onQuickEdit,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  return (
    <div className="transition-all duration-500 ease-out mt-3 pt-3 border-t border-slate-200 animate-fadeIn">
      {/* Header Tabs & Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'room'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            My Room
          </button>
          <button
            onClick={() => setActiveTab('note')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'note'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Family Note
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onQuickEdit(member)}
            title="Edit this member"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors font-bold"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </button>

          <button
            onClick={onClose}
            title="Close profile view"
            className="text-xs text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab 1: Profile & Caricature */}
      {activeTab === 'profile' && (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-inner">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl bg-gradient-to-tr from-amber-100 via-rose-50 to-indigo-100 p-2 flex items-center justify-center border-2 border-indigo-200 shadow-sm">
            <Caricature type={member.caricature_key} />
          </div>

          <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
            <span className="inline-block px-2.5 py-0.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-800 w-fit self-center sm:self-start">
              Family Spotlight
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Hi, I am "{member.name}"
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{member.bio}</p>
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
              {member.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-2xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Room */}
      {activeTab === 'room' && (
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <span>🛋️</span> <span>{member.room_title || `${member.name}'s Cozy Corner`}</span>
          </h3>
          <p>{member.room_desc || 'Decorated with warm ambient lights, favorite books, and souvenirs.'}</p>
          <div className="mt-2 text-[11px] bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2 shadow-xs">
            <span className="text-lg">✨</span>
            <span>{member.room_status || 'Always keeps the room tidy and ready for fun conversations!'}</span>
          </div>
        </div>
      )}

      {/* Tab 3: Family Note */}
      {activeTab === 'note' && (
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <span>📝</span> <span>Family Motto</span>
          </h3>
          <blockquote className="italic border-l-4 border-indigo-500 pl-3 text-slate-700 py-1 font-medium">
            "{member.quote || 'Family is where love begins and never ends.'}"
          </blockquote>
        </div>
      )}
    </div>
  );
};
