import React from "react";
import { Link } from "react-router-dom";
import { Lock, Users, Tag } from "lucide-react";

const colorByCategory = {
  subject: "bg-brand-mint",
  exam: "bg-brand-yellow",
  skill: "bg-brand-pink",
  goal: "bg-brand-lavender",
};

export default function RoomCard({ room, onClick }) {
  const accent = colorByCategory[room.category] || "bg-brand-yellow";
  return (
    <Link
      to={`/rooms/${room.room_id}`}
      onClick={onClick}
      className="nb-card nb-card-hover p-5 flex flex-col gap-3 group"
      data-testid={`room-card-${room.room_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`nb-chip ${accent}`}>{room.category}</span>
            {room.is_private && (
              <span className="nb-chip bg-white">
                <Lock className="w-3 h-3" strokeWidth={3} /> Private
              </span>
            )}
          </div>
          <h3 className="font-heading font-black text-xl leading-tight">{room.name}</h3>
          {room.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{room.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="nb-label">Subject</span>
        <span className="font-bold text-sm">{room.subject}</span>
      </div>

      {room.tags?.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3.5 h-3.5" strokeWidth={2.5} />
          {room.tags.slice(0, 4).map((t) => (
            <span key={t} className="text-xs font-semibold text-gray-700">#{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-black/15">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Users className="w-4 h-4" strokeWidth={2.5} />
          {room.participants?.length || 0} / {room.max_participants}
        </div>
        <div className="text-xs font-bold text-gray-600">by {room.host_name}</div>
      </div>
    </Link>
  );
}
