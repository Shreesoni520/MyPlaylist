"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";

const MAX_AVATAR_BYTES = 1_400_000;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function EditProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) setDisplayName(user.displayName);
  }, [open, user]);

  if (!user) return null;

  async function onAvatar(file?: File) {
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Keep the avatar under 1.4MB.");
      return;
    }
    updateUser({ avatar: await readFile(file) });
    toast.success("Avatar updated");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Login username stays @{user.username}. Change the name people see on the player.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={user.username}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Avatar</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => avatarRef.current?.click()}>
              Upload photo
            </Button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void onAvatar(event.target.files?.[0])}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              const name = displayName.trim() || user.username;
              updateUser({ displayName: name });
              toast.success("Display name updated");
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
