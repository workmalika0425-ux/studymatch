import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AIRecommendations() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.post("/ai/recommend", {});
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI is taking a break, try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nb-card p-5 bg-brand-lavender" data-testid="ai-recommendations">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shadow-brutalSm">
            <Sparkles className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="nb-label">AI study coach</div>
            <div className="font-heading font-black text-xl">Find your perfect study room</div>
          </div>
        </div>
        <button onClick={run} className="nb-btn-yellow" disabled={loading} data-testid="ai-recommend-btn">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</> : <>Get recommendations</>}
        </button>
      </div>

      {data && (
        <div className="mt-4 space-y-3">
          {data.tip && (
            <div className="nb-card p-3 bg-white" data-testid="ai-tip">
              <span className="nb-label">Tip from your coach</span>
              <div className="text-sm font-medium mt-1">{data.tip}</div>
            </div>
          )}
          {(data.recommendations || []).length === 0 ? (
            <div className="text-sm font-bold text-gray-700">No matching rooms yet — try creating one!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.recommendations.map((r) => (
                <button
                  key={r.room_id}
                  className="nb-card p-3 text-left hover:shadow-brutalLg hover:-translate-y-0.5 transition-all"
                  onClick={() => navigate(`/rooms/${r.room_id}`)}
                  data-testid={`ai-rec-${r.room_id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-heading font-black">{r.name}</div>
                    <span className="nb-chip bg-brand-mint">{r.subject}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{r.why}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
