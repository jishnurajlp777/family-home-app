import React, { useState, useEffect, useCallback } from 'react';
import { FamilyMember, NewMemberInput, AuthUser } from './types/member';
import { FamilyService } from './services/api';
import { HomePage } from './components/HomePage';
import { MemberPage } from './components/MemberPage';
import { AddMemberModal } from './components/AddMemberModal';
import { EditProfileModal } from './components/EditProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { Toast } from './components/Toast';

export const App: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(FamilyService.getCurrentUser());
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [pendingCardDeleteMember, setPendingCardDeleteMember] = useState<FamilyMember | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const refreshMembers = useCallback(async () => {
    try {
      const data = await FamilyService.getAll();
      setMembers(data);
    } catch {
      showToast('Failed to load family members', 'error');
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    const initApp = async () => {
      await FamilyService.checkConnection();
      await refreshMembers();

      // Read initial hash from URL if authenticated
      const hash = window.location.hash;
      if (hash.startsWith('#member/')) {
        const id = hash.replace('#member/', '');
        const user = FamilyService.getCurrentUser();
        if (user && (user.role === 'admin' || user.memberId === id)) {
          setActiveMemberId(id);
        }
      }
    };
    initApp();

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#member/')) {
        const id = hash.replace('#member/', '');
        const user = FamilyService.getCurrentUser();
        if (user && (user.role === 'admin' || user.memberId === id)) {
          setActiveMemberId(id);
        }
      } else {
        setActiveMemberId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [refreshMembers]);

  // Navigation handlers
  const handleOpenMemberPage = (id: string) => {
    if (currentUser?.role === 'member' && id !== currentUser.memberId) {
      showToast('Restricted: You can only view your own details. Log in as Admin (2000) to view all profiles.', 'error');
      return;
    }
    setActiveMemberId(id);
    window.location.hash = `member/${id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setActiveMemberId(null);
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMember(null);
  };

  const handleAddMember = async (input: NewMemberInput) => {
    try {
      const created = await FamilyService.create(input);
      showToast(`Added "${created.name}" to Our Home!`);
      await refreshMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding member';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleUpdateMemberDetails = async (id: string, updates: Partial<FamilyMember>) => {
    try {
      const updated = await FamilyService.update(id, updates);
      await refreshMembers();
      if (editingMember && editingMember.id === id) {
        setEditingMember(updated);
      }
      if (currentUser && currentUser.memberId === id) {
        const updatedAuth: AuthUser = {
          ...currentUser,
          name: updated.name,
          mobile_number: updated.mobile_number,
          member: updated,
        };
        setCurrentUser(updatedAuth);
        FamilyService.setCurrentUser(updatedAuth);
      }
      showToast('Profile & mobile updated successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating profile';
      showToast(msg, 'error');
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const result = await FamilyService.delete(id);
      if (activeMemberId === id) {
        handleBackToHome();
      }
      setPendingCardDeleteMember(null);
      await refreshMembers();
      showToast(result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting member';
      showToast(msg, 'error');
    }
  };

  const handleLogin = async (mobileNumber: string) => {
    try {
      const user = await FamilyService.login(mobileNumber);
      setCurrentUser(user);
      showToast(
        user.role === 'admin'
          ? 'Logged in as Admin (Full Access)'
          : `Welcome back, ${user.name}!`
      );

      // If a member logs in, route them to their personal profile or home
      if (user.role === 'member' && user.memberId) {
        handleOpenMemberPage(user.memberId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleLogout = () => {
    FamilyService.logout();
    setCurrentUser(null);
    setActiveMemberId(null);
    window.location.hash = '';
    showToast('Logged out of Our Home');
  };

  // If user is not logged in, gate on LoginScreen
  if (!currentUser) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-sky-50 to-indigo-50 min-h-screen text-slate-800 font-sans">
        {/* Toast Container */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <Toast message={toast?.message ?? null} type={toast?.type} />
        </div>
        <LoginScreen members={members} onLogin={handleLogin} />
      </div>
    );
  }

  const currentMember = members.find((m) => m.id === activeMemberId) || null;

  return (
    <div className="bg-gradient-to-br from-amber-50 via-sky-50 to-indigo-50 min-h-screen text-slate-800 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Toast Notification Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <Toast message={toast?.message ?? null} type={toast?.type} />
      </div>

      {/* Conditional Multi-Page Rendering */}
      {currentMember ? (
        /* Dedicated Member Profile Page (Edit Profile option only, no add or delete, no motto) */
        <MemberPage
          member={currentMember}
          allMembers={members}
          onBackToHome={handleBackToHome}
          onSelectMember={handleOpenMemberPage}
          onQuickEdit={handleOpenEditModal}
          onUpdateMember={handleUpdateMemberDetails}
          currentUser={currentUser}
        />
      ) : (
        /* Home Page with Admin/Member access, Live Map, and Family Gallery */
        <HomePage
          members={members}
          currentUser={currentUser}
          onSelectMember={handleOpenMemberPage}
          onOpenAddMember={() => setIsAddModalOpen(true)}
          onRequestDeleteMember={(m) => setPendingCardDeleteMember(m)}
          onOpenEditMember={(m) => handleOpenEditModal(m)}
          onLogout={handleLogout}
          onShowToast={showToast}
          onRefresh={refreshMembers}
        />
      )}

      {/* Home Page: Add Member Modal (Mandatory Mobile Number, Admin only) */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMember}
      />

      {/* Validation Confirmation Popup: "Do you want to proceed?" with OK and Cancel */}
      {pendingCardDeleteMember && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fadeIn">
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
              Do you want to proceed? This will remove <span className="font-bold text-rose-600">"{pendingCardDeleteMember.name}"</span> from the database.
            </p>

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setPendingCardDeleteMember(null)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMember(pendingCardDeleteMember.id)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition active:scale-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Page: Edit Profile Modal (Inside profile page only) */}
      {editingMember && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          member={editingMember}
          onSave={handleUpdateMemberDetails}
        />
      )}
    </div>
  );
};

export default App;
