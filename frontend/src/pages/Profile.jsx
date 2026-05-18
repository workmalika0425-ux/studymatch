import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Save, UserCircle2 } from "lucide-react";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [interests, setInterests] = useState((user?.interests || []).join(", "));
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", {
        name,
        bio,
        interests: interests.split(",").map((x) => x.trim()).filter(Boolean),
      });
      setUser(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Could not save profile");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="profile-page">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading font-black text-4xl tracking-tighter">Your profile</h1>
        <p className="text-gray-600 mt-1">Tell us what you're studying so we can match you with the right rooms.</p>

        <form onSubmit={save} className="mt-6 nb-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-2 border-black shadow-brutalSm" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-lavender border-2 border-black flex items-center justify-center">
                <UserCircle2 className="w-10 h-10" strokeWidth={2} />
              </div>
            )}
            <div>
              <div className="font-heading font-black text-2xl">{user?.name}</div>
              <div className="text-sm text-gray-600">{user?.email}</div>
            </div>
          </div>

          <div>
            <label className="nb-label">Display name</label>
            <input className="nb-input mt-1" value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" />
          </div>

          <div>
            <label className="nb-label">Bio</label>
            <textarea className="nb-input mt-1 min-h-[80px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you working on this term?" data-testid="profile-bio" />
          </div>

          <div>
            <label className="nb-label">Interests (comma separated)</label>
            <input
              className="nb-input mt-1"
              placeholder="JEE Physics, Calculus, Web dev"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              data-testid="profile-interests"
            />
          </div>

          <button type="submit" className="nb-btn-yellow" disabled={saving} data-testid="profile-save">
            <Save className="w-4 h-4" strokeWidth={3} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
