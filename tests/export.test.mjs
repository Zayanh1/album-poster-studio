import test from 'node:test';
import assert from 'node:assert/strict';
import {pngWithDpi,spotifyUri} from '../public/export-utils.js';
const id='2WmJ5wp5wKBlIJE6FDAIBJ';
test('Spotify destination accepts only exact album IDs on the real host',()=>{
 assert.equal(spotifyUri(`https://open.spotify.com/album/${id}?si=anything`),`spotify:album:${id}`);
 assert.equal(spotifyUri(`https://open.spotify.com/intl-fr/album/${id}`),`spotify:album:${id}`);
 assert.equal(spotifyUri(`spotify:album:${id}`),`spotify:album:${id}`);
 for(const input of ['https://open.spotify.com.evil.test/album/'+id,'javascript:alert(1)','https://open.spotify.com/track/'+id,'spotify:album:short','http://open.spotify.com/album/'+id])assert.throws(()=>spotifyUri(input));
});
const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ZkAAAAASUVORK5CYII=','base64');
function chunks(bytes){const result=[];for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p);result.push({type:bytes.toString('ascii',p+4,p+8),data:bytes.subarray(p+8,p+8+n)});p+=n+12;}return result;}
test('PNG DPI preserves image data and puts physical resolution after IHDR',async()=>{
 const bytes=Buffer.from(await (await pngWithDpi(new Blob([fixture]),300)).arrayBuffer());const c=chunks(bytes);
 assert.deepEqual(c.map(x=>x.type),['IHDR','pHYs','IDAT','IEND']);
 assert.equal(c[1].data.readUInt32BE(0),11811);assert.equal(c[1].data.readUInt32BE(4),11811);assert.equal(c[1].data[8],1);
 assert.deepEqual(c[2].data,chunks(fixture).find(c=>c.type==='IDAT').data);
});
test('PNG DPI replacement never accumulates duplicate pHYs chunks',async()=>{
 const first=await pngWithDpi(new Blob([fixture]),300);const bytes=Buffer.from(await(await pngWithDpi(first,150)).arrayBuffer());const physical=chunks(bytes).filter(c=>c.type==='pHYs');assert.equal(physical.length,1);assert.equal(physical[0].data.readUInt32BE(0),5906);
});
