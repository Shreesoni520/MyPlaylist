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
  getSessionUsername,
  getUser,
  hashPassword,
  isCustomPhoto,
  isValidUsername,
  makeSalt,
  saveUser,
  setSessionUsername,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const didWipe = wipeSiteData();
      if (didWipe) await wipeRoomVideos().catch(() => undefined);
      if (cancelled) return;
      const session = getSessionUsername();
      const current = session ? getUser(session) : null;
      const normalized = current ? withDefaultAvatar(current) : null;
      if (normalized && normalized.avatar !== current?.avatar) saveUser(normalized);
      setUser(normalized);
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const existing = getUser(username);
    if (!existing) throw new Error("No account with that username.");
    const hash = await hashPassword(password, existing.salt);
    if (hash !== existing.passwordHash) throw new Error("Wrong password.");
    const normalized = withDefaultAvatar(existing);
    if (normalized.avatar !== existing.avatar) saveUser(normalized);
    setSessionUsername(normalized.username);
    setUser(normalized);
  }, []);

  const register = useCallback(async (username: string, password: string, confirm: string) => {
    const trimmed = username.trim();
    if (!isValidUsername(trimmed)) {
      throw new Error("Username must be 3-20 letters, numbers, dots, or underscores.");
    }
    if (password.length < 4) throw new Error("Password must be at least 4 characters.");
    if (password !== confirm) throw new Error("Passwords do not match.");
    if (getUser(trimmed)) throw new Error("That username is taken.");
    const salt = makeSalt();
    const passwordHash = await hashPassword(password, salt);
    const account = createAccount(trimmed, passwordHash, salt);
    saveUser(account);
    setSessionUsername(account.username);
    setUser(account);
  }, []);

  const logout = useCallback(() => {
    setSessionUsername(null);
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
