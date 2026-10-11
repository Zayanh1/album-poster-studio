# Sleeve — Album Poster Studio

A local-first album poster editor. Original template, metadata search, your artwork, automatic colors, an actual artwork border, and high-resolution exports. No runtime packages or paid API keys are required.

## Open instantly

Double-click `OPEN-STUDIO.html` to use the editor, local image uploads, palettes, borders, and SVG/PNG exports without installing anything. Album search needs the server below; the standalone file explains that when you search.

## Run it with album search

1. Install Node.js 22.9 or newer from https://nodejs.org/.
2. Extract this folder. On Windows, double-click `START-WINDOWS.cmd`. Alternatively, open a terminal in this folder and run `npm start`.
3. Open http://127.0.0.1:3000. If the Windows launcher opened before the server started, refresh the page.

The original fictional demo, local uploads, editing, palettes, and exports work immediately. No copyrighted album covers are bundled. Nothing is published by starting this server; it binds to localhost by default.

### Enable album search

Copy `.env.example` to `.env`. Set `MUSICBRAINZ_USER_AGENT` to the application name/version and **your real contact email or website**, as MusicBrainz requires. Restart the server. No API key is needed.

Example shape (replace the contact, do not use a fake identity):

```
MUSICBRAINZ_USER_AGENT="SleeveAlbumPosterStudio/0.1.0 (your-real-contact)"
```

Search matches album title or artist. Selecting a result fills title, artist, release date, label, track names, and runtime when all track durations are available. The selected edition is linked for verification. The server browses at most 100 editions, prefers the earliest dated official edition in that response, and prefers digital when dates tie. It cannot guarantee the globally earliest edition for albums with more than 100 editions. Review the edition and edit the metadata as needed.

MusicBrainz calls use a shared queue at least 1.1 seconds apart, a bounded cache, deduplication, timeouts, and response/queue limits. One process handles the queue; multiple deployment instances would need a shared limiter.

## Make a poster

1. Search for a record or expand **Edit album details** and enter the information yourself.
2. Upload a PNG, JPEG, or WebP you have rights to reproduce. Its original pixels are embedded, its complete shape is preserved, and its palette is extracted locally. Uploads never go to the server.
3. Choose a print size, paper mood, colors, and border thickness/color. The image has a real, separate border.
4. Optionally add a genuine Spotify Code, as described below.
5. Export SVG, 150/300-DPI PNG, or open Print / PDF. PNG files include physical-resolution metadata. At 18 × 24 inches, 300 DPI produces 5,400 × 7,200 pixels.

The effective artwork PPI is shown. A larger PNG does not recover fine detail missing from a small cover image. SVG keeps typography, border, and layout in vectors, while photographs remain embedded raster images. Text uses Arial/Helvetica/system sans-serif, so its appearance can vary between SVG editors; print from the same browser for a consistent font choice. PDF uses the browser's print dialog: choose the intended custom paper size, zero margins, 100% scale, and background graphics. Use SVG if the browser or driver cannot honor custom paper sizes.

### Authentic Spotify Codes

MusicBrainz sometimes includes a verified Spotify album relation. If it does not, paste the album's full Spotify share URL or URI. The app never guesses Spotify IDs.

1. Copy the canonical URI using **Copy URI**.
2. Open https://www.spotifycodes.com/ and paste it into Spotify's generator.
3. Download the complete SVG or PNG and import it. The editor embeds the supplied asset unchanged; it does not generate lookalike bars or modify Spotify's logo.
4. Scan it with Spotify's in-app scanner and confirm it opens the displayed album. Test again on an actual-size print before production.

**Automatic Code downloading is deliberately not implemented.** Research found no documented public Spotify Codes generation API. The official generator/import flow is the supported integration in this version. The app checks file safety and image shape but does not decode Codes or independently certify the target; that is why the scan confirmation matters. Editing the destination removes the old Code.

## Copyright and service terms

This editor is not legal clearance and cannot guarantee that a use will avoid a claim. A rights checkbox records the user's representation; it does not license any work. Owning a physical/digital album or finding a cover online is not permission to reproduce the artwork. Personal use is not blanket permission. Use original, appropriately licensed, or verified public-domain artwork and retain permission records.

The app does **not** auto-download album covers from Spotify, iTunes, or Cover Art Archive. Free access to those images is not a license to reproduce them in poster exports. MusicBrainz core metadata licensing does not cover album art. Licensing an artwork source for exports is the appropriate next step if automatic cover imports are a launch requirement.

Spotify's current Code terms prohibit Codes directly on products sold, require compliance with placement/color rules, prohibit modification, and grant no rights to accompanying artwork. There is no poster checkout, marketplace, or sales feature in this project. A public commercial service should be reviewed for artwork licenses, service/API terms, trademarks, a privacy policy, abuse reporting, and any applicable notice-and-takedown obligations before launch. MusicBrainz's public API is free for noncommercial use; commercial use requires its appropriate arrangement.

Sources checked October 10, 2026:

- Spotify Codes terms: https://www.spotifycodes.com/assets/Terms_and_Conditions_for_Spotify_Codes_2025_10_09.pdf
- Spotify generator and print guidance: https://www.spotifycodes.com/
- MusicBrainz API access/rate limits: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz core metadata and cover-art exclusions: https://musicbrainz.org/doc/About/Data_License
- U.S. Copyright Office permission/fair-use FAQ: https://www.copyright.gov/help/faq/faq-fairuse.html
- Apple promotional-content terms: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

## Privacy and scope

Artwork and Code files stay in page memory; exports are assembled on the device. Reloading discards the design. Search queries and album identifiers reach this server and MusicBrainz. The app itself writes no request log, but hosting providers may. Links to MusicBrainz, Spotify, and the official generator open those services. Permission notes stay in page memory and are not exported or independently verified. No accounts, analytics, uploads, database, or public gallery.

This is a runnable MVP, not an already-hosted public website. It needs an HTTPS deployment and production review before opening it to public users. Node's built-in server is intentionally minimal; a production reverse proxy should enforce request throttling and operational monitoring.

## Validation

Run `npm test` for the server/renderer tests. They cover safe text/URI handling, track count, exact print dimensions, original image embedding, genuine Code inclusion, contact configuration, metadata edition handling, rate limiting, caching, queue bounds, and traversal protection using controlled upstream fixtures.

External MusicBrainz and Spotify/cover-art hosts returned HTTP 403 in the development environment. A browser engine was unavailable and its download was also blocked, so browser end-to-end behavior was not verified in this environment. Live album lookup success was not verified here; the API integration is tested against deterministic fixtures. The UI reports service failures instead of pretending a lookup succeeded.

## Project files

- `server.mjs`: same-origin static server and MusicBrainz proxy
- `public/index.html`, `public/styles.css`, `public/app.js`: editor
- `public/renderer.js`: self-contained SVG print renderer and palette extraction
- `tests/`: Node's built-in test suite

No copyrighted album artwork, fabricated Spotify Codes, third-party runtime libraries, API secrets, or node_modules are distributed with this project.
