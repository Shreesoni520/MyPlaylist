"use client";

import { Plus, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlayer } from "@/context/player-context";
import { colorFromName } from "@/lib/music";
import { cn } from "@/lib/utils";

export function ShuffleCards({
  onCreatePlaylist,
}: {
  onCreatePlaylist: () => void;
}) {
  const { playlists, tracks, playTrack, setActivePlaylist, toggleShuffle, isShuffle, library } = usePlayer();

  function openPlaylist(id: string) {
    setActivePlaylist(id);
    const playlist = playlists.find((item) => item.id === id);
    if (playlist?.trackIds.length) playTrack(0, id);
  }

  function shufflePlay() {
    if (!isShuffle) toggleShuffle();
    const pool = tracks.length ? tracks : library;
    if (!pool.length) return;
    const index = Math.floor(Math.random() * pool.length);
    playTrack(index);
  }

  return (
    <section className="w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
            Shuffle cards
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Your mixes</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCreatePlaylist}>
            <Plus data-icon="inline-start" />
            Playlist
          </Button>
          <Button size="sm" onClick={shufflePlay}>
            <Shuffle data-icon="inline-start" />
            Shuffle
          </Button>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {playlists.map((playlist, index) => {
          const coverTrack = library.find((track) => track.id === playlist.trackIds[0]);
          const cover = coverTrack?.cover;
          return (
            <Card
              key={playlist.id}
              size="sm"
              className={cn("w-40 shrink-0 cursor-pointer py-3 transition hover:-translate-y-0.5", index % 2 === 1 && "mt-4")}
              onClick={() => openPlaylist(playlist.id)}
            >
              <CardContent className="px-3">
                <div
                  className="mb-3 aspect-square overflow-hidden rounded-lg bg-muted"
                  style={{ background: cover ? undefined : colorFromName(playlist.name) }}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <p className="truncate text-sm font-medium">{playlist.name}</p>
                <p className="text-muted-foreground text-xs">{playlist.trackIds.length} songs</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
