"use client";
export const dynamic = "force-dynamic";
import { useState, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "";
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push(redirect || "/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const callbackUrl = redirect
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  }

  const signupHref = redirect ? `/auth/signup?redirect=${encodeURIComponent(redirect)}` : "/auth/signup";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="text-2xl font-black gradient-text block">Athlete Matchmaker</Link>
          <p className="text-sm text-[var(--muted)]">Sign in to your account</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <Button variant="secondary" size="lg" className="w-full" loading={googleLoading} onClick={handleGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>Sign In</Button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted)]">
          No account?{" "}
          <Link href={signupHref} className="text-teal-400 hover:text-teal-300">Create one free</Link>
        </p>
      </div>
    </main>
  );
}

export default function Login() {
  return <Suspense><LoginForm /></Suspense>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
