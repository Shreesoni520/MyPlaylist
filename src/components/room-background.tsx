"use client";

import { useEffect, useState } from "react";
import { backgroundCss } from "@/lib/backgrounds";
import { loadRoomVideo } from "@/lib/room-media";
import type { UserAccount } from "@/lib/types";

export function RoomBackground({ user }: { user: UserAccount }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (user.background.kind !== "video") {
      setVideoUrl(null);
      return;
    }

    void loadRoomVideo(user.username)
      .then((blob) => {
        if (cancelled || !blob) {
          setVideoUrl(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setVideoUrl(url);
      })
      .catch(() => {
        if (!cancelled) setVideoUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user.username, user.background.kind, user.background.value]);

  if (user.background.kind === "video" && videoUrl) {
    return (
      <video
        className="absolute inset-0 size-full object-cover"
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      style={{ background: backgroundCss(user.background.value) }}
    />
  );
}
