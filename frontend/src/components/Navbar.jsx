import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BookOpenCheck, Compass, LayoutDashboard, Trophy, LogOut, UserCircle2 } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const link = ({ isActive }) =>
    `nb-chip ${isActive ? "bg-brand-yellow" : "bg-white"} hover:bg-brand-mint transition-colors`;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF8]/85 backdrop-blur border-b-2 border-black" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-lg bg-brand-yellow border-2 border-black flex items-center justify-center shadow-brutalSm">
            <BookOpenCheck strokeWidth={2.5} className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-xl tracking-tight">Study<span className="text-pink-500">·</span>Match</div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-2" data-testid="nav-links">
            <NavLink to="/dashboard" className={link} data-testid="nav-dashboard">
              <LayoutDashboard className="w-4 h-4" strokeWidth={2.5} /> Dashboard
            </NavLink>
            <NavLink to="/explore" className={link} data-testid="nav-explore">
              <Compass className="w-4 h-4" strokeWidth={2.5} /> Explore
            </NavLink>
            <NavLink to="/leaderboard" className={link} data-testid="nav-leaderboard">
              <Trophy className="w-4 h-4" strokeWidth={2.5} /> Leaderboard
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="nb-chip bg-white hover:bg-brand-lavender"
                data-testid="nav-profile"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-5 h-5 rounded-full border border-black" />
                ) : (
                  <UserCircle2 className="w-5 h-5" strokeWidth={2.5} />
                )}
                <span className="hidden sm:inline">{user.name}</span>
              </button>
              <button onClick={logout} className="nb-btn-white px-3 py-2" data-testid="nav-logout" aria-label="Logout">
                <LogOut className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
