import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { Trophy, Flame, Medal } from "lucide-react";

const MEDAL_BG = ["bg-brand-yellow", "bg-brand-mint", "bg-brand-pink"];

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/leaderboard");
        setRows(data);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-paper" data-testid="leaderboard-page">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-yellow border-2 border-black rounded-xl flex items-center justify-center shadow-brutal">
            <Trophy className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <span className="nb-label">This week</span>
            <h1 className="font-heading font-black text-4xl tracking-tighter">Top focused learners</h1>
          </div>
        </div>

        <div className="mt-6 nb-card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b-2 border-black bg-brand-lavender text-xs font-black uppercase tracking-wider">
            <div className="col-span-2">Rank</div>
            <div className="col-span-6">Learner</div>
            <div className="col-span-2 text-right">Streak</div>
            <div className="col-span-2 text-right">Minutes</div>
          </div>
          {loading ? (
            <div className="px-5 py-10 text-center font-bold">Loading leaderboard…</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-bold">No focus minutes logged yet this week.</p>
              <p className="text-sm text-gray-600 mt-1">Be the first to set the record!</p>
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.user_id} className="grid grid-cols-12 px-5 py-3 items-center border-b border-black/10 last:border-0" data-testid={`leader-row-${r.user_id}`}>
                <div className="col-span-2">
                  <span className={`nb-chip ${MEDAL_BG[r.rank - 1] || "bg-white"} !text-base`}>
                    <Medal className="w-4 h-4" strokeWidth={3} /> #{r.rank}
                  </span>
                </div>
                <div className="col-span-6 flex items-center gap-3">
                  {r.picture ? (
                    <img src={r.picture} className="w-9 h-9 rounded-full border-2 border-black" alt={r.name} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-mint border-2 border-black flex items-center justify-center font-black">
                      {r.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold">{r.name}</span>
                </div>
                <div className="col-span-2 text-right font-bold flex items-center justify-end gap-1">
                  <Flame className="w-4 h-4" strokeWidth={3} /> {r.streak_days}
                </div>
                <div className="col-span-2 text-right font-mono font-black">{r.minutes}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
