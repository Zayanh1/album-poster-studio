import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const artistName = credits => (credits || []).map(c => `${c.name || c.artist?.name || ''}${c.joinphrase || ''}`).join('');
const spotifyLink = entity => (entity.relations || []).map(r => r.url?.resource).find(url => /^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]{22}(?:\?|$)/.test(url || ''));

export function createMusicBrainzClient({ fetchImpl = globalThis.fetch, userAgent = process.env.MUSICBRAINZ_USER_AGENT || '', intervalMs = 1100, timeoutMs = 12000, maxPending = 24, cacheSize = 100, cacheTtlMs = 15 * 60 * 1000 } = {}) {
  let chain = Promise.resolve(), nextStart = 0, pending = 0;
  const cache = new Map(), inflight = new Map();
  const configured = /@|https?:\/\//i.test(userAgent) && userAgent.trim().length >= 12 && !/example\.(com|org)|your[-_ ]?(email|contact)|you@/i.test(userAgent);
  async function run(endpoint) {
    const wait = nextStart - Date.now();
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    nextStart = Date.now() + intervalMs;
    let response;
    try {
      response = await fetchImpl(`https://musicbrainz.org/ws/2/${endpoint}`, { headers: { Accept: 'application/json', 'User-Agent': userAgent }, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new ApiError(response.status === 404 ? 404 : 502, response.status === 404 ? 'Album was not found in MusicBrainz.' : 'MusicBrainz is temporarily unavailable. Try again shortly.');
      if (Number(response.headers.get('content-length')) > 2_000_000) throw new ApiError(502, 'MusicBrainz response exceeded the size limit.');
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > 2_000_000) { await response.body.cancel().catch(() => {}); throw new ApiError(502, 'MusicBrainz response exceeded the size limit.'); }
        chunks.push(Buffer.from(chunk));
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'Could not read MusicBrainz metadata. Check your connection and try again.');
    }
  }
  function get(endpoint) {
    if (!configured) return Promise.reject(new ApiError(503, 'Album search needs a MusicBrainz contact identifier. Set MUSICBRAINZ_USER_AGENT to your app name/version and your real contact email or website, then restart. Uploading your own image and entering details still works.'));
    const hit = cache.get(endpoint);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
    if (hit) cache.delete(endpoint);
    if (inflight.has(endpoint)) return inflight.get(endpoint);
    if (pending >= maxPending) return Promise.reject(new ApiError(429, 'Album lookup is busy. Please wait and try again.'));
    pending++;
    const promise = chain.then(() => run(endpoint)).then(data => {
      if (cache.size >= cacheSize) cache.delete(cache.keys().next().value);
      cache.set(endpoint, { data, expires: Date.now() + cacheTtlMs });
      return data;
    }).finally(() => { pending--; inflight.delete(endpoint); });
    chain = promise.catch(() => {});
    inflight.set(endpoint, promise);
    return promise;
  }
  return {
    async search(query) {
      // Quoting prevents the input from becoming MusicBrainz/Lucene query operators.
      const quoted = query.replace(/[\\"]/g, '\\$&');
      const q = `(releasegroup:"${quoted}" OR artist:"${quoted}") AND primarytype:album`;
      const data = await get(`release-group/?query=${encodeURIComponent(q)}&fmt=json&limit=12`);
      return { results: (data['release-groups'] || []).slice(0, 12).map(group => ({ id: group.id, title: group.title, artist: artistName(group['artist-credit']), date: group['first-release-date'] || '', sourceUrl: `https://musicbrainz.org/release-group/${group.id}` })) };
    },
    async album(id) {
      const group = await get(`release-group/${id}?inc=artist-credits+url-rels&fmt=json`);
      // A group lookup embeds at most 25 editions. Browse one bounded page of
      // 100 instead, so edition selection has broader coverage without an
      // unbounded request chain. This is the earliest of those returned editions.
      const editions = await get(`release?release-group=${id}&inc=media+url-rels&limit=100&offset=0&fmt=json`);
      const candidates = (editions.releases || []).slice(0, 100).filter(r => UUID.test(r.id || '') && r.status === 'Official');
      const digital = release => (release.media || []).some(m => m.format === 'Digital Media') ? 1 : 0;
      // Missing dates sort last. At the same date prefer a digital edition,
      // which is generally a closer match to streaming album track lists.
      candidates.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || digital(b) - digital(a) || a.id.localeCompare(b.id));
      if (!candidates.length) throw new ApiError(404, 'No official album release was found. You can enter its details manually.');
      const release = await get(`release/${candidates[0].id}?inc=recordings+artist-credits+labels+url-rels&fmt=json`);
      const tracks = (release.media || []).flatMap(medium => (medium.tracks || []).map(track => ({ title: track.title || track.recording?.title || 'Untitled', durationMs: Number.isFinite(track.length) ? track.length : Number.isFinite(track.recording?.length) ? track.recording.length : null })));
      const editionsSpotify = (editions.releases || []).map(r => spotifyLink(r)).find(Boolean);
      return { title: group.title || release.title, artist: artistName(group['artist-credit'] || release['artist-credit']), date: group['first-release-date'] || release.date || '', label: [...new Set((release['label-info'] || []).map(x => x.label?.name).filter(Boolean))].join(', '), tracks, durationMs: tracks.length && tracks.every(t => t.durationMs !== null) ? tracks.reduce((sum, t) => sum + t.durationMs, 0) : null, releaseId: release.id, releaseGroupId: id, sourceUrl: `https://musicbrainz.org/release/${release.id}`, spotifyUrl: spotifyLink(release) || spotifyLink(group) || editionsSpotify || null };
    }
  };
}

export async function searchArtwork(query, releaseGroupId = '') {
  const results = [];
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=8`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      for (const item of (data.results || [])) {
        if (item.artworkUrl100) {
          const highResUrl = item.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, '/3000x3000bb.$1');
          results.push({
            source: 'Apple Music / iTunes (3000px)',
            title: item.collectionName || query,
            artist: item.artistName || '',
            url: highResUrl,
            thumb: item.artworkUrl100,
            width: 3000,
            height: 3000
          });
        }
      }
    }
  } catch {}

  if (releaseGroupId && UUID.test(releaseGroupId)) {
    try {
      const res = await fetch(`https://coverartarchive.org/release-group/${releaseGroupId}`, {
        headers: { 'User-Agent': 'SleeveAlbumPosterStudio/0.1.0 (info@sleevestudio.net)' },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const front = (data.images || []).find(i => i.front) || data.images?.[0];
        if (front) {
          results.push({
            source: 'Cover Art Archive',
            title: query,
            artist: '',
            url: front.image,
            thumb: front.thumbnails?.['250'] || front.image,
            width: 1200,
            height: 1200
          });
        }
      }
    } catch {}
  }

  try {
    const res = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=4`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      for (const item of (data.data || [])) {
        if (item.cover_xl) {
          results.push({
            source: 'Deezer (1000px)',
            title: item.title,
            artist: item.artist?.name || '',
            url: item.cover_xl,
            thumb: item.cover_medium || item.cover_xl,
            width: 1000,
            height: 1000
          });
        }
      }
    }
  } catch {}

  return results;
}

export const KNOWN_SPOTIFY_ALBUMS = [
  { match: ['discovery', 'daft punk'], url: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc' },
  { match: ['random access memories', 'daft punk'], url: 'https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa' },
  { match: ['dark side of the moon', 'pink floyd'], url: 'https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv' },
  { match: ['wish you were here', 'pink floyd'], url: 'https://open.spotify.com/album/0bCAjiUamIFqKJRB8Q50cr' },
  { match: ['the wall', 'pink floyd'], url: 'https://open.spotify.com/album/5E2fcv7Xq2Z8A9jL9uA6vX' },
  { match: ['ok computer', 'radiohead'], url: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE' },
  { match: ['in rainbows', 'radiohead'], url: 'https://open.spotify.com/album/7eyQXurudC9Y7toxthR74m' },
  { match: ['kid a', 'radiohead'], url: 'https://open.spotify.com/album/6ofigbVq39i4tX8u76zE42' },
  { match: ['rumours', 'fleetwood mac'], url: 'https://open.spotify.com/album/1TEowX5k7nvSR1VzSotWM0' },
  { match: ['fleetwood mac', 'fleetwood mac'], url: 'https://open.spotify.com/album/1v1U2H2e1Yh8d7F5a4N7uX' },
  { match: ['kind of blue', 'miles davis'], url: 'https://open.spotify.com/album/1weenldGvE43s0P5Y0T8fM' },
  { match: ['damn', 'kendrick lamar'], url: 'https://open.spotify.com/album/4eLPsYPBmXABThSJuc2Nd2' },
  { match: ['to pimp a butterfly', 'kendrick lamar'], url: 'https://open.spotify.com/album/7ycBtnsMtyVbbm3gg4R2aF' },
  { match: ['good kid', 'kendrick lamar'], url: 'https://open.spotify.com/album/748dZDzSWR6SIjsPtFKLL5' },
  { match: ['blonde', 'frank ocean'], url: 'https://open.spotify.com/album/3mH6qwIy9crq0I9YQbOuDf' },
  { match: ['channel orange', 'frank ocean'], url: 'https://open.spotify.com/album/392ttqqnvGdi2vs8ph1V7v' },
  { match: ['igor', 'tyler'], url: 'https://open.spotify.com/album/5zi7WsKlIiUXv09tbGLKsE' },
  { match: ['call me if you get lost', 'tyler'], url: 'https://open.spotify.com/album/4LLpKhyESsy2mZgK3f2pk9' },
  { match: ['my beautiful dark twisted fantasy', 'kanye'], url: 'https://open.spotify.com/album/20r762YmB5HeofjMCiPMLv' },
  { match: ['graduation', 'kanye'], url: 'https://open.spotify.com/album/4SZko61aJmgvfq4Y1YALm3' },
  { match: ['abbey road', 'beatles'], url: 'https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN' },
  { match: ['sgt pepper', 'beatles'], url: 'https://open.spotify.com/album/6QaVfG1pHYl1z15Zxkv98Q' },
  { match: ['nevermind', 'nirvana'], url: 'https://open.spotify.com/album/2guirTSEqLizK7j9i1MTTZ' },
  { match: ['thriller', 'michael jackson'], url: 'https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ' },
  { match: ['am', 'arctic monkeys'], url: 'https://open.spotify.com/album/78bpIziExqiI91ztvNflRv' },
  { match: ['currents', 'tame impala'], url: 'https://open.spotify.com/album/79dL7FLiJFOO0Eoeh0Far0' },
  { match: ['after hours', 'the weeknd'], url: 'https://open.spotify.com/album/4yP0hdKOJeuKRuqYjkiKOQ' },
  { match: ['starboy', 'the weeknd'], url: 'https://open.spotify.com/album/2ODvWsOgouMbaA5xf0RkJe' },
  { match: ['life of a don', 'don toliver'], url: 'https://open.spotify.com/album/32lwtR8y2bcvwN8sZp0Z1T' },
  { match: ['folklore', 'taylor swift'], url: 'https://open.spotify.com/album/2fenSS68JI1h4Fo296JfGr' },
  { match: ['1989', 'taylor swift'], url: 'https://open.spotify.com/album/5eyZZoQEFQWRogzs2ryRbS' },
  { match: ['sos', 'sza'], url: 'https://open.spotify.com/album/07w0rG59zb6cr9NV8Vaio5' },
  { match: ['melodrama', 'lorde'], url: 'https://open.spotify.com/album/2B87zXm9bOWvAJLWY9SVzx' },
  { match: ['born to die', 'lana del rey'], url: 'https://open.spotify.com/album/4adSOh588Z9kR39o2q6xZ1' },
  { match: ['astroworld', 'travis scott'], url: 'https://open.spotify.com/album/41GuYZcammAqq6ygDCY2Mu' },
  { match: ['utopia', 'travis scott'], url: 'https://open.spotify.com/album/18NOKLkZETSbGxpbSnlrjK' },
  { match: ['when we all fall asleep', 'billie eilish'], url: 'https://open.spotify.com/album/0S0KGZnfBGSI3NXIrUQMuM' },
  { match: ['swimming', 'mac miller'], url: 'https://open.spotify.com/album/5wtE5VerSq6y4r46svMe73' },
  { match: ['circles', 'mac miller'], url: 'https://open.spotify.com/album/5sY6UIQcb2E03mGcwKAbyZ' },
  { match: ['morning glory', 'oasis'], url: 'https://open.spotify.com/album/1VW1jJ78RlZ7DYDo26KZCX' },
  { match: ['night at the opera', 'queen'], url: 'https://open.spotify.com/album/1GbtB4zTqAsyfZEsm1RZfx' },
  { match: ['led zeppelin iv', 'led zeppelin'], url: 'https://open.spotify.com/album/5Ey50VVxul3B27RirvhuX8' },
  { match: ['purple rain', 'prince'], url: 'https://open.spotify.com/album/7nXJ5k4rqRZaGE9Vk0hB9R' },
  { match: ['pet sounds', 'beach boys'], url: 'https://open.spotify.com/album/6GphKx2qzaJJQXgtABvgvC' },
  { match: ['illmatic', 'nas'], url: 'https://open.spotify.com/album/3kEtdS2v6ejzg29ioCiHN7' },
  { match: ['back to black', 'amy winehouse'], url: 'https://open.spotify.com/album/0eFHYz8NmK75zSplL5qlAh' },
  { match: ['21', 'adele'], url: 'https://open.spotify.com/album/0Lg1grvpubQ7jsdEu5ea3v' },
  { match: ['whole lotta red', 'playboi carti'], url: 'https://open.spotify.com/album/2QRedhPohRm7NIJebNuTCx' }
];

export async function searchSpotifyAlbum(query, releaseGroupId = '') {
  const qClean = String(query || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // 1. Check official Spotify Web API if client credentials configured in environment
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (clientId && clientSecret && query) {
    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(5000)
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=1`, {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
          signal: AbortSignal.timeout(5000)
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const item = searchData.albums?.items?.[0];
          if (item) {
            return {
              found: true,
              uri: item.uri,
              spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/album/${item.id}`,
              name: item.name,
              artist: item.artists?.[0]?.name
            };
          }
        }
      }
    } catch {}
  }

  // 2. Check curated database match
  if (qClean) {
    for (const entry of KNOWN_SPOTIFY_ALBUMS) {
      const allMatch = entry.match.every(m => qClean.includes(m));
      if (allMatch) {
        const m = entry.url.match(/album\/([A-Za-z0-9]{22})/);
        return {
          found: true,
          uri: m ? `spotify:album:${m[1]}` : entry.url,
          spotifyUrl: entry.url
        };
      }
    }
  }

  // 3. Check MusicBrainz release-group digital releases if releaseGroupId is provided
  if (releaseGroupId && UUID.test(releaseGroupId)) {
    try {
      const res = await fetch(`https://musicbrainz.org/ws/2/release?release-group=${releaseGroupId}&inc=url-rels&limit=100&fmt=json`, {
        headers: { 'User-Agent': process.env.MUSICBRAINZ_USER_AGENT || 'SleeveAlbumPosterStudio/0.1.0 (info@sleevestudio.net)' },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        for (const rel of (data.releases || [])) {
          for (const r of (rel.relations || [])) {
            const url = r.url?.resource || '';
            const m = url.match(/^https:\/\/open\.spotify\.com\/album\/([A-Za-z0-9]{22})/);
            if (m) {
              return {
                found: true,
                uri: `spotify:album:${m[1]}`,
                spotifyUrl: `https://open.spotify.com/album/${m[1]}`
              };
            }
          }
        }
      }
    } catch {}
  }

  return { found: false };
}


export async function fetchSpotifyCode(inputUriOrUrl, { transparent = true, barColor = '' } = {}) {
  let uri = String(inputUriOrUrl || '').trim();
  if (uri.startsWith('http')) {
    const m = uri.match(/album\/([A-Za-z0-9]{22})/);
    if (m) uri = `spotify:album:${m[1]}`;
  }
  if (!/^spotify:album:[A-Za-z0-9]{22}$/.test(uri)) {
    throw new ApiError(400, 'Invalid Spotify album URI or URL.');
  }
  const codeUrl = `https://scannables.scdn.co/uri/plain/svg/000000/white/640/${encodeURIComponent(uri)}`;
  const res = await fetch(codeUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new ApiError(502, 'Could not fetch Spotify code from Spotify servers.');
  let svgText = await res.text();
  if (!svgText.trim().startsWith('<svg') || svgText.includes('<script')) {
    throw new ApiError(502, 'Received invalid SVG code from Spotify.');
  }

  // Make the Spotify Code backgroundless: remove the full-bleed solid background rect
  if (transparent) {
    svgText = svgText.replace(/<rect\s+[^>]*?(?:width=["'](?:400|100%|640)["'][^>]*?height=["'](?:100|100%|160)["']|height=["'](?:100|100%|160)["'][^>]*?width=["'](?:400|100%|640)["'])[^>]*\/?>\s*/i, '');
  }

  // If a bar color is specified, tint the bars & Spotify logo to integrate with the poster palette
  if (barColor && /^#[0-9a-f]{6}$/i.test(barColor)) {
    svgText = svgText.replace(/fill=["']#ffffff["']/gi, `fill="${barColor}"`);
  }

  return {
    uri,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`,
    width: 640,
    height: 160
  };
}

export async function proxyImage(imageUrl, res) {
  let parsed;
  try { parsed = new URL(imageUrl); } catch { throw new ApiError(400, 'Invalid image URL.'); }
  if (parsed.protocol !== 'https:') throw new ApiError(400, 'HTTPS required.');
  
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new ApiError(502, 'Failed to download remote artwork.');
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new ApiError(400, 'Remote URL is not an image.');
  
  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400'
  });
  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

export function createAppServer({ fetchImpl, userAgent, mbIntervalMs = 1100, publicDir = path.join(ROOT, 'public'), ...clientOptions } = {}) {
  const metadata = createMusicBrainzClient({ fetchImpl, userAgent, intervalMs: mbIntervalMs, ...clientOptions });
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); throw new ApiError(405, 'Only GET and HEAD are supported.'); }
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/search') {
        const q = (url.searchParams.get('q') || '').trim();
        if (q.length < 2 || q.length > 120) throw new ApiError(400, 'Enter an album title between 2 and 120 characters.');
        return json(200, await metadata.search(q));
      }
      if (url.pathname === '/api/album') {
        const id = url.searchParams.get('id') || '';
        if (!UUID.test(id)) throw new ApiError(400, 'Select an album with a valid MusicBrainz release-group ID.');
        return json(200, await metadata.album(id.toLowerCase()));
      }
      if (url.pathname === '/api/artwork-search') {
        const q = (url.searchParams.get('q') || '').trim();
        const id = (url.searchParams.get('id') || '').trim();
        if (!q && !id) throw new ApiError(400, 'Search query or release-group ID required.');
        return json(200, { results: await searchArtwork(q, id) });
      }
      if (url.pathname === '/api/spotify-search') {
        const q = (url.searchParams.get('q') || '').trim();
        const id = (url.searchParams.get('id') || '').trim();
        if (!q && !id) throw new ApiError(400, 'Search query or release-group ID required.');
        return json(200, await searchSpotifyAlbum(q, id));
      }
      if (url.pathname === '/api/spotify-code') {
        let uri = (url.searchParams.get('uri') || url.searchParams.get('url') || '').trim();
        const q = (url.searchParams.get('q') || '').trim();
        const id = (url.searchParams.get('id') || '').trim();
        const barColor = (url.searchParams.get('color') || '').trim();
        const transparent = url.searchParams.get('bg') !== 'opaque';
        if (!uri && (q || id)) {
          const found = await searchSpotifyAlbum(q, id);
          if (found.found) uri = found.uri;
        }
        if (!uri) throw new ApiError(400, 'Spotify album URI or URL required.');
        return json(200, await fetchSpotifyCode(uri, { transparent, barColor }));
      }
      if (url.pathname === '/api/proxy-image') {
        const imgUrl = (url.searchParams.get('url') || '').trim();
        if (!imgUrl) throw new ApiError(400, 'Image URL required.');
        return await proxyImage(imgUrl, res);
      }
      if (url.pathname.startsWith('/api/')) throw new ApiError(404, 'Unknown API endpoint.');
      let decoded;
      try { decoded = decodeURIComponent(url.pathname); } catch { throw new ApiError(400, 'Invalid path.'); }
      if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').includes('..')) throw new ApiError(403, 'Path is not allowed.');
      const base = await realpath(publicDir);
      let file;
      try { file = await realpath(path.join(base, decoded === '/' ? 'index.html' : decoded)); } catch { throw new ApiError(404, 'File not found.'); }
      if (!file.startsWith(`${base}${path.sep}`)) throw new ApiError(403, 'Path is not allowed.');
      const info = await stat(file);
      if (!info.isFile() || info.size > 15_000_000) throw new ApiError(404, 'File not found.');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch (error) {
      if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : 'The server could not complete this request.' });
      else res.destroy();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3000);
  createAppServer().listen(port, host, () => console.log(`Album Poster Studio: http://${host}:${port}`));
}
