# Album Poster Studio 🎨🎵

A print-ready album poster studio with authentic Spotify codes, high-resolution cover art finder, atmospheric aura lighting, automatic color palette extraction, and 300 DPI physical exports.

Zero third-party runtime dependencies. Works entirely local-first.

![Album Poster Studio](https://raw.githubusercontent.com/Zayanh1/album-poster-studio/main/public/favicon.svg)

---

## ✨ Features

- **Atmospheric Artwork Aura (`art-aura`)**:
  - Recreates the iconic album poster bleed effect (inspired by Cactus Jack / *Life of a DON*).
  - Ambient gaussian blur and dark vignette dynamically radiate the artwork's dominant color outward onto the canvas.
- **Authentic Transparent Spotify Codes**:
  - Auto-pulls authentic Spotify codes directly by album search or Spotify URL.
  - Transparent, backgroundless SVG integration seamlessly matching your poster's typography and background.
- **HD Artwork Finder**:
  - Integrated high-resolution cover art search across iTunes, MusicHoarders, and Cover Art Archive.
  - One-click import with embedded high-fidelity pixels.
- **Chroma-Weighted Palette Extraction**:
  - Extracts the dominant color accents from uploaded covers, weighting saturation so signature vibrant hues (crimson red, warm amber, electric blue) are never overpowered by dark borders.
  - Compact, contiguous rectangular swatch blocks beside the title.
- **Print-Ready Physical Dimensions**:
  - Supports standard print formats: 18 × 24 in, 12 × 18 in, 24 × 36 in, A2, A3, A4, and 12 × 12 in square.
  - Crystal-clear SVG exports and 300 DPI PNG with true physical resolution headers (`pHYs` chunks) for high-end giclée printing.
- **Sleek Studio Dark Mode**:
  - Fully bespoke dark theme crafted for late-night designing, with instantaneous light/dark toggle.
- **Zero Runtime Dependencies**:
  - Built with pure Node.js (22.9+) standard library and modern vanilla JavaScript. No heavy frontend frameworks or bloated `node_modules`.
- **Standalone Offline Mode**:
  - Open `OPEN-STUDIO.html` anywhere without a server to design, customize, and export posters completely offline.

---

## 🚀 Quick Start

### 1. Instant Offline Mode (No Install Required)
Simply double-click **`OPEN-STUDIO.html`** in your browser. All editing, local uploads, palette generation, and SVG/PNG exports work completely client-side.

### 2. Full Studio (With Album & Artwork Search)

1. Ensure **Node.js 22.9+** is installed:
   ```bash
   node -v
   ```

2. Clone this repository:
   ```bash
   git clone https://github.com/Zayanh1/album-poster-studio.git
   cd album-poster-studio
   ```

3. (Optional) Configure your MusicBrainz contact in `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include your contact email or website in `MUSICBRAINZ_USER_AGENT`.

4. Start the studio:
   - On Windows: Double-click **`START-WINDOWS.cmd`** or run:
     ```bash
     npm start
     ```
   - On macOS / Linux:
     ```bash
     npm start
     ```

5. Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl` / `Cmd` + `E` | Export 300 DPI print-ready PNG |
| `Ctrl` / `Cmd` + `Shift` + `E` | Export vector SVG |
| `Ctrl` / `Cmd` + `C` | Copy SVG markup to clipboard |
| `Ctrl` / `Cmd` + `P` | Open browser Print / PDF dialog |
| `Ctrl` / `Cmd` + `V` | Paste image from clipboard |
| `?` | Toggle shortcuts cheatsheet modal |

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js standard library (`http`, `crypto`, `fs`, `path`). Zero external npm runtime packages.
- **Metadata Proxy**: Rate-limited (1.1s queue) MusicBrainz client with deduplication and caching.
- **Artwork Search**: Concurrent querying across Apple iTunes Search API, MusicHoarders, and CAA.
- **Spotify Code Generator**: Native SVG parser extracting bar vectors while stripping opaque backgrounds.
- **Renderer**: Pure procedural SVG generation engine in `public/renderer.js` supporting dynamic text wrapping, column layouts, custom paper moods, and raster embedding.
- **Color Engine**: Client-side canvas pixel sampling with saturation/chroma weighting.

---

## 🧪 Testing

Run the automated test suite covering SVG safety, dimensions, DPI metadata, rate limiting, and input sanitization:

```bash
npm test
```

To recompile the single-file offline bundle:

```bash
npm run build:offline
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
