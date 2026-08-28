import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type ServerAccount = {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
};

const ACCOUNT_PREFIX = "mp:account:";
const LOCAL_FILE = path.join(process.cwd(), ".data", "accounts.json");

function usernameKey(username: string) {
  return username.trim().toLowerCase();
}

function kvUrl() {
  return process.env.KV_REST_API_URL?.replace(/\/$/, "") ?? "";
}

function kvToken() {
  return process.env.KV_REST_API_TOKEN ?? "";
}

function useKv() {
  return Boolean(kvUrl() && kvToken());
}

export function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function makeSalt() {
  return randomBytes(16).toString("hex");
}

export function passwordsMatch(password: string, account: ServerAccount) {
  const next = hashPassword(password, account.salt);
  const left = Buffer.from(next);
  const right = Buffer.from(account.passwordHash);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function kvSend(command: unknown[]) {
  const response = await fetch(kvUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kvToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Could not reach the account store.");
  }
  return data.result ?? null;
}

async function readLocal(): Promise<Record<string, ServerAccount>> {
  try {
    const raw = await readFile(LOCAL_FILE, "utf8");
    return JSON.parse(raw) as Record<string, ServerAccount>;
  } catch {
    return {};
  }
}

async function writeLocal(accounts: Record<string, ServerAccount>) {
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await writeFile(LOCAL_FILE, JSON.stringify(accounts, null, 2), "utf8");
}

export async function getAccount(username: string) {
  const key = usernameKey(username);
  if (!key) return null;

  if (useKv()) {
    const raw = await kvSend(["GET", `${ACCOUNT_PREFIX}${key}`]);
    if (typeof raw !== "string" || !raw) return null;
    try {
      return JSON.parse(raw) as ServerAccount;
    } catch {
      return null;
    }
  }

  const accounts = await readLocal();
  return accounts[key] ?? null;
}

export async function createAccountRecord(username: string, password: string) {
  const trimmed = username.trim();
  const key = usernameKey(trimmed);
  const salt = makeSalt();
  const account: ServerAccount = {
    username: trimmed,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: Date.now(),
  };

  if (useKv()) {
    const created = await kvSend(["SET", `${ACCOUNT_PREFIX}${key}`, JSON.stringify(account), "NX"]);
    if (created !== "OK") return null;
    return account;
  }

  const accounts = await readLocal();
  if (accounts[key]) return null;
  accounts[key] = account;
  await writeLocal(accounts);
  return account;
}
