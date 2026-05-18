import React, { useState } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = ["subject", "exam", "skill", "goal"];
const SUBJECT_SUGGESTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Economics", "History", "Literature", "Languages", "Art & Design",
];

export default function CreateRoomDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    subject: "Mathematics",
    category: "subject",
    tags: "",
    is_private: false,
    passcode: "",
    max_participants: 12,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        passcode: form.is_private ? form.passcode : null,
      };
      const { data } = await api.post("/rooms", payload);
      toast.success("Study room created!");
      onCreated?.(data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not create room");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      data-testid="create-room-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nb-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-black">Create study room</h2>
          <button onClick={onClose} className="nb-btn-white px-2 py-2" aria-label="Close" data-testid="close-create-dialog">
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="nb-label">Room name</label>
            <input
              className="nb-input mt-1"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="JEE Physics Crash Hour"
              data-testid="room-name-input"
            />
          </div>

          <div>
            <label className="nb-label">Description</label>
            <textarea
              className="nb-input mt-1 min-h-[80px]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What are you working on?"
              data-testid="room-description-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="nb-label">Category</label>
              <select
                className="nb-input mt-1"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                data-testid="room-category-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nb-label">Subject</label>
              <input
                list="subject-suggest"
                className="nb-input mt-1"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                data-testid="room-subject-input"
              />
              <datalist id="subject-suggest">
                {SUBJECT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="nb-label">Tags (comma separated)</label>
            <input
              className="nb-input mt-1"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="pomodoro, calculus, group-study"
              data-testid="room-tags-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="nb-label">Max participants</label>
              <input
                type="number"
                min={2}
                max={24}
                className="nb-input mt-1"
                value={form.max_participants}
                onChange={(e) => update("max_participants", Number(e.target.value))}
                data-testid="room-max-input"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="nb-chip bg-white cursor-pointer" data-testid="room-private-toggle">
                <input
                  type="checkbox"
                  className="accent-black"
                  checked={form.is_private}
                  onChange={(e) => update("is_private", e.target.checked)}
                />
                Private room
              </label>
            </div>
          </div>

          {form.is_private && (
            <div>
              <label className="nb-label">Passcode</label>
              <input
                className="nb-input mt-1"
                value={form.passcode}
                onChange={(e) => update("passcode", e.target.value)}
                placeholder="set a passcode"
                data-testid="room-passcode-input"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="nb-btn-yellow flex-1" disabled={submitting} data-testid="submit-create-room">
              {submitting ? "Creating…" : "Create Room"}
            </button>
            <button type="button" className="nb-btn-white" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
