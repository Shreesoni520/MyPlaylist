import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ACCOUNT_CLEAN_VERSION } from "@/lib/clean-version";

export type ServerAccount = {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
};

const ACCOUNT_PREFIX = "mp:account:";
const CLEAN_KEY = "mp:clean_version";
const LOCAL_FILE = path.join(process.cwd(), ".data", "accounts.json");
const LOCAL_CLEAN_FILE = path.join(process.cwd(), ".data", "clean-version");

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

async function kvScan(pattern: string) {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const result = await kvSend(["SCAN", cursor, "MATCH", pattern, "COUNT", 100]);
    const pair = Array.isArray(result) ? result : ["0", []];
    cursor = String(pair[0] ?? "0");
    const batch = Array.isArray(pair[1]) ? (pair[1] as string[]) : [];
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

async function deleteAllAccounts() {
  if (useKv()) {
    const keys = await kvScan(`${ACCOUNT_PREFIX}*`);
    if (keys.length) await kvSend(["DEL", ...keys]);
    await kvSend(["SET", CLEAN_KEY, ACCOUNT_CLEAN_VERSION]);
    return;
  }

  await writeLocal({});
  await mkdir(path.dirname(LOCAL_CLEAN_FILE), { recursive: true });
  await writeFile(LOCAL_CLEAN_FILE, ACCOUNT_CLEAN_VERSION, "utf8");
}

async function currentCleanVersion() {
  if (useKv()) {
    const raw = await kvSend(["GET", CLEAN_KEY]);
    return typeof raw === "string" ? raw : "";
  }
  try {
    return (await readFile(LOCAL_CLEAN_FILE, "utf8")).trim();
  } catch {
    return "";
  }
}

export async function applyAccountClean() {
  const current = await currentCleanVersion();
  if (current === ACCOUNT_CLEAN_VERSION) return;
  await deleteAllAccounts();
}

export async function getAccount(username: string) {
  await applyAccountClean();
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
  await applyAccountClean();
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
