import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; approved?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token;
  const approved = sp.approved;

  if (approved) {
    return (
      <ConsentLayout>
        <div className="text-center space-y-3">
          <div className="text-5xl">🎉</div>
          <h1 className="text-xl font-bold text-teal-400">Account Approved!</h1>
          <p className="text-sm text-[var(--muted)]">Thank you for approving your child's Athlete Matchmaker account. They can now log in and start finding sports groups.</p>
          <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 block">Return home</Link>
        </div>
      </ConsentLayout>
    );
  }

  if (!token) {
    return <ConsentLayout><ErrorState message="No consent token provided. This link may be invalid." /></ConsentLayout>;
  }

  const supabase = await createClient();

  const { data: consent } = await supabase
    .from("parental_consents")
    .select("id, user_id, parent_email, parent_name, consented, expires_at, consented_at")
    .eq("token", token)
    .single();

  if (!consent) {
    return <ConsentLayout><ErrorState message="This consent link is invalid or has already been used." /></ConsentLayout>;
  }

  if (new Date(consent.expires_at) < new Date()) {
    return <ConsentLayout><ErrorState message="This consent link has expired (links are valid for 7 days). Please have your child re-register to receive a new link." /></ConsentLayout>;
  }

  if (consent.consented) {
    return (
      <ConsentLayout>
        <div className="text-center space-y-3">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold">Already Approved</h1>
          <p className="text-sm text-[var(--muted)]">This account has already been approved. Your child can now log in to Athlete Matchmaker.</p>
        </div>
      </ConsentLayout>
    );
  }

  // Get the minor's profile info
  const { data: minorProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name, username, city, state")
    .eq("id", consent.user_id)
    .single();

  return (
    <ConsentLayout>
      <ParentalConsentForm
        token={token}
        consentId={consent.id}
        userId={consent.user_id}
        parentName={consent.parent_name}
        parentEmail={consent.parent_email}
        minor={minorProfile}
      />
    </ConsentLayout>
  );
}

function ConsentLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="text-xl font-black gradient-text">Athlete Matchmaker</Link>
          <p className="text-sm text-[var(--muted)] mt-1">Parental Consent</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          {children}
        </div>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center space-y-3">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-bold text-red-400">Invalid Link</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 block">Return home</Link>
    </div>
  );
}

function ParentalConsentForm({
  token,
  consentId,
  userId,
  parentName,
  parentEmail,
  minor,
}: {
  token: string;
  consentId: string;
  userId: string;
  parentName: string | null;
  parentEmail: string;
  minor: any;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Parental Consent Required</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Your child has created an account on Athlete Matchmaker, a platform for finding sports groups and pickup games.
        </p>
      </div>

      {minor && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 space-y-1 text-sm">
          <p className="font-semibold text-[var(--foreground)]">Account details</p>
          <p className="text-[var(--muted)]">Name: <span className="text-[var(--foreground)]">{minor.first_name} {minor.last_name}</span></p>
          <p className="text-[var(--muted)]">Username: <span className="text-[var(--foreground)]">@{minor.username}</span></p>
          {minor.city && <p className="text-[var(--muted)]">Location: <span className="text-[var(--foreground)]">{minor.city}, {minor.state}</span></p>}
        </div>
      )}

      <div className="space-y-2 text-sm text-[var(--muted)]">
        <p><strong className="text-[var(--foreground)]">What does Athlete Matchmaker do?</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Connects athletes to find sports groups and pickup games</li>
          <li>Allows users to join public lobbies organized by other athletes</li>
          <li>Shows public profile info (name, username, sports, location)</li>
          <li>Does NOT share phone numbers or personal contact info</li>
          <li>Users must be 16+ to participate</li>
        </ul>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 text-xs text-yellow-300">
        By approving, you confirm that you are the parent or legal guardian of the account holder and that you consent to their participation in Athlete Matchmaker in accordance with our{" "}
        <Link href="/terms" className="underline hover:text-yellow-200">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-yellow-200">Privacy Policy</Link>.
      </div>

      <form action="/api/consent/approve" method="post" className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="consentId" value={consentId} />
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          ✅ I approve — activate this account
        </button>
        <p className="text-center text-xs text-[var(--muted)]">
          Not approving? Simply ignore this email. The account will remain inactive and expire in 7 days.
        </p>
      </form>
    </div>
  );
}
