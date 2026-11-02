import React, { useState, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { FamilyMember, NewMemberInput, AuthUser, Home, ActiveCall } from './types/member';
import { FamilyService } from './services/api';
import { HomePage } from './components/HomePage';
import { MemberPage } from './components/MemberPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { SuperAdminHomeAuditView } from './components/SuperAdminHomeAuditView';
import { AddMemberModal } from './components/AddMemberModal';
import { EditProfileModal } from './components/EditProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { Toast } from './components/Toast';
import { FamilyCallingModal } from './components/FamilyCallingModal';

export const App: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(FamilyService.getCurrentUser());
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [selectedAuditHome, setSelectedAuditHome] = useState<Home | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [pendingCardDeleteMember, setPendingCardDeleteMember] = useState<FamilyMember | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const refreshMembers = useCallback(async () => {
    try {
      const activeUser = FamilyService.getCurrentUser();
      if (!activeUser || (!activeUser.homeId && activeUser.role !== 'super_admin')) {
        setMembers([]);
        return;
      }
      const data = await FamilyService.getAll(activeUser.homeId);
      setMembers(FamilyService.deduplicateMembers(data));
    } catch {
      showToast('Failed to load family members', 'error');
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    const initApp = async () => {
      await FamilyService.checkConnection();
      const activeUser = FamilyService.getCurrentUser();
      if (activeUser && activeUser.homeId) {
        await refreshMembers();
      } else {
        setMembers([]);
      }

      // Read initial hash from URL if authenticated
      const hash = window.location.hash;
      if (hash.startsWith('#member/')) {
        const id = hash.replace('#member/', '');
        if (activeUser && (activeUser.role === 'admin' || activeUser.memberId === id)) {
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

  // Real-time synchronization loop across devices and apps
  useEffect(() => {
    const syncTimer = setInterval(async () => {
      try {
        const auth = FamilyService.getCurrentUser();
        if (!auth || (!auth.homeId && auth.role !== 'super_admin')) return;

        const latest = await FamilyService.getAll(auth.homeId);
        const deduplicated = FamilyService.deduplicateMembers(latest);
        setMembers((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(deduplicated)) {
            return deduplicated;
          }
          return prev;
        });

        // Sync active user if their profile was updated elsewhere
        if (auth && auth.role === 'member') {
          const me = deduplicated.find((m) => m.id === auth.memberId || m.mobile_number === auth.mobile_number);
          if (me && (me.name !== auth.name || me.mobile_number !== auth.mobile_number)) {
            const updatedAuth: AuthUser = {
              ...auth,
              name: me.name,
              mobile_number: me.mobile_number,
              member: me,
            };
            FamilyService.setCurrentUser(updatedAuth);
            setCurrentUser(updatedAuth);
          }
        }

        // Real-Time Internet Calling check
        const call = await FamilyService.getActiveCall();
        if (call && call.status !== 'ended') {
          const myId = auth.memberId || (auth.role === 'admin' ? 'admin' : 'member');
          const isTarget = call.target_id === 'all' || call.target_id === myId || call.caller_id === myId;
          if (isTarget) {
            setActiveCall(call);
            // If caller or callee ringing, automatically open modal
            if (call.status === 'ringing') {
              setIsCallModalOpen(true);
            }
          }
        } else {
          setActiveCall((prev) => {
            if (prev && prev.status !== 'ended') {
              setIsCallModalOpen(false);
              return null;
            }
            return prev;
          });
        }
      } catch {}
    }, 2500);

    const handleStorageChange = () => {
      refreshMembers();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncTimer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshMembers]);

  // Live Automatic GPS Location Sharing for logged-in members
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'member' || !currentUser.memberId) {
      return;
    }

    const memberId = currentUser.memberId;
    let watchId: number | null = null;
    let lastCoords = { lat: 0, lng: 0, time: 0 };

    const pushLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      // Throttle updates: send if moved > 0.0001 deg (~10m) or 20 seconds elapsed
      const dist = Math.hypot(lat - lastCoords.lat, lng - lastCoords.lng);
      if (dist < 0.0001 && now - lastCoords.time < 20000) {
        return;
      }
      lastCoords = { lat, lng, time: now };

      try {
        const newLocation = {
          name: 'Live Location',
          address: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
          lat,
          lng,
          updated_at: 'Just now',
          status: 'Active on map',
        };
        await FamilyService.update(memberId, { location: newLocation });
        FamilyService.recordLocationUsage(memberId).catch(() => {});
      } catch {}
    };

    if ('geolocation' in navigator) {
      // 1. Immediate position capture on login
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          pushLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      // 2. Continuous watchPosition
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          pushLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    }

    // 3. Periodic fallback timer ensuring updates keep broadcasting even if stationary or minimized
    const heartbeatTimer = setInterval(() => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            pushLocation(pos.coords.latitude, pos.coords.longitude);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
        );
      }
    }, 20000);

    // 4. Capacitor App State Listener: app minimizing does not stop location sharing
    let appStateListener: any = null;
    try {
      appStateListener = CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                pushLocation(pos.coords.latitude, pos.coords.longitude);
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          }
        }
      });
    } catch {}

    // Cleanup: Automatically stop location sharing on logout
    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(heartbeatTimer);
      if (appStateListener && typeof appStateListener.remove === 'function') {
        appStateListener.remove();
      }
    };
  }, [currentUser?.memberId, currentUser?.role]);

  // Capacitor Android Back Button & Exit App Confirmation
  useEffect(() => {
    let backListener: any = null;
    try {
      backListener = CapApp.addListener('backButton', () => {
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
          return;
        }
        if (isEditModalOpen) {
          handleCloseEditModal();
          return;
        }
        if (pendingCardDeleteMember) {
          setPendingCardDeleteMember(null);
          return;
        }
        if (activeMemberId) {
          handleBackToHome();
          return;
        }
        // At Home Root -> ask "Do you want to close the app?"
        setShowExitConfirm(true);
      });
    } catch {
      // Non-Capacitor environment (standard web browser)
    }

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [isAddModalOpen, isEditModalOpen, pendingCardDeleteMember, activeMemberId]);

  // Navigation handlers
  const handleOpenMemberPage = (id: string) => {
    if (currentUser?.role === 'member' && id !== currentUser.memberId) {
      showToast('Restricted: You can only view your own details. Contact your home.', 'error');
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
      await FamilyService.create(input);
      await refreshMembers();
      showToast(`Welcome ${input.name} to our family home!`, 'success');
      setIsAddModalOpen(false);
    } catch {
      showToast('Failed to add family member', 'error');
    }
  };

  const handleUpdateMemberDetails = async (id: string, updates: Partial<FamilyMember>) => {
    try {
      await FamilyService.update(id, updates);
      await refreshMembers();

      // If user updated their own profile, sync active session immediately
      if (currentUser && currentUser.memberId === id) {
        const updated = {
          ...currentUser,
          name: updates.name || currentUser.name,
          mobile_number: updates.mobile_number !== undefined ? updates.mobile_number : currentUser.mobile_number,
        };
        FamilyService.setCurrentUser(updated);
        setCurrentUser(updated);
      }

      showToast('Profile updated successfully!', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await FamilyService.delete(id);
      await refreshMembers();
      if (activeMemberId === id) {
        handleBackToHome();
      }
      showToast('Member removed successfully.', 'success');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Could not delete member.', 'error');
    } finally {
      setPendingCardDeleteMember(null);
    }
  };

  const handleUpdateLocation = async (lat: number, lng: number, placeName?: string) => {
    if (!currentUser) return;
    try {
      const targetId = currentUser.role === 'member'
        ? currentUser.memberId
        : (activeMemberId || members[0]?.id);

      if (!targetId) {
        showToast('Please add a family member first to bind GPS location.', 'error');
        return;
      }

      const newLocation = {
        name: placeName || 'Live Location',
        address: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        lat,
        lng,
        updated_at: 'Just now',
        status: 'Active on map',
      };

      await FamilyService.update(targetId, { location: newLocation });
      await refreshMembers();
      showToast('📍 Live GPS location shared on family map!', 'success');
    } catch {
      showToast('Could not save live location.', 'error');
    }
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role !== 'super_admin' && user.homeId) {
      const data = await FamilyService.getAll(user.homeId);
      setMembers(FamilyService.deduplicateMembers(data));
    } else {
      setMembers([]);
    }
    showToast(`Welcome ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    FamilyService.logout();
    setCurrentUser(null);
    setMembers([]);
    setActiveMemberId(null);
    setSelectedAuditHome(null);
    setActiveCall(null);
    setIsCallModalOpen(false);
    window.location.hash = '';
    showToast('Logged out successfully.', 'success');
  };

  const handleTriggerCall = async (targetId: string = 'all') => {
    try {
      const call = await FamilyService.startCall(targetId);
      setActiveCall(call);
      setIsCallModalOpen(true);
      showToast('📞 Initiating internet call...', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not start call.', 'error');
    }
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        {toast && <Toast message={toast.message} type={toast.type} />}
      </>
    );
  }

  // Super Admin Platform View
  if (currentUser.role === 'super_admin') {
    if (selectedAuditHome) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
          {toast && <Toast message={toast.message} type={toast.type} />}
          <SuperAdminHomeAuditView
            home={selectedAuditHome}
            onBack={() => setSelectedAuditHome(null)}
            onShowToast={showToast}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
        {toast && <Toast message={toast.message} type={toast.type} />}
        <SuperAdminDashboard
          onLogout={handleLogout}
          onShowToast={showToast}
          onEnterHomeAudit={(home) => setSelectedAuditHome(home)}
        />
      </div>
    );
  }

  const activeMember = members.find((m) => m.id === activeMemberId) || null;

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Main View: Member Profile or Home Dashboard */}
      {activeMember ? (
        <MemberPage
          member={activeMember}
          allMembers={members}
          onBackToHome={handleBackToHome}
          onSelectMember={handleOpenMemberPage}
          onQuickEdit={handleOpenEditModal}
          onUpdateMember={handleUpdateMemberDetails}
          currentUser={currentUser}
          onShowToast={showToast}
        />
      ) : (
        <HomePage
          members={members}
          currentUser={currentUser}
          onSelectMember={handleOpenMemberPage}
          onOpenAddMember={() => setIsAddModalOpen(true)}
          onRequestDeleteMember={(m) => setPendingCardDeleteMember(m)}
          onOpenEditMember={handleOpenEditModal}
          onLogout={handleLogout}
          onShowToast={showToast}
          onRefresh={refreshMembers}
          onUpdateLocation={handleUpdateLocation}
          onTriggerCall={handleTriggerCall}
          activeCall={activeCall}
        />
      )}

      {/* Modal: Add Member (Admin Only) */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingMembers={members}
        onAdd={handleAddMember}
      />

      {/* Confirmation Popup: Delete Member */}
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
              This will remove <span className="font-bold text-rose-600">"{pendingCardDeleteMember.name}"</span> from the family records.
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

      {/* Mobile App Exit Confirmation Popup */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-inner text-2xl">
              🚪
            </div>
            <h4 className="text-base font-extrabold text-slate-900">
              Do you want to close the app?
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your login session will be kept safe when you reopen.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  try {
                    CapApp.exitApp();
                  } catch {
                    window.close();
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition active:scale-95"
              >
                Close App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Page: Edit Profile Modal */}
      {editingMember && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          member={editingMember}
          allMembers={members}
          onSave={handleUpdateMemberDetails}
        />
      )}

      {/* Real-time Internet Calling Modal */}
      {currentUser && (
        <FamilyCallingModal
          currentUser={currentUser}
          homeMembers={members}
          activeCall={activeCall}
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          onCallEnded={() => {
            setActiveCall(null);
            setIsCallModalOpen(false);
          }}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};

export default App;
