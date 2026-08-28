"use client";

import { useEffect, useState } from "react";
import { Monitor, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

function isPhoneOrTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return true;
  const touchMac = navigator.maxTouchPoints > 1 && /MacIntel/i.test(navigator.platform);
  return touchMac;
}

export function DesktopGate({ children }: { children: React.ReactNode }) {
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  useEffect(() => {
    setDeviceBlocked(isPhoneOrTablet());
  }, []);

  return (
    <>
      <div className={cn(deviceBlocked ? "hidden" : "max-lg:hidden")}>{children}</div>
      <div
        className={cn(
          "min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-center",
          deviceBlocked ? "flex" : "hidden max-lg:flex"
        )}
      >
        <div className="mb-8 flex items-center gap-2 text-sm font-medium">
          <Music2 className="size-4" />
          Shree&apos;s Playlist
        </div>
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border bg-card">
          <Monitor className="size-6" />
        </div>
        <p className="text-muted-foreground mb-3 text-sm">Desktop only</p>
        <h1 className="max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
          This music room needs a bigger screen.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-md text-base leading-7">
          Shree&apos;s Playlist is a desktop music room in the browser. The Player and Edit panels
          float on a full-screen background, so they need a large screen — a Windows PC, a Mac, or
          another desktop or laptop. Phones, tablets, and small screens are not supported.
        </p>
        <p className="text-muted-foreground mt-4 max-w-md text-sm leading-6">
          Open this site in Chrome, Safari, Edge, or another browser on a computer. There is no
          phone app, and the room will not load on a mobile screen.
        </p>
      </div>
    </>
  );
}
