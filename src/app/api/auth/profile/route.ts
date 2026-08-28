import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAccount, saveProfile } from "@/lib/account-store";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import type { RoomProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const username = readSession(token);
  if (!username) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const account = await getAccount(username);
  if (!account) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let profile: RoomProfile;
  try {
    profile = (await request.json()) as RoomProfile;
  } catch {
    return NextResponse.json({ error: "Could not read that room." }, { status: 400 });
  }

  try {
    await saveProfile(account.username, profile);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save that room." }, { status: 500 });
  }
}
