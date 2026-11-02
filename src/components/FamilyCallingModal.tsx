import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveCall, FamilyMember, AuthUser } from '../types/member';
import { FamilyService } from '../services/api';
import { Caricature } from './Caricature';

interface FamilyCallingModalProps {
  currentUser: AuthUser;
  homeMembers: FamilyMember[];
  activeCall: ActiveCall | null;
  isOpen: boolean;
  onClose: () => void;
  onCallEnded: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

// In-App Web Audio Synthesizer for reliable ringtones and chimes without external audio files
class CallAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringTimer: any = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Caller tone (Standard gentle ringback beep beep)
  public startOutgoingRingtone(): void {
    this.stop();
    this.isRinging = true;
    const playBeep = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch {}
    };

    playBeep();
    this.ringTimer = setInterval(playBeep, 3500);
  }

  // Callee incoming ring (Cheerful melodic chime)
  public startIncomingRingtone(): void {
    this.stop();
    this.isRinging = true;
    const playChime = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const now = ctx.currentTime + idx * 0.18;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.35);
        });
      } catch {}
    };

    playChime();
    this.ringTimer = setInterval(playChime, 3000);
  }

  public stop(): void {
    this.isRinging = false;
    if (this.ringTimer) {
      clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
  }
}

const audioSynth = new CallAudioSynthesizer();

export const FamilyCallingModal: React.FC<FamilyCallingModalProps> = ({
  currentUser,
  homeMembers,
  activeCall,
  isOpen,
  onClose,
  onCallEnded,
  onShowToast,
}) => {
  const [callSession, setCallSession] = useState<ActiveCall | null>(activeCall);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isRepeatingCall, setIsRepeatingCall] = useState<boolean>(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const signalPollTimerRef = useRef<any>(null);
  const lastSignalTimeRef = useRef<number>(Date.now());
  const durationTimerRef = useRef<any>(null);

  const currentUserId = currentUser.memberId || (currentUser.role === 'admin' ? 'admin' : 'member');
  const isCaller = callSession ? callSession.caller_id === currentUserId : false;
  const isJoined = callSession
    ? callSession.participants.some((p) => p.id === currentUserId)
    : false;

  useEffect(() => {
    setCallSession(activeCall);
  }, [activeCall]);

  // Handle ringtones based on call status
  useEffect(() => {
    if (!isOpen || !callSession || callSession.status === 'ended') {
      audioSynth.stop();
      return;
    }

    if (callSession.status === 'ringing') {
      if (isCaller) {
        audioSynth.startOutgoingRingtone();
      } else if (!isJoined) {
        audioSynth.startIncomingRingtone();
      }
    } else {
      audioSynth.stop();
    }

    return () => {
      audioSynth.stop();
    };
  }, [isOpen, callSession?.status, isCaller, isJoined]);

  // Duration Timer
  useEffect(() => {
    if (callSession?.status === 'active' && isJoined) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callSession?.status, isJoined]);

  // Initialize Microphone Media Stream for Joined Participants
  const setupLocalAudio = useCallback(async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasMicPermission(false);
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      setHasMicPermission(true);
      return stream;
    } catch {
      setHasMicPermission(false);
      return null;
    }
  }, []);

  // WebRTC Signaling & Peer Connections Setup
  useEffect(() => {
    if (!callSession || !isJoined || callSession.status !== 'active') return;

    let isMounted = true;
    setupLocalAudio();

    // Signal polling loop
    const pollSignals = async () => {
      if (!isMounted || !callSession) return;
      try {
        const signals = await FamilyService.getCallSignals(callSession.id, lastSignalTimeRef.current);
        for (const sig of signals) {
          if (sig.timestamp > lastSignalTimeRef.current) {
            lastSignalTimeRef.current = sig.timestamp;
          }
          handleIncomingSignal(sig);
        }
      } catch {}
    };

    signalPollTimerRef.current = setInterval(pollSignals, 1500);

    return () => {
      isMounted = false;
      if (signalPollTimerRef.current) clearInterval(signalPollTimerRef.current);
    };
  }, [callSession?.id, callSession?.status, isJoined, setupLocalAudio]);

  const handleIncomingSignal = async (signalData: any) => {
    const { from, signal } = signalData;
    if (!signal || from === currentUserId || !callSession) return;

    let pc = peerConnectionsRef.current.get(from);
    if (!pc) {
      pc = createPeerConnection(from);
      peerConnectionsRef.current.set(from, pc);
    }

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await FamilyService.sendCallSignal(callSession.id, from, answer);
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch {}
  };

  const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && callSession) {
        FamilyService.sendCallSignal(callSession.id, targetUserId, {
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      let audio = remoteAudiosRef.current.get(targetUserId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current.set(targetUserId, audio);
      }
      audio.srcObject = event.streams[0];
      audio.play().catch(() => {});
    };

    return pc;
  };

  // Connect to peers as an initiator when another member joins
  const initiateOffer = async (targetUserId: string) => {
    if (!callSession) return;
    const pc = createPeerConnection(targetUserId);
    peerConnectionsRef.current.set(targetUserId, pc);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await FamilyService.sendCallSignal(callSession.id, targetUserId, offer);
    } catch {}
  };

  // Clean up all streams and peer connections
  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    remoteAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();
    audioSynth.stop();
  };

  // Join Action
  const handleJoinCall = async () => {
    if (!callSession) return;
    try {
      audioSynth.stop();
      const updated = await FamilyService.joinCall(callSession.id);
      setCallSession(updated);
      await setupLocalAudio();

      // Initiate connection to existing participants
      updated.participants.forEach((p) => {
        if (p.id !== currentUserId) {
          initiateOffer(p.id);
        }
      });
    } catch (err: any) {
      onShowToast(err.message || 'Could not join call', 'error');
    }
  };

  // Repeat Call / Ring Again Feature
  const handleRepeatCall = async () => {
    if (!callSession) return;
    try {
      setIsRepeatingCall(true);
      const res = await FamilyService.repeatCall(callSession.id);
      onShowToast(`🔔 Ringing sent again! (Attempt #${res.repeated_call_count})`, 'success');
      audioSynth.startOutgoingRingtone();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to trigger repeated call', 'error');
    } finally {
      setTimeout(() => setIsRepeatingCall(false), 2000);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMuted = !isMuted;
        audioTracks[0].enabled = !nextMuted;
        setIsMuted(nextMuted);
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  // Leave Call
  const handleLeaveCall = async () => {
    cleanupMedia();
    if (callSession) {
      await FamilyService.leaveCall(callSession.id);
    }
    onClose();
    onCallEnded();
  };

  // End Call (For all)
  const handleEndCall = async () => {
    cleanupMedia();
    if (callSession) {
      await FamilyService.endCall(callSession.id);
    }
    onClose();
    onCallEnded();
  };

  if (!isOpen || !callSession) return null;

  // Format Duration seconds into mm:ss
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Identify joined vs unjoined members
  const joinedIds = new Set(callSession.participants.map((p) => p.id));
  const unjoinedMembers = homeMembers.filter((m) => !joinedIds.has(m.id));

  // Determine if incoming call view should be shown
  const isIncomingView = !isJoined && !isCaller && callSession.status === 'ringing';

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Background glowing rings */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* INCOMING CALL VIEW */}
        {isIncomingView ? (
          <div className="w-full flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-indigo-600/30 flex items-center justify-center animate-ping absolute inset-0" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-1 flex items-center justify-center relative shadow-lg">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-4xl">
                  📞
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full">
                Incoming Internet Call
              </span>
              <h2 className="text-2xl font-black mt-3 text-white">
                {callSession.caller_name} is calling!
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Family Internet Audio Call • Free & Instant
              </p>
            </div>

            {/* Accept & Decline Buttons */}
            <div className="flex items-center gap-6 pt-4">
              <button
                type="button"
                onClick={handleLeaveCall}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center text-xl shadow-lg transition active:scale-95">
                  ✕
                </div>
                <span className="text-xs font-bold text-slate-300">Decline</span>
              </button>

              <button
                type="button"
                onClick={handleJoinCall}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-xl animate-bounce active:scale-95">
                  📞
                </div>
                <span className="text-xs font-bold text-emerald-400">Accept Call</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE / CALLER VIEW */
          <div className="w-full flex flex-col items-center space-y-5">
            {/* Call Status Header */}
            <div className="flex items-center justify-between w-full pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  {callSession.status === 'ringing' ? 'Calling Family...' : 'Call in Progress'}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-400">
                {callSession.status === 'active' ? formatDuration(callDuration) : 'Ringing...'}
              </div>
            </div>

            {!hasMicPermission && (
              <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-2xl p-2.5 text-center text-xs text-amber-300">
                ⚠️ Microphone permission requested. Please allow audio access in your browser or device settings.
              </div>
            )}

            {/* Active Participants Grid */}
            <div className="w-full">
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                In This Call ({callSession.participants.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {callSession.participants.map((p) => {
                  const memberInfo = homeMembers.find((m) => m.id === p.id);
                  const isCurrent = p.id === currentUserId;
                  return (
                    <div
                      key={p.id}
                      className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 flex flex-col items-center text-center relative group"
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-700 mb-2 border-2 border-indigo-500/50 flex items-center justify-center">
                        {memberInfo?.image_url ? (
                          <img
                            src={memberInfo.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : memberInfo?.caricature_key ? (
                          <Caricature type={memberInfo.caricature_key} />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white truncate max-w-full">
                        {p.name} {isCurrent && '(You)'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                        Connected 🟢
                      </span>
                      {isCurrent && isMuted && (
                        <span className="text-[9px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded-full mt-1 border border-rose-800">
                          Muted 🔇
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UNJOINED MEMBERS SECTION WITH "REPEAT CALL" / "RING AGAIN" */}
            {unjoinedMembers.length > 0 && (
              <div className="w-full bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-300">
                    Not joined yet ({unjoinedMembers.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleRepeatCall}
                    disabled={isRepeatingCall}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span>🔄</span>
                    <span>{isRepeatingCall ? 'Ringing...' : 'Ring Again / Repeat Call'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {unjoinedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="inline-flex items-center gap-2 bg-slate-900/70 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs text-slate-300"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>{m.name}</span>
                      <span className="text-[10px] text-slate-500">Waiting</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IN-CALL CONTROLS BAR */}
            <div className="flex items-center justify-center gap-4 pt-3 w-full">
              {/* Mic Mute / Unmute */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl border transition active:scale-95 cursor-pointer ${
                  isMuted
                    ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <span className="text-xl">{isMuted ? '🔇' : '🎙️'}</span>
                <span className="text-[11px] font-bold">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Repeat Call Button in Bar */}
              <button
                type="button"
                onClick={handleRepeatCall}
                disabled={isRepeatingCall}
                title="Ring again for members who have not joined yet"
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span className="text-xl">🔔</span>
                <span className="text-[11px] font-bold">Ring Again</span>
              </button>

              {/* End / Leave Call */}
              <button
                type="button"
                onClick={isCaller ? handleEndCall : handleLeaveCall}
                className="flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white transition active:scale-95 cursor-pointer shadow-lg"
              >
                <span className="text-xl">🛑</span>
                <span className="text-[11px] font-bold">{isCaller ? 'End Call' : 'Leave'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
