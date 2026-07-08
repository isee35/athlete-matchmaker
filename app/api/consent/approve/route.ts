import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const token = formData.get("token") as string;
  const consentId = formData.get("consentId") as string;
  const userId = formData.get("userId") as string;

  if (!token || !consentId || !userId) {
    return NextResponse.redirect(new URL("/consent?error=invalid", req.url));
  }

  const supabase = await createClient();

  // Verify token matches and isn't expired
  const { data: consent } = await supabase
    .from("parental_consents")
    .select("id, expires_at, consented")
    .eq("id", consentId)
    .eq("token", token)
    .single();

  if (!consent || consent.consented || new Date(consent.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/consent?error=expired", req.url));
  }

  // Mark consent as approved
  await supabase.from("parental_consents").update({
    consented: true,
    consented_at: new Date().toISOString(),
  }).eq("id", consentId);

  // Activate the minor's profile
  await supabase.from("profiles").update({
    parental_consent_pending: false,
    age_verified: true,
    parent_consented_at: new Date().toISOString(),
  }).eq("id", userId);

  return NextResponse.redirect(new URL("/consent?approved=1", req.url));
}
