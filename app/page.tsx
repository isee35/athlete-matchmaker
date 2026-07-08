import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <span className="text-xl font-bold gradient-text">Athlete Matchmaker</span>
        <div className="flex gap-3">
          <Link href="/auth/login" className="text-sm text-[var(--muted-light)] hover:text-white transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/auth/signup" className="text-sm bg-gradient-to-r from-teal-600 to-pink-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity">
            Join Free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-teal-600/10 border border-teal-600/30 text-teal-400 text-xs font-medium px-4 py-1.5 rounded-full">
            🏆 Serving San Diego, Orange County &amp; LA — more locations coming
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            Find your game.{" "}
            <span className="gradient-text">Meet your squad.</span>
          </h1>
          <p className="text-lg text-[var(--muted-light)] max-w-xl mx-auto">
            Set your availability, get matched with local athletes who share your interests,
            and Squad Up for real games — golf, pickleball, basketball, and dozens more.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth/signup" className="bg-gradient-to-r from-teal-600 to-pink-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-opacity">
            Create Free Account
          </Link>
          <Link href="/lobbies" className="bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] px-8 py-4 rounded-xl text-lg font-medium hover:bg-[var(--surface-2)] transition-colors">
            Browse Open Lobbies
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4 text-2xl">
          {["⛳","🏓","🎾","🏀","🏐","🏈","⚽","🥏","🎳","🏃","🚴","🏊"].map((e) => (
            <span key={e} className="bg-[var(--surface)] border border-[var(--border)] w-12 h-12 rounded-xl flex items-center justify-center hover:border-teal-600 transition-colors">
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)] px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "👤", title: "Build your profile", desc: "Choose the sports you play, set your skill level, and tell us when you're usually free." },
              { step: "2", icon: "📅", title: "Set your availability", desc: "Mark recurring weekly windows or one-off dates. We'll find overlaps with athletes near you." },
              { step: "3", icon: "🎮", title: "Squad Up", desc: "Get notified when 2+ athletes are available on the same day for the same sport. Start a lobby or join one." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-600/20 text-teal-400 text-xs font-bold flex items-center justify-center">{step}</span>
                  <span className="text-2xl">{icon}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-[var(--muted-light)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-6 text-center text-xs text-[var(--muted)]">
        © 2026 Athlete Matchmaker · Built for athletes, by athletes
      </footer>
    </main>
  );
}
