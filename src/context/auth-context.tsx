"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applyRoomProfile,
  defaultAvatar,
  getUser,
  isCustomPhoto,
  roomScore,
  saveUser,
  toRoomProfile,
  wipeSiteData,
  withDefaultAvatar,
} from "@/lib/storage";
import { wipeRoomVideos } from "@/lib/room-media";
import type { RoomProfile, UserAccount } from "@/lib/types";

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

async function pushProfile(user: UserAccount) {
  await fetch("/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toRoomProfile(user)),
  });
}

function pickRoom(username: string, serverProfile: RoomProfile | null) {
  const local = getUser(username);
  const fromServer = withDefaultAvatar(applyRoomProfile(username, serverProfile));
  const fromLocal = local ? withDefaultAvatar(local) : null;
  if (fromLocal && roomScore(fromLocal) > roomScore(fromServer)) return fromLocal;
  if (serverProfile) return fromServer;
  return fromLocal ?? fromServer;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);
  const saveTimer = useRef<number | null>(null);

  const openRoom = useCallback(async (username: string, profile: RoomProfile | null) => {
    const picked = pickRoom(username, profile);
    saveUser(picked);
    setUser(picked);
    if (!profile || roomScore(picked) > roomScore(applyRoomProfile(username, profile))) {
      await pushProfile(picked);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const didWipe = wipeSiteData();
      if (didWipe) await wipeRoomVideos().catch(() => undefined);
      if (cancelled) return;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as {
          username?: string | null;
          profile?: RoomProfile | null;
        };
        if (cancelled) return;
        if (data.username) await openRoom(data.username, data.profile ?? null);
        else setUser(null);
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [openRoom]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { username: string; profile: RoomProfile | null };
    await openRoom(data.username, data.profile);
  }, [openRoom]);

  const register = useCallback(async (username: string, password: string, confirm: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, confirm }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { username: string; profile: RoomProfile | null };
    await openRoom(data.username, data.profile);
  }, [openRoom]);

  const logout = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    void fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (patch: UserPatch) => {
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
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          void pushProfile(synced);
        }, 400);
        return synced;
      });
    },
    []
  );

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
