import React, { useState } from 'react';
import { FamilyMember } from '../types/member';
import { Caricature } from './Caricature';

interface DeleteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onDelete: (id: string) => Promise<void>;
}

export const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({
  isOpen,
  onClose,
  members,
  onDelete,
}) => {
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(memberToDelete.id);
      setMemberToDelete(null);
      if (members.length <= 2) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Delete Members List Modal */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗑️</span>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Delete Member</h3>
                <p className="text-[11px] text-slate-400">Select a member to remove from Our Home</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>

          {/* Members List */}
          <div className="mt-4 space-y-2.5 overflow-y-auto flex-1 pr-1">
            {members.length <= 1 ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                <span className="text-2xl block mb-1">⚠️</span>
                <p className="text-xs font-bold text-amber-800">
                  Cannot delete the only family member!
                </p>
                <p className="text-[11px] text-amber-600 mt-1">
                  Our Home requires at least one cherished family member record.
                </p>
              </div>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/80 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {m.image_url ? (
                        <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <Caricature type={m.caricature_key} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{m.name}</h4>
                      <p className="text-[11px] text-slate-500">{m.role || 'Family Member'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMemberToDelete(m)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Validation Confirmation Popup Before Delete */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h4 className="text-base font-extrabold text-slate-900">
              Do you want to proceed?
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Do you want to proced? This will remove <span className="font-bold text-rose-600">"{memberToDelete.name}"</span> from the database.
            </p>

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
