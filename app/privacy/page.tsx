import Link from "next/link";

export default function Privacy() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-teal-400 text-sm hover:text-teal-300">← Back</Link>
          <h1 className="text-3xl font-black mt-4 gradient-text">Privacy Policy</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Last updated: July 8, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-[var(--muted-light)] text-sm leading-relaxed">
          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">1. What we collect</h2>
            <p>We collect information you provide directly: name, email address, date of birth, username, city/state, optional phone number, sport preferences, and skill levels. We also collect usage data such as lobbies joined, availability schedules, and messages sent within lobbies.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">2. How we use your data</h2>
            <p>Your data is used to match you with athletes in your area, operate lobby coordination features, send event notifications (if you opt in), enforce community safety (no-show reports, age restrictions), and improve the platform. We do not sell your data.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">3. What's public vs. private</h2>
            <p><strong className="text-[var(--foreground)]">Public:</strong> username, first/last name, city/state, sport preferences, skill levels, badges, lobby count, high-five count, and profile photo.</p>
            <p className="mt-2"><strong className="text-[var(--foreground)]">Private:</strong> email address, date of birth, phone number, and exact location beyond city/state. Your phone number is only used for direct event contact and waitlist notifications — it is never displayed on your public profile.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">4. Age requirements</h2>
            <p>Athlete Matchmaker is available to users aged 13 and older. Users under 18 are subject to additional restrictions: they may not receive direct messages from users 18 or older outside of a shared lobby context. We use your date of birth solely to enforce these protections and for age-appropriate feature access.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">5. Data retention</h2>
            <p>Your account data is retained while your account is active. You can request account deletion by contacting us at support@athletematchmaker.com. Lobby records may be retained for safety and moderation purposes for up to 12 months after deletion.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">6. Third-party services</h2>
            <p>We use Supabase for database and authentication, Vercel for hosting, and Google OAuth for login. These services have their own privacy policies. We do not share your personal data with advertising networks.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">7. Contact</h2>
            <p>Questions about this policy? Email us at <a href="mailto:support@athletematchmaker.com" className="text-teal-400 hover:text-teal-300">support@athletematchmaker.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
