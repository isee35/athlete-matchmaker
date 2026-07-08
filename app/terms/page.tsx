import Link from "next/link";

export default function Terms() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-teal-400 text-sm hover:text-teal-300">← Back</Link>
          <h1 className="text-3xl font-black mt-4 gradient-text">Terms of Service</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Last updated: July 8, 2026</p>
        </div>

        <div className="space-y-6 text-[var(--muted-light)] text-sm leading-relaxed">
          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">1. Acceptance</h2>
            <p>By creating an account or using Athlete Matchmaker, you agree to these Terms of Service and our Privacy Policy. If you are under 18, a parent or guardian must also agree to these terms on your behalf.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years old to use Athlete Matchmaker. Users aged 13–17 have restricted access to certain communication features. We reserve the right to verify age and suspend accounts found to have misrepresented their age.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">3. Community standards</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Show up to lobbies you commit to, or cancel with reasonable notice</li>
              <li>Treat other athletes with respect in all communications</li>
              <li>Not misrepresent your skill level in a way that disrupts other players' experience</li>
              <li>Not use the platform for harassment, discrimination, or any illegal activity</li>
              <li>Not create fake accounts or impersonate other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">4. No-show policy</h2>
            <p>Repeated no-shows may result in warnings, restrictions on lobby creation, or account suspension. No-show reports are reviewed by our admin team before any action is taken.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">5. Lobbies and events</h2>
            <p>Athlete Matchmaker is a coordination platform. We do not organize, host, or insure any athletic events. Participation in lobbies is voluntary and at your own risk. Lobby owners are responsible for ensuring the safety of their events.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">6. Payments and costs</h2>
            <p>Some lobbies may list an estimated cost (e.g., court fees, equipment). These costs are collected and managed directly between participants — Athlete Matchmaker does not process payments. Verify costs with the lobby owner before joining.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">7. Account termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting support@athletematchmaker.com.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">8. Limitation of liability</h2>
            <p>Athlete Matchmaker is provided "as is." We are not liable for injuries, damages, or losses arising from participation in events coordinated through this platform. Use common sense and prioritize your safety.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">9. Changes to terms</h2>
            <p>We may update these terms from time to time. Continued use after changes constitutes acceptance. We will notify users of material changes via in-app notification.</p>
          </section>

          <section>
            <h2 className="text-[var(--foreground)] font-bold text-lg mb-2">10. Contact</h2>
            <p>Questions? Email <a href="mailto:support@athletematchmaker.com" className="text-teal-400 hover:text-teal-300">support@athletematchmaker.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
