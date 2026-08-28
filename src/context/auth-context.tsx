"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createAccount,
  defaultAvatar,
  getUser,
  isCustomPhoto,
  saveUser,
  wipeSiteData,
  withDefaultAvatar,
} from "@/lib/storage";
import { wipeRoomVideos } from "@/lib/room-media";
import type { UserAccount } from "@/lib/types";

type UserPatch = Partial<UserAccount> | ((current: UserAccount) => UserAccount);

type AuthContextValue = {
  ready: boolean;
  user: UserAccount | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirm: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: UserPatch) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || "Could not continue";
  } catch {
    return "Could not continue";
  }
}

function localProfile(username: string) {
  const existing = getUser(username);
  if (existing) return withDefaultAvatar(existing);
  const created = createAccount(username, "", "");
  saveUser(created);
  return created;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const didWipe = wipeSiteData();
      if (didWipe) await wipeRoomVideos().catch(() => undefined);
      if (cancelled) return;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { username?: string | null };
        if (cancelled) return;
        if (data.username) {
          const profile = localProfile(data.username);
          saveUser(profile);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { username: string };
    setUser(localProfile(data.username));
  }, []);

  const register = useCallback(async (username: string, password: string, confirm: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, confirm }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { username: string };
    setUser(localProfile(data.username));
  }, []);

  const logout = useCallback(() => {
    void fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: UserPatch) => {
    setUser((current) => {
      if (!current) return current;
      const next =
        typeof patch === "function"
          ? patch(current)
          : { ...current, ...patch, username: current.username };
      const named = { ...next, username: current.username };
      const synced = isCustomPhoto(named.avatar)
        ? named
        : { ...named, avatar: defaultAvatar(named.displayName || named.username) };
      if (
        synced.displayName === current.displayName &&
        synced.avatar === current.avatar &&
        synced.volume === current.volume &&
        synced.background.kind === current.background.kind &&
        synced.background.value === current.background.value &&
        synced.playlists === current.playlists &&
        synced.library === current.library
      ) {
        return current;
      }
      saveUser(synced);
      return synced;
    });
  }, []);

  const value = useMemo(
    () => ({ ready, user, login, register, logout, updateUser }),
    [ready, user, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
