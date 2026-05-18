import React, { useEffect, useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

export default function TaskList({ roomId }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}/tasks`);
      setTasks(data);
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [roomId]);

  const add = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    const { data } = await api.post(`/rooms/${roomId}/tasks`, { title: t });
    setTasks((arr) => [...arr, data]);
  };

  const toggle = async (task) => {
    await api.patch(`/rooms/${roomId}/tasks/${task.task_id}`, { completed: !task.completed });
    setTasks((arr) => arr.map((x) => (x.task_id === task.task_id ? { ...x, completed: !x.completed } : x)));
  };

  const remove = async (task) => {
    await api.delete(`/rooms/${roomId}/tasks/${task.task_id}`);
    setTasks((arr) => arr.filter((x) => x.task_id !== task.task_id));
  };

  return (
    <div className="nb-card p-5" data-testid="task-list">
      <div className="flex items-center gap-2 mb-3">
        <ListTodo className="w-5 h-5" strokeWidth={2.5} />
        <span className="font-heading font-black text-lg">Shared goals</span>
        <span className="ml-auto nb-chip bg-brand-lavender">{tasks.filter((t) => t.completed).length}/{tasks.length}</span>
      </div>

      <form onSubmit={add} className="flex gap-2 mb-3">
        <input
          className="nb-input flex-1"
          placeholder="Add a study goal…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="task-input"
        />
        <button className="nb-btn-yellow" type="submit" data-testid="task-add"><Plus className="w-4 h-4" strokeWidth={3} /></button>
      </form>

      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {tasks.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">No goals yet. Add the first one!</div>
        )}
        {tasks.map((t) => (
          <div key={t.task_id} className="flex items-center gap-2 border-2 border-black rounded-lg px-3 py-2 bg-white" data-testid={`task-${t.task_id}`}>
            <button
              className={`w-6 h-6 rounded border-2 border-black flex items-center justify-center ${t.completed ? "bg-brand-mint" : "bg-white"}`}
              onClick={() => toggle(t)}
              aria-label="toggle"
              data-testid={`task-toggle-${t.task_id}`}
            >
              {t.completed && <Check className="w-4 h-4" strokeWidth={3} />}
            </button>
            <div className={`flex-1 text-sm font-semibold ${t.completed ? "line-through text-gray-400" : ""}`}>
              {t.title}
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase">{t.created_by_name}</div>
            <button className="text-gray-500 hover:text-red-600" onClick={() => remove(t)} aria-label="delete" data-testid={`task-delete-${t.task_id}`}>
              <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
