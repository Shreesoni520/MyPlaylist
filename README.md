<p align="center">
  <img src="src/app/icon.svg" width="72" height="72" alt="Shree's Playlist" />
</p>

<h1 align="center">Shree's Playlist</h1>

<p align="center">
  <strong>A personal music room in the browser.</strong><br />
  Sign in. Set the mood. Drop a YouTube link. Play.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

---

## The idea

Most playlist apps live on someone else's server. This one lives in **your room**.

After login you get a full-screen space: pick a color, photo, or looping `.mp4` for the wall, then drag a glass **Player** and **Edit** window wherever you want. Add songs with a YouTube link. Build playlists. Loop one track or shuffle the lot.

No cloud account. No tracking. Your library stays on this machine.

---

## Features

| | |
| --- | --- |
| **Your room** | Solid color, image upload, image URL, or a silent looping `.mp4` |
| **Floating player** | Drag, resize, minimize, maximize — album art, seek, volume |
| **YouTube songs** | Paste a link; title and artist are optional |
| **Playlists** | Liked Songs, Discover Mix, plus any lists you create |
| **Loop & shuffle** | Off / all / one, plus shuffle, from the `···` menu |
| **Light on dark** | Header text flips black on a light room, white on a dark one |
| **Private by default** | Accounts and tracks are stored in the browser, not a database |

---

## Quick start

```bash
git clone https://github.com/Shreesoni520/MyPlaylist.git
cd MyPlaylist
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create a username, and walk into the room.

| Script | What it does |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## How it works

```
Sign up  →  your room  →  Player + Edit windows
                │
                ├─ Room: color / photo / .mp4
                ├─ Add music: YouTube URL
                └─ Playlists, volume, loop, shuffle
```

- **Auth** is username + password, hashed in the browser (`localStorage`).
- **Room videos** sit in IndexedDB so a looping `.mp4` can be large without blowing storage quotas.
- **Track lookup** goes through `/api/find-track` so a pasted YouTube link can resolve to the full song.

There is no server database to empty. A fresh browser (or a site reset) is a new start.

---

## Stack

- [Next.js 16](https://nextjs.org) App Router + Turbopack
- [React 19](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Base UI](https://base-ui.com) for dialogs, menus, tabs
- [Lucide](https://lucide.dev) icons

---

## Author

**Krishna Soni**

---

## License

Private music room. Built by **Krishna Soni**.
