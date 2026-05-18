import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import PomodoroTimer from "@/components/PomodoroTimer";
import ChatPanel from "@/components/ChatPanel";
import ParticipantList from "@/components/ParticipantList";
import TaskList from "@/components/TaskList";
import AmbientPlayer from "@/components/AmbientPlayer";
import { ArrowLeft, EyeOff, Lock, LogOut, Moon, Sun, Crown } from "lucide-react";
import { toast } from "sonner";

const FOCUS_BG = "https://static.prod-images.emergentagent.com/jobs/a5ed4640-ac32-42ac-99d5-52bfc7ea0563/images/c3978bf002e1be45cd68609ada17cbd09d4c635b791e1ed242877efed08f4a4a.png";

export default function RoomView() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [joined, setJoined] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const isHost = room?.host_id === user?.user_id;
  const isParticipant = !!room?.participants?.find((p) => p.user_id === user?.user_id);

  const fetchRoom = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}`);
      if (data.requires_passcode) {
        setNeedsPasscode(true);
        setRoom({ room_id: data.room_id, name: data.name, is_private: true });
      } else {
        setRoom(data);
        setNeedsPasscode(false);
      }
    } catch (e) {
      toast.error("Room not found");
      navigate("/explore");
    }
  }, [roomId, navigate]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // Auto join when accessible
  useEffect(() => {
    if (!room || needsPasscode || joined) return;
    if (isParticipant) { setJoined(true); return; }
    (async () => {
      try {
        const { data } = await api.post(`/rooms/${room.room_id}/join`, {});
        setRoom(data);
        setJoined(true);
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Could not join");
      }
    })();
  }, [room, needsPasscode, joined, isParticipant]);

  // Polling room every 3s
  useEffect(() => {
    if (!joined) return;
    const id = setInterval(fetchRoom, 3000);
    return () => clearInterval(id);
  }, [joined, fetchRoom]);

  // Apply focus-mode class to body
  useEffect(() => {
    if (focusMode) document.body.classList.add("focus-mode");
    else document.body.classList.remove("focus-mode");
    return () => document.body.classList.remove("focus-mode");
  }, [focusMode]);

  const submitPasscode = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/rooms/${roomId}/join`, { passcode });
      setRoom(data);
      setNeedsPasscode(false);
      setJoined(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Wrong passcode");
    }
  };

  const updateStatus = async (status) => {
    try {
      await api.put(`/rooms/${roomId}/status`, { status });
      setRoom((r) => r ? { ...r, participants: r.participants.map((p) => p.user_id === user.user_id ? { ...p, status } : p) } : r);
    } catch {}
  };

  const leave = async () => {
    try { await api.post(`/rooms/${roomId}/leave`); } catch {}
    navigate("/explore");
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="nb-card p-6 font-heading text-xl">Loading room…</div>
      </div>
    );
  }

  if (needsPasscode) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-12">
          <button onClick={() => navigate("/explore")} className="nb-chip bg-white mb-4">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} /> Back
          </button>
          <div className="nb-card p-6" data-testid="passcode-card">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5" strokeWidth={3} />
              <span className="nb-label">Private room</span>
            </div>
            <h2 className="font-heading font-black text-2xl">{room.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Enter the passcode to join this study room.</p>
            <form onSubmit={submitPasscode} className="mt-4 space-y-3">
              <input
                className="nb-input"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                data-testid="passcode-input"
              />
              <button type="submit" className="nb-btn-yellow w-full" data-testid="passcode-submit">Enter room</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${focusMode ? "focus-mode" : "bg-paper"} relative`}
      data-testid="room-view"
      style={focusMode ? {
        backgroundImage: `linear-gradient(rgba(14,14,16,0.85), rgba(14,14,16,0.92)), url(${FOCUS_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
      {!focusMode && <Navbar />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => navigate("/explore")} className="nb-chip bg-white mb-2">
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} /> Back
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-black text-3xl md:text-4xl tracking-tighter">{room.name}</h1>
              {isHost && <span className="nb-chip bg-brand-yellow"><Crown className="w-3.5 h-3.5" strokeWidth={3} /> Host</span>}
              {room.is_private && <span className="nb-chip bg-white"><Lock className="w-3.5 h-3.5" strokeWidth={3} /> Private</span>}
            </div>
            <p className={`text-sm mt-1 ${focusMode ? "text-gray-300" : "text-gray-600"}`}>
              {room.subject} • {room.category}{room.description ? ` • ${room.description}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFocusMode((m) => !m)} className={focusMode ? "nb-btn-yellow" : "nb-btn-lav"} data-testid="focus-toggle">
              {focusMode ? <><Sun className="w-4 h-4" strokeWidth={3} /> Exit Focus</> : <><Moon className="w-4 h-4" strokeWidth={3} /> Focus mode</>}
            </button>
            <button onClick={leave} className="nb-btn-pink" data-testid="leave-room">
              <LogOut className="w-4 h-4" strokeWidth={3} /> Leave
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6">
          <div className="lg:col-span-8 space-y-5">
            <PomodoroTimer room={room} isHost={isHost} onLogSession={fetchRoom} />
            <ParticipantList
              participants={room.participants || []}
              currentUserId={user?.user_id}
              onStatusChange={updateStatus}
            />
            {!focusMode && <AmbientPlayer />}
          </div>
          <div className="lg:col-span-4 space-y-5">
            <TaskList roomId={room.room_id} />
            {!focusMode ? (
              <ChatPanel roomId={room.room_id} user={user} />
            ) : (
              <div className="nb-card p-5 text-center">
                <EyeOff className="w-8 h-8 mx-auto" strokeWidth={2.5} />
                <div className="font-heading font-black text-lg mt-2">Chat hidden</div>
                <div className="text-sm text-gray-400 mt-1">You're in Focus Mode — fewer distractions, more flow.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
