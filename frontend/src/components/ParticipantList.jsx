import React from "react";
import { CircleUser } from "lucide-react";

const STATUS_STYLE = {
  studying: "bg-brand-mint",
  break: "bg-brand-yellow",
  doubt: "bg-brand-pink",
};
const STATUS_LABEL = { studying: "Studying", break: "On break", doubt: "Asking doubt" };

export default function ParticipantList({ participants = [], currentUserId, onStatusChange }) {
  const me = participants.find((p) => p.user_id === currentUserId);

  return (
    <div className="nb-card p-5" data-testid="participant-list">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="nb-label">Study desks</div>
          <div className="font-heading font-black text-xl">{participants.length} learner{participants.length === 1 ? "" : "s"} present</div>
        </div>
        {me && (
          <div className="flex items-center gap-1.5" data-testid="status-switcher">
            {["studying", "break", "doubt"].map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange?.(s)}
                className={`nb-chip ${STATUS_STYLE[s]} ${me.status === s ? "ring-2 ring-black ring-offset-2 ring-offset-white" : "opacity-70 hover:opacity-100"}`}
                data-testid={`status-btn-${s}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">No one's here yet. Be the first to take a seat.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {participants.map((p) => (
            <div key={p.user_id} className="nb-card p-3 flex flex-col items-center gap-2" data-testid={`participant-${p.user_id}`}>
              <div className="relative">
                {p.picture ? (
                  <img src={p.picture} alt={p.name} className="w-14 h-14 rounded-full border-2 border-black object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-brand-lavender border-2 border-black flex items-center justify-center">
                    <CircleUser className="w-7 h-7" strokeWidth={2.5} />
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${p.status === "studying" ? "bg-emerald-400" : p.status === "break" ? "bg-amber-400" : "bg-pink-400"} pulse-dot`} />
              </div>
              <div className="text-sm font-bold text-center leading-tight line-clamp-1 w-full">{p.name}</div>
              <span className={`nb-chip ${STATUS_STYLE[p.status] || "bg-white"} !px-2 !py-0.5 !text-[10px]`}>
                {STATUS_LABEL[p.status] || "Studying"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
