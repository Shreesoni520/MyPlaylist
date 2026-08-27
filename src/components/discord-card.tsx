"use client";

import { Headphones, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { usePlayer } from "@/context/player-context";

export function DiscordCard({ onEdit }: { onEdit: () => void }) {
  const { user } = useAuth();
  const { currentTrack, isPlaying } = usePlayer();
  if (!user) return null;

  return (
    <Card className="w-full max-w-[320px] overflow-hidden py-0 shadow-sm">
      <div className="h-16 bg-muted" />
      <CardContent className="relative px-4 pt-0 pb-4">
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <div className="relative">
            <Avatar size="lg" className="size-16 ring-4 ring-card">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="border-card absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-4 bg-foreground" />
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit profile">
            <Pencil />
          </Button>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-lg leading-none font-semibold">{user.displayName}</p>
          <p className="text-muted-foreground mt-1 text-xs">@{user.username}</p>
          <div className="bg-background mt-3 flex items-start gap-2 rounded-lg p-2.5">
            <Headphones className="mt-0.5 size-4" />
            <div className="min-w-0">
              <Badge variant="outline" className="mb-1 uppercase">
                {isPlaying ? "Listening" : "Player"}
              </Badge>
              <p className="truncate text-sm font-medium">
                {currentTrack?.title ?? "Nothing playing"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {currentTrack?.artist ?? "Press the pencil to edit"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
