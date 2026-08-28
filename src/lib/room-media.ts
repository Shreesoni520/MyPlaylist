const DB_NAME = "mp_room_media_v1";
const STORE = "videos";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isMp4File(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return name.endsWith(".mp4") && (type === "" || type === "video/mp4");
}

export async function saveRoomVideo(username: string, file: File) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, username.trim().toLowerCase());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRoomVideo(username: string) {
  const db = await openDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(username.trim().toLowerCase());
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function wipeRoomVideos() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

export async function deleteRoomVideo(username: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(username.trim().toLowerCase());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const CLOUD_CHUNK = 600_000;

export async function cloudVideoMeta() {
  const response = await fetch("/api/auth/video", { cache: "no-store" });
  if (!response.ok) return { exists: false as const };
  return (await response.json()) as {
    exists: boolean;
    stamp?: string;
    chunks?: number;
    size?: number;
    type?: string;
  };
}

export async function uploadRoomVideo(file: Blob, stamp: string) {
  const chunks = Math.max(1, Math.ceil(file.size / CLOUD_CHUNK));
  const init = await fetch("/api/auth/video", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "init",
      stamp,
      size: file.size,
      type: file.type || "video/mp4",
      chunks,
    }),
  });
  if (!init.ok) throw new Error("Could not start video upload.");
  for (let index = 0; index < chunks; index++) {
    const slice = file.slice(index * CLOUD_CHUNK, (index + 1) * CLOUD_CHUNK);
    const posted = await fetch(`/api/auth/video?index=${index}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: slice,
    });
    if (!posted.ok) throw new Error("Could not upload that video.");
  }
  const done = await fetch("/api/auth/video", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete" }),
  });
  if (!done.ok) throw new Error("Could not finish video upload.");
}

export async function downloadRoomVideo() {
  const meta = await cloudVideoMeta();
  if (!meta.exists || !meta.chunks) return null;
  const parts: Blob[] = [];
  for (let index = 0; index < meta.chunks; index++) {
    const response = await fetch(`/api/auth/video?index=${index}`, { cache: "no-store" });
    if (!response.ok) return null;
    parts.push(await response.blob());
  }
  return new Blob(parts, { type: meta.type || "video/mp4" });
}

export async function deleteCloudVideo() {
  await fetch("/api/auth/video", { method: "DELETE" }).catch(() => undefined);
}
