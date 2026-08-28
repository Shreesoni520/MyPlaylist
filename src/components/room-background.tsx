"use client";

import { useEffect, useState } from "react";
import { backgroundCss } from "@/lib/backgrounds";
import {
  cloudVideoMeta,
  downloadRoomVideo,
  loadRoomVideo,
  saveRoomVideo,
  uploadRoomVideo,
} from "@/lib/room-media";
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

    const stamp = user.background.value;

    async function resolveVideo() {
      let blob = await loadRoomVideo(user.username);
      const meta = await cloudVideoMeta().catch(() => ({ exists: false as const }));

      if (blob && (!meta.exists || meta.stamp !== stamp)) {
        void uploadRoomVideo(blob, stamp).catch(() => undefined);
      }

      if (!blob) {
        blob = (await downloadRoomVideo().catch(() => null)) ?? null;
        if (blob) {
          await saveRoomVideo(user.username, new File([blob], "room.mp4", { type: blob.type || "video/mp4" })).catch(
            () => undefined
          );
        }
      }

      if (cancelled || !blob) {
        if (!cancelled) setVideoUrl(null);
        return;
      }

      const url = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setVideoUrl(url);
    }

    void resolveVideo();

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

  if (user.background.kind === "video") {
    return <div className="absolute inset-0 bg-black" />;
  }

  return (
    <div
      className="absolute inset-0"
      style={{ background: backgroundCss(user.background.value) }}
    />
  );
}
