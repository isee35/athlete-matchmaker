import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") ?? "";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        const dest = redirect
          ? `${origin}/onboarding?redirect=${encodeURIComponent(redirect)}`
          : `${origin}/onboarding`;
        return NextResponse.redirect(dest);
      }
      return NextResponse.redirect(redirect ? `${origin}${redirect}` : `${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
