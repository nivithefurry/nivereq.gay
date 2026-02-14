import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { url } from "inspector";

dotenv.config();

const app = express();
const PORT = 3000;

// __dirname fix dla ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
// jeśli masz index.html w głównym folderze — zmień na __dirname

// 🔥 API endpoint np. Last.fm
app.get("/api/lastfm", async (req, res) => {
  const username = process.env.LASTFM_USER;
  const apiKey = process.env.LASTFM_KEY;

  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`,
  );

  const data = await response.json();
  const track = data.recenttracks.track[0];

  // wybieramy największy obrazek
  const albumArt = track.image[3]["#text"];
  res.json({
    artist: track.artist["#text"],
    name: track.name,
    albumArt: albumArt,
    nowPlaying: track["@attr"] ? track["@attr"].nowplaying : false,
    date: track.date
      ? {
          uts: track.date.uts,
        }
      : null,
      url: track.url || null,
  });
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
