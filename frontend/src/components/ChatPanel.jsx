import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import api from "@/lib/api";

export default function ChatPanel({ roomId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const lastTsRef = useRef(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const params = lastTsRef.current ? `?after=${encodeURIComponent(lastTsRef.current)}` : "";
        const { data } = await api.get(`/rooms/${roomId}/messages${params}`);
        if (!alive) return;
        if (data && data.length) {
          setMessages((prev) => {
            const merged = lastTsRef.current ? [...prev, ...data] : data;
            return merged;
          });
          lastTsRef.current = data[data.length - 1].created_at;
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(id); };
  }, [roomId]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const { data } = await api.post(`/rooms/${roomId}/messages`, { text: t });
      setMessages((m) => [...m, data]);
      lastTsRef.current = data.created_at;
    } catch {}
  };

  return (
    <div className="nb-card flex flex-col h-[420px]" data-testid="chat-panel">
      <div className="px-4 py-2.5 border-b-2 border-black flex items-center justify-between">
        <span className="font-heading font-black">Room chat</span>
        <span className="nb-chip bg-brand-mint">live</span>
      </div>
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-sm text-gray-500 text-center mt-8">Say hi to your study group ✋</div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.user_id;
          return (
            <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 border-2 border-black rounded-xl ${mine ? "bg-brand-yellow" : "bg-white"}`}>
                {!mine && <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">{m.user_name}</div>}
                <div className="text-sm leading-snug whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="border-t-2 border-black p-2 flex gap-2">
        <input
          className="nb-input flex-1"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="chat-input"
        />
        <button type="submit" className="nb-btn-mint" data-testid="chat-send">
          <Send className="w-4 h-4" strokeWidth={3} />
        </button>
      </form>
    </div>
  );
}
