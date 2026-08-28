import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { applyAccountClean, getAccount, getProfile } from "@/lib/account-store";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await applyAccountClean();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const username = readSession(token);
  if (!username) {
    return NextResponse.json({ username: null, profile: null });
  }

  const account = await getAccount(username);
  if (!account) {
    return NextResponse.json({ username: null, profile: null });
  }

  const profile = await getProfile(account.username);
  return NextResponse.json({ username: account.username, profile });
}
