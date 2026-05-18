import React, { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Volume2 } from "lucide-react";

const TRACKS = [
  { id: "rain", label: "Gentle Rain", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_1b00b04c33.mp3" },
  { id: "lofi", label: "Lofi Beats", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "forest", label: "Forest", url: "https://cdn.pixabay.com/audio/2022/03/24/audio_5e09b00a6e.mp3" },
];

export default function AmbientPlayer() {
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState("lofi");
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(0.45);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = vol;
  }, [vol]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    if (playing) {
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }, [trackId]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const track = TRACKS.find((t) => t.id === trackId);

  return (
    <div className="nb-card p-4" data-testid="ambient-player">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4" strokeWidth={2.5} />
          <span className="font-heading font-black">Ambient sounds</span>
        </div>
        <button className="nb-chip bg-white" onClick={() => setOpen((o) => !o)} data-testid="ambient-toggle-panel">
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                className={`nb-chip ${trackId === t.id ? "bg-brand-yellow" : "bg-white"}`}
                onClick={() => setTrackId(t.id)}
                data-testid={`ambient-track-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button className="nb-btn-mint" onClick={toggle} data-testid="ambient-toggle-play">
              {playing ? <Pause className="w-4 h-4" strokeWidth={3} /> : <Play className="w-4 h-4" strokeWidth={3} />}
              {playing ? "Pause" : "Play"}
            </button>
            <Volume2 className="w-4 h-4" strokeWidth={2.5} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => setVol(Number(e.target.value))}
              className="flex-1 accent-black"
              data-testid="ambient-volume"
            />
          </div>
          <audio ref={audioRef} src={track?.url} loop preload="none" />
        </div>
      )}
    </div>
  );
}
