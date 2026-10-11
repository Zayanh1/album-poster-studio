import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAppServer, createMusicBrainzClient } from '../server.mjs';

const userAgent = 'PosterStudio/1.0 (https://poster-studio.test/contact)';
const groupId = '11111111-1111-4111-8111-111111111111';
const firstId = '22222222-2222-4222-8222-222222222222';
const otherId = '33333333-3333-4333-8333-333333333333';
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

async function serve(t, options) {
  const server = createAppServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('missing contact returns actionable 503 without calling upstream', async t => {
  const base = await serve(t, { userAgent: '', fetchImpl: () => assert.fail('unexpected upstream call') });
  const res = await fetch(`${base}/api/search?q=Album`);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /MUSICBRAINZ_USER_AGENT/);
});

test('API validates search length and album UUID before requests', async t => {
  const base = await serve(t, { userAgent, fetchImpl: () => assert.fail('unexpected upstream call') });
  for (const endpoint of ['/api/search?q=a', `/api/search?q=${'a'.repeat(121)}`, '/api/album?id=bad']) {
    const res = await fetch(base + endpoint);
    assert.equal(res.status, 400);
  }
  assert.equal((await fetch(base + '/api/search', { method: 'POST' })).status, 405);
});

test('search quotes query and concurrent identical requests share one upstream call', async () => {
  const calls = [];
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, fetchImpl: async (url, options) => {
    calls.push(url);
    assert.equal(options.headers['User-Agent'], userAgent);
    return response({ 'release-groups': [{ id: groupId, title: 'A', 'artist-credit': [{ name: 'Artist' }], 'first-release-date': '2020' }] });
  } });
  const [a, b] = await Promise.all([client.search('A " OR artist:X'), client.search('A " OR artist:X')]);
  assert.deepEqual(a, b);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]).searchParams.get('query'), '(releasegroup:"A \\" OR artist:X" OR artist:"A \\" OR artist:X") AND primarytype:album');
  assert.equal(a.results[0].artist, 'Artist');
  await client.search('A " OR artist:X');
  assert.equal(calls.length, 1);
});

test('album chooses earliest official edition, joins credits, totals tracks and uses exact Spotify relation', async () => {
  const calls = [];
  const spotifyUrl = 'https://open.spotify.com/album/0123456789012345678901';
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, fetchImpl: async url => {
    calls.push(url);
    if (url.includes('/release-group/')) return response({ title: 'Album', 'artist-credit': [{ name: 'A', joinphrase: ' & ' }, { name: 'B' }], 'first-release-date': '2020-01-01' });
    if (url.includes('/release?')) return response({ releases: [{ id: otherId, status: 'Bootleg', date: '1999' }, { id: otherId, status: 'Official', date: '2021' }, { id: firstId, status: 'Official', date: '2020' }] });
    assert.match(url, new RegExp(`/release/${firstId}`));
    return response({ id: firstId, media: [{ tracks: [{ title: 'First', length: 1000 }, { recording: { title: 'Second', length: 2000 } }] }], 'label-info': [{ label: { name: 'Label' } }, { label: { name: 'Label' } }], relations: [{ url: { resource: spotifyUrl } }] });
  } });
  const album = await client.album(groupId);
  assert.equal(album.artist, 'A & B');
  assert.equal(album.durationMs, 3000);
  assert.equal(album.label, 'Label');
  assert.equal(album.spotifyUrl, spotifyUrl);
  assert.equal(album.releaseId, firstId);
  assert.equal(calls.length, 3);
  assert.equal(new URL(calls[1]).searchParams.get('limit'), '100');
});

test('unknown lengths stay unknown and no Spotify URL is invented', async () => {
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, fetchImpl: async url => response(url.includes('/release-group/') ? {} : url.includes('/release?') ? { releases: [{ id: firstId, status: 'Official' }] } : { id: firstId, media: [{ tracks: [{ title: 'Unknown' }] }] }) });
  const album = await client.album(groupId);
  assert.equal(album.durationMs, null);
  assert.equal(album.spotifyUrl, null);
});

test('edition browse ignores embedded releases and prefers digital at an equal date', async () => {
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, fetchImpl: async url => {
    if (url.includes('/release-group/')) return response({ releases: [{ id: firstId, date: '1990', status: 'Official' }] });
    if (url.includes('/release?')) return response({ releases: [
      { id: firstId, date: '2020-01-01', status: 'Official', media: [{ format: 'CD' }] },
      { id: otherId, date: '2020-01-01', status: 'Official', media: [{ format: 'Digital Media' }] }
    ] });
    assert.match(url, new RegExp(`/release/${otherId}`));
    return response({ id: otherId, media: [] });
  } });
  assert.equal((await client.album(groupId)).releaseId, otherId);
});

test('upstream failures are translated and queue recovers', async () => {
  let n = 0;
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, fetchImpl: async () => ++n === 1 ? new Response('busy', { status: 503 }) : response({ 'release-groups': [] }) });
  await assert.rejects(client.search('Album'), error => error.status === 502);
  assert.deepEqual(await client.search('Album'), { results: [] });
});

test('queue has a finite capacity', async () => {
  let resolveFetch;
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, maxPending: 1, fetchImpl: () => new Promise(resolve => { resolveFetch = resolve; }) });
  const first = client.search('First');
  await Promise.resolve();
  await assert.rejects(client.search('Second'), error => error.status === 429);
  resolveFetch(response({}));
  await first;
});

test('metadata calls share one rate limiter across different operations', async () => {
  const starts = [];
  const client = createMusicBrainzClient({ userAgent, intervalMs: 30, fetchImpl: async () => { starts.push(Date.now()); return response({}); } });
  await Promise.all([client.search('First'), client.search('Second'), client.search('Third')]);
  assert.equal(starts.length, 3);
  assert.ok(starts[1] - starts[0] >= 25);
  assert.ok(starts[2] - starts[1] >= 25);
});

test('oversized response is rejected', async () => {
  const client = createMusicBrainzClient({ userAgent, intervalMs: 0, fetchImpl: async () => new Response('{}', { headers: { 'content-length': '2000001' } }) });
  await assert.rejects(client.search('Album'), error => error.status === 502 && /size limit/.test(error.message));
});

test('static serving supports HEAD and blocks symlink traversal', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'poster-server-'));
  const pub = path.join(dir, 'public');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(pub);
  await writeFile(path.join(pub, 'index.html'), '<h1>Poster</h1>');
  await writeFile(path.join(dir, 'secret'), 'private');
  let canSymlink = true;
  try {
    await symlink(path.join(dir, 'secret'), path.join(pub, 'escape'));
  } catch (err) {
    if (err.code === 'EPERM') canSymlink = false;
    else throw err;
  }
  t.after(() => rm(dir, { recursive: true, force: true }));
  const base = await serve(t, { publicDir: pub });
  const res = await fetch(base);
  assert.equal(await res.text(), '<h1>Poster</h1>');
  assert.match(res.headers.get('content-security-policy'), /object-src 'none'/);
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.headers.get('content-length'), '15');
  assert.equal(await head.text(), '');
  if (canSymlink) {
    assert.equal((await fetch(`${base}/escape`)).status, 403);
  }
  assert.equal((await fetch(`${base}/%2e%2e%2fsecret`)).status, 403);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});

test('artwork search, spotify code, and image proxy validate parameters', async t => {
  const base = await serve(t, { userAgent });
  
  // Missing params return 400
  assert.equal((await fetch(`${base}/api/artwork-search`)).status, 400);
  assert.equal((await fetch(`${base}/api/spotify-search`)).status, 400);
  assert.equal((await fetch(`${base}/api/spotify-code`)).status, 400);
  assert.equal((await fetch(`${base}/api/spotify-code?uri=bad`)).status, 400);
  assert.equal((await fetch(`${base}/api/proxy-image`)).status, 400);
  assert.equal((await fetch(`${base}/api/proxy-image?url=http://insecure.test/a.jpg`)).status, 400);

  // Spotify search resolves known albums automatically
  const searchRes = await fetch(`${base}/api/spotify-search?q=Daft+Punk+Discovery`);
  assert.equal(searchRes.status, 200);
  const searchJson = await searchRes.json();
  assert.equal(searchJson.found, true);
  assert.equal(searchJson.uri, 'spotify:album:2noRn2Aes5aoNVsU6iWThc');
});


