import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import RoomCard from "@/components/RoomCard";
import CreateRoomDialog from "@/components/CreateRoomDialog";
import AIRecommendations from "@/components/AIRecommendations";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Plus, Clock, Users, Sparkles } from "lucide-react";

function StatCard({ color, label, value, icon, testId }) {
  return (
    <div className={`nb-card nb-card-hover p-5 ${color}`} data-testid={testId}>
      <div className="flex items-center justify-between">
        <div className="nb-label">{label}</div>
        <div className="w-9 h-9 bg-white border-2 border-black rounded-lg flex items-center justify-center shadow-brutalSm">{icon}</div>
      </div>
      <div className="font-heading font-black text-5xl mt-3 tracking-tighter">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/dashboard");
      setStats(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const hours = stats ? (stats.total_minutes / 60).toFixed(1) : "0.0";
  const todayMin = stats?.today_minutes || 0;

  return (
    <div className="min-h-screen bg-paper" data-testid="dashboard-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <span className="nb-label">Welcome back</span>
            <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Hey {user?.name?.split(" ")[0] || "friend"} 👋</h1>
            <p className="text-gray-600 mt-1">Pick up where you left off, or jump into a new study room.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/explore" className="nb-btn-white" data-testid="dash-explore-btn">Explore rooms</Link>
            <button onClick={() => setCreateOpen(true)} className="nb-btn-yellow" data-testid="dash-create-btn">
              <Plus className="w-4 h-4" strokeWidth={3} /> Create room
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-7">
          <StatCard color="bg-brand-yellow" label="Total focus hours" value={hours} icon={<Clock className="w-5 h-5" strokeWidth={2.5} />} testId="stat-hours" />
          <StatCard color="bg-brand-mint" label="Today's minutes" value={todayMin} icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} testId="stat-today" />
          <StatCard color="bg-brand-pink" label="Streak (days)" value={stats?.streak_days ?? 0} icon={<Flame className="w-5 h-5" strokeWidth={2.5} />} testId="stat-streak" />
          <StatCard color="bg-brand-lavender" label="Active rooms" value={stats?.active_rooms ?? 0} icon={<Users className="w-5 h-5" strokeWidth={2.5} />} testId="stat-active" />
        </div>

        {/* Week chart + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
          <div className="lg:col-span-2 nb-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="nb-label">Last 7 days</div>
                <h3 className="font-heading font-black text-2xl">Your focus minutes</h3>
              </div>
            </div>
            <div className="mt-2 h-[220px]" data-testid="week-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.week_series || []}>
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ border: "2px solid black", borderRadius: 8 }} />
                  <Bar dataKey="minutes" fill="#0A0A0A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1">
            <AIRecommendations />
          </div>
        </div>

        {/* My rooms */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-black text-2xl">Your recent rooms</h3>
            <Link to="/explore" className="text-sm font-bold underline">See all</Link>
          </div>
          {stats?.my_rooms?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stats.my_rooms.map((r) => (
                <RoomCard key={r.room_id} room={r} />
              ))}
            </div>
          ) : (
            <div className="nb-card p-8 text-center">
              <p className="font-bold">You haven't joined a room yet.</p>
              <div className="mt-3 flex items-center gap-2 justify-center">
                <button className="nb-btn-yellow" onClick={() => setCreateOpen(true)}>Create your first room</button>
                <Link to="/explore" className="nb-btn-white">Browse rooms</Link>
              </div>
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
