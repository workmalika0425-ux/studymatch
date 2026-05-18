import React, { useEffect, useMemo, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Timer } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const MODE_LABELS = {
  focus: "Focus",
  short_break: "Short Break",
  long_break: "Long Break",
};

const MODE_COLOR = {
  focus: "bg-brand-yellow",
  short_break: "bg-brand-mint",
  long_break: "bg-brand-pink",
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function PomodoroTimer({ room, isHost, onLogSession }) {
  const pomo = room?.pomodoro || {};
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => {
    if (pomo.is_running && pomo.started_at) {
      const startedMs = new Date(pomo.started_at).getTime();
      const elapsed = Math.floor((now - startedMs) / 1000);
      return Math.max(0, (pomo.paused_remaining || 0) - elapsed);
    }
    return pomo.paused_remaining ?? pomo.duration_seconds ?? 25 * 60;
  }, [pomo, now]);

  // Auto-skip and log session when focus block finishes
  useEffect(() => {
    if (!pomo.is_running) return;
    if (remaining > 0) return;
    if (!isHost) return;
    (async () => {
      try {
        if (pomo.mode === "focus") {
          const mins = Math.floor((pomo.duration_seconds || 1500) / 60);
          await api.post("/sessions/log", { minutes: mins, room_id: room.room_id });
          onLogSession?.(mins);
          toast.success(`Focus block done • +${mins} min logged`);
        }
        await api.post(`/rooms/${room.room_id}/pomodoro`, { action: "skip" });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, pomo.is_running, isHost]);

  const act = async (action, opts = {}) => {
    try {
      await api.post(`/rooms/${room.room_id}/pomodoro`, { action, ...opts });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Timer error");
    }
  };

  const setMode = (mode) => {
    if (!isHost) return;
    act("start", { mode });
  };

  return (
    <div className={`nb-card p-5 ${MODE_COLOR[pomo.mode] || "bg-brand-yellow"}`} data-testid="pomodoro-timer">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" strokeWidth={3} />
          <span className="nb-label">Shared Pomodoro</span>
        </div>
        <span className="nb-chip bg-white">{MODE_LABELS[pomo.mode] || "Focus"}</span>
      </div>

      <div className="font-mono text-6xl md:text-7xl font-black text-center tracking-tight my-2" data-testid="pomodoro-display">
        {formatTime(remaining)}
      </div>

      <div className="flex items-center gap-2 justify-center mt-3 flex-wrap">
        {pomo.is_running ? (
          <button
            className="nb-btn-white"
            onClick={() => act("pause")}
            disabled={!isHost}
            data-testid="pomodoro-pause"
          >
            <Pause className="w-4 h-4" strokeWidth={3} /> Pause
          </button>
        ) : (
          <button
            className="nb-btn-white"
            onClick={() => act("start")}
            disabled={!isHost}
            data-testid="pomodoro-start"
          >
            <Play className="w-4 h-4" strokeWidth={3} /> Start
          </button>
        )}
        <button className="nb-btn-white" onClick={() => act("reset")} disabled={!isHost} data-testid="pomodoro-reset">
          <RotateCcw className="w-4 h-4" strokeWidth={3} /> Reset
        </button>
        <button className="nb-btn-white" onClick={() => act("skip")} disabled={!isHost} data-testid="pomodoro-skip">
          <SkipForward className="w-4 h-4" strokeWidth={3} /> Skip
        </button>
      </div>

      <div className="flex items-center gap-2 justify-center mt-3">
        <button
          className={`nb-chip ${pomo.mode === "focus" ? "bg-black text-white" : "bg-white"}`}
          onClick={() => setMode("focus")}
          disabled={!isHost}
          data-testid="pomodoro-mode-focus"
        >Focus 25</button>
        <button
          className={`nb-chip ${pomo.mode === "short_break" ? "bg-black text-white" : "bg-white"}`}
          onClick={() => setMode("short_break")}
          disabled={!isHost}
          data-testid="pomodoro-mode-short"
        >Break 5</button>
        <button
          className={`nb-chip ${pomo.mode === "long_break" ? "bg-black text-white" : "bg-white"}`}
          onClick={() => setMode("long_break")}
          disabled={!isHost}
          data-testid="pomodoro-mode-long"
        >Long 15</button>
      </div>

      <div className="text-center mt-3 text-xs font-bold text-gray-700">
        Rounds completed: {pomo.rounds_completed || 0}{!isHost && " • Host controls the timer"}
      </div>
    </div>
  );
}
