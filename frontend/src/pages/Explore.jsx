import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RoomCard from "@/components/RoomCard";
import CreateRoomDialog from "@/components/CreateRoomDialog";
import api from "@/lib/api";
import { Search, Plus } from "lucide-react";

const CATEGORIES = ["all", "subject", "exam", "skill", "goal"];

export default function Explore() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (cat && cat !== "all") params.category = cat;
      const { data } = await api.get("/rooms", { params });
      setRooms(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cat]);

  const onSearch = (e) => { e.preventDefault(); load(); };

  return (
    <div className="min-h-screen bg-paper" data-testid="explore-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <span className="nb-label">Find your people</span>
            <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Explore study rooms</h1>
          </div>
          <button onClick={() => setCreateOpen(true)} className="nb-btn-yellow" data-testid="explore-create-btn">
            <Plus className="w-4 h-4" strokeWidth={3} /> Create room
          </button>
        </div>

        <form onSubmit={onSearch} className="mt-6 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2.5} />
            <input
              className="nb-input pl-10"
              placeholder="Search by name, tag, or description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="explore-search-input"
            />
          </div>
          <button type="submit" className="nb-btn-mint" data-testid="explore-search-btn">Search</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`nb-chip ${cat === c ? "bg-black text-white" : "bg-white"}`}
              data-testid={`explore-cat-${c}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-center font-bold py-12">Loading rooms…</div>
          ) : rooms.length === 0 ? (
            <div className="nb-card p-10 text-center">
              <h3 className="font-heading font-black text-xl">No rooms yet</h3>
              <p className="text-gray-600 mt-1">Be the first to start a room in this category!</p>
              <button className="nb-btn-yellow mt-4" onClick={() => setCreateOpen(true)}>Create the first room</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((r) => <RoomCard key={r.room_id} room={r} />)}
            </div>
          )}
        </div>
      </div>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(room) => navigate(`/rooms/${room.room_id}`)}
      />
    </div>
  );
}
