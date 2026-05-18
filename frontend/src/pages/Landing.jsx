import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, BookOpenCheck, Sparkles, Timer, Trophy, Users, ShieldCheck } from "lucide-react";

const HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/a5ed4640-ac32-42ac-99d5-52bfc7ea0563/images/c22d6c87cc38f89f0126b26f81bfb3e88f68b4d01108471c4a0b24522da070b8.png";
const ACCENT_IMG = "https://static.prod-images.emergentagent.com/jobs/a5ed4640-ac32-42ac-99d5-52bfc7ea0563/images/a764712be1d9e9d110a1ffc83fc0685f81522444afff40b9eb939810be958ba9.png";

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const startLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  React.useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-paper" data-testid="landing-page">
      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 nb-chip bg-brand-mint mb-5" data-testid="landing-tag">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
              For students who study better together
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
              The cozy library<br />
              that fits in your<br />
              <span className="bg-brand-yellow px-2 inline-block border-2 border-black shadow-brutal -rotate-1 my-2">browser</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-gray-700">
              Drop into focused virtual study rooms. Share a Pomodoro timer, swap doubts in chat,
              vibe to lofi ambient sounds, and keep your streak alive — together.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button onClick={startLogin} className="nb-btn-yellow text-base !py-3 !px-6" data-testid="landing-cta-google">
                Continue with Google <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="nb-btn-white text-base !py-3 !px-6" data-testid="landing-explore">
                See features
              </button>
            </div>

            <div className="mt-8 flex items-center gap-5 text-sm text-gray-700">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" strokeWidth={2.5} /> Secure Google sign-in</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" strokeWidth={2.5} /> Public & private rooms</div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="nb-card overflow-hidden rotate-2">
              <img src={HERO_IMG} alt="Lofi study room" className="w-full h-[420px] object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 nb-card p-4 bg-brand-pink -rotate-3 hidden md:block">
              <div className="nb-label">Right now</div>
              <div className="font-heading font-black text-2xl">
                <span data-testid="hero-live-count">142</span> learners studying
              </div>
            </div>
            <div className="absolute -top-6 -right-2 nb-card p-3 bg-brand-mint rotate-6 hidden md:flex items-center gap-2">
              <Timer className="w-5 h-5" strokeWidth={3} />
              <div className="font-mono font-black">25:00</div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y-2 border-black bg-brand-yellow overflow-hidden">
        <div className="flex gap-12 py-3 animate-marquee whitespace-nowrap font-heading font-black text-lg">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-12">
              {["JEE Prep", "GRE Vocab", "Calculus 101", "Frontend Bootcamp", "Spanish A2", "MBBS Anatomy", "CFA Level 1", "Creative Writing", "UPSC Polity"].map((t) => (
                <span key={t + i} className="flex items-center gap-2"><BookOpenCheck className="w-4 h-4" strokeWidth={3} /> {t}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <span className="nb-label">Built for focus</span>
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tight mt-2">Everything you need to deep-work, together.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { c: "bg-brand-mint", title: "Shared Pomodoro", desc: "One timer, all rooms in sync. Auto-tracks focus minutes into your streak." , icon: <Timer className="w-5 h-5" strokeWidth={3} /> },
            { c: "bg-brand-yellow", title: "Live presence + chat", desc: "Studying, on break, or have a doubt? Set your status. Drop a question in chat.", icon: <Users className="w-5 h-5" strokeWidth={3} /> },
            { c: "bg-brand-pink", title: "AI study coach", desc: "Get matched to rooms that fit your subjects, exams, and goals. Powered by Claude.", icon: <Sparkles className="w-5 h-5" strokeWidth={3} /> },
            { c: "bg-brand-lavender", title: "Streaks & leaderboard", desc: "Healthy peer pressure: see weekly top focus minutes across the community.", icon: <Trophy className="w-5 h-5" strokeWidth={3} /> },
            { c: "bg-brand-mint", title: "Focus mode", desc: "Dim the world. Lofi rain on. Just the timer and your task list. Phone face-down.", icon: <BookOpenCheck className="w-5 h-5" strokeWidth={3} /> },
            { c: "bg-brand-yellow", title: "Public & private rooms", desc: "Study with friends behind a passcode, or join an open desk with strangers turned classmates.", icon: <ShieldCheck className="w-5 h-5" strokeWidth={3} /> },
          ].map((f, i) => (
            <div key={i} className={`nb-card nb-card-hover p-6 ${f.c}`} data-testid={`feature-card-${i}`}>
              <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shadow-brutalSm mb-3">{f.icon}</div>
              <h3 className="font-heading font-black text-xl">{f.title}</h3>
              <p className="text-sm text-gray-800 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Big CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="nb-card p-8 md:p-12 bg-black text-white relative overflow-hidden">
          <img src={ACCENT_IMG} alt="" className="absolute -right-10 -bottom-10 w-72 opacity-50 hidden md:block" />
          <span className="nb-label !text-gray-300">No subscriptions • Just focus</span>
          <h2 className="font-heading font-black text-4xl md:text-6xl tracking-tighter mt-2 max-w-2xl">Pull up a chair. The library's open.</h2>
          <button onClick={startLogin} className="nb-btn-yellow mt-6 text-base !py-3 !px-6" data-testid="landing-cta-bottom">
            Start studying together <ArrowRight className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>
      </section>

      <footer className="border-t-2 border-black bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-sm">
          <div className="font-bold">© Lumen.Study</div>
          <div className="text-gray-600">Crafted for late-night learners</div>
        </div>
      </footer>
    </div>
  );
}
