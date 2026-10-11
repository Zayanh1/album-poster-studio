import {spotifyUri,pngWithDpi} from './export-utils.js';
import {createPosterSVG, extractPalette, effectivePpi} from './renderer.js';

const $=id=>document.getElementById(id);
let state, artImage, svg='', requestId=0;
const status=(id,message,error=false)=>{ $(id).textContent=message;$(id).className='status '+(error?'error':'success'); };
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This image could not be decoded. Try PNG or JPEG.'));image.src=src;});
const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsDataURL(file);});
const utf8Base64=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);};

function demoArtSlowOrbit(){
  const c=document.createElement('canvas');c.width=c.height=1800;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,1800,1800);g.addColorStop(0,'#182f37');g.addColorStop(.48,'#54766c');g.addColorStop(1,'#e3c789');
  x.fillStyle=g;x.fillRect(0,0,1800,1800);x.save();x.translate(900,900);x.rotate(-.28);
  for(let i=0;i<8;i++){x.strokeStyle=['#eac67e','#90a189','#dd774b','#243c41'][i%4];x.lineWidth=82;x.beginPath();x.ellipse(0,0,740-i*79,810-i*79,0,0,Math.PI*2);x.stroke();}
  x.restore();const shade=x.createLinearGradient(0,900,0,1800);shade.addColorStop(0,'#122a3000');shade.addColorStop(1,'#122a30bb');
  x.fillStyle=shade;x.fillRect(0,0,1800,1800);return c.toDataURL('image/png');
}

function demoArtDarkSide(){
  const c=document.createElement('canvas');c.width=c.height=1800;const x=c.getContext('2d');
  const bg=x.createRadialGradient(900,900,100,900,900,1100);bg.addColorStop(0,'#0d0f14');bg.addColorStop(1,'#040507');
  x.fillStyle=bg;x.fillRect(0,0,1800,1800);
  x.strokeStyle='#ffffff44';x.lineWidth=8;x.beginPath();x.moveTo(0,980);x.lineTo(820,900);x.stroke();
  const colors=['#e63946','#f3722c','#f8961e','#90be6d','#43aa8b','#577590'];
  colors.forEach((col,i)=>{
    x.strokeStyle=col;x.lineWidth=14;x.beginPath();x.moveTo(980,900);x.lineTo(1800,750+i*55);x.stroke();
  });
  x.strokeStyle='#ffffff';x.lineWidth=24;x.beginPath();
  x.moveTo(900,600);x.lineTo(720,1020);x.lineTo(1080,1020);x.closePath();x.stroke();
  return c.toDataURL('image/png');
}

function demoArtKindofBlue(){
  const c=document.createElement('canvas');c.width=c.height=1800;const x=c.getContext('2d');
  const bg=x.createLinearGradient(0,0,1800,1800);bg.addColorStop(0,'#070b12');bg.addColorStop(.5,'#122239');bg.addColorStop(1,'#1f3d5c');
  x.fillStyle=bg;x.fillRect(0,0,1800,1800);
  for(let i=0;i<5;i++){
    const rad=x.createRadialGradient(900,900,50+i*90,900,900,300+i*180);
    rad.addColorStop(0,`rgba(201,138,62,${0.3-i*0.05})`);rad.addColorStop(1,'rgba(18,34,57,0)');
    x.fillStyle=rad;x.beginPath();x.arc(900,900,300+i*180,0,Math.PI*2);x.fill();
  }
  x.strokeStyle='#e8c882';x.lineWidth=18;x.beginPath();
  x.arc(900,900,260,0.5,Math.PI*1.8);x.stroke();
  return c.toDataURL('image/png');
}

function demoArtDiscovery(){
  const c=document.createElement('canvas');c.width=c.height=1800;const x=c.getContext('2d');
  const bg=x.createLinearGradient(0,0,0,1800);bg.addColorStop(0,'#090414');bg.addColorStop(.6,'#240d42');bg.addColorStop(1,'#4a156e');
  x.fillStyle=bg;x.fillRect(0,0,1800,1800);
  x.strokeStyle='#00e5ff33';x.lineWidth=4;
  for(let y=1100;y<1800;y+=50){x.beginPath();x.moveTo(0,y);x.lineTo(1800,y);x.stroke();}
  for(let xpos=0;xpos<=1800;xpos+=120){x.beginPath();x.moveTo(900,1050);x.lineTo(xpos,1800);x.stroke();}
  const orb=x.createRadialGradient(900,750,20,900,750,320);orb.addColorStop(0,'#ffffff');orb.addColorStop(.2,'#00e5ff');orb.addColorStop(.6,'#ff007f');orb.addColorStop(1,'#180533');
  x.fillStyle=orb;x.beginPath();x.arc(900,750,320,0,Math.PI*2);x.fill();
  return c.toDataURL('image/png');
}

function demoArtRumours(){
  const c=document.createElement('canvas');c.width=c.height=1800;const x=c.getContext('2d');
  x.fillStyle='#f0e8dc';x.fillRect(0,0,1800,1800);
  const colors=['#ab4a26','#6b543e','#d9a036','#3d4734'];
  for(let i=0;i<4;i++){
    x.strokeStyle=colors[i];x.lineWidth=54;x.beginPath();
    x.ellipse(900,1200-i*130,520-i*80,480-i*70,0,Math.PI,0);x.stroke();
  }
  return c.toDataURL('image/png');
}

function demoArtOKComputer(){
  const c=document.createElement('canvas');c.width=c.height=1800;const x=c.getContext('2d');
  x.fillStyle='#e4e9ee';x.fillRect(0,0,1800,1800);
  x.strokeStyle='#778da944';x.lineWidth=3;
  for(let p=100;p<1800;p+=80){
    x.beginPath();x.moveTo(p,0);x.lineTo(p,1800);x.stroke();
    x.beginPath();x.moveTo(0,p);x.lineTo(1800,p);x.stroke();
  }
  x.strokeStyle='#1b263b';x.lineWidth=12;
  x.strokeRect(300,300,1200,1200);
  x.beginPath();x.moveTo(300,300);x.lineTo(1500,1500);x.moveTo(1500,300);x.lineTo(300,1500);x.stroke();
  return c.toDataURL('image/png');
}

const PRESETS = {
  slowOrbit: {
    name: 'Slow Orbit (Demo)',
    title: 'SLOW ORBIT',
    artist: 'The Sunday Archive',
    date: 'October 10, 2026',
    duration: '42:18',
    label: 'Independent / Original Demo',
    tracks: ['First Light','Warm Receiver','Lost in the Signal','Somewhere, Slowly','Golden Hour','Side Streets','The Long Way Home','After the Rain','Soft Landing','Still Here'],
    palette: ['#1a343b','#55756b','#8f9e86','#dd784b','#eac67e'],
    background: '#14262b',
    textColor: '#f6f0dd',
    borderColor: '#e4cd98',
    borderWidth: 8,
    theme: 'dark',
    fontFamily: 'sans',
    columns: 'auto',
    size: '18x24',
    generator: demoArtSlowOrbit
  },
  darkSide: {
    name: 'The Dark Side of the Moon',
    title: 'THE DARK SIDE OF THE MOON',
    artist: 'Pink Floyd',
    date: 'March 1, 1973',
    duration: '42:50',
    label: 'Harvest / Capitol Records',
    tracks: ['Speak to Me','Breathe (In the Air)','On the Run','Time','The Great Gig in the Sky','Money','Us and Them','Any Colour You Like','Brain Damage','Eclipse'],
    palette: ['#0d0e12','#212529','#e63946','#f1faee','#457b9d'],
    background: '#090a0d',
    textColor: '#f5f5f7',
    borderColor: '#ffffff',
    borderWidth: 6,
    theme: 'dark',
    fontFamily: 'sans',
    columns: 'auto',
    size: '18x24',
    spotifyUrl: 'https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv',
    generator: demoArtDarkSide
  },
  kindOfBlue: {
    name: 'Kind of Blue',
    title: 'KIND OF BLUE',
    artist: 'Miles Davis',
    date: 'August 17, 1959',
    duration: '45:37',
    label: 'Columbia Records',
    tracks: ['So What','Freddie Freeloader','Blue in Green','All Blues','Flamenco Sketches'],
    palette: ['#0c1524','#1a2e47','#365578','#c98a3e','#e8c882'],
    background: '#0a101b',
    textColor: '#efe7d8',
    borderColor: '#c98a3e',
    borderWidth: 10,
    theme: 'dark',
    fontFamily: 'serif',
    columns: '1',
    size: '18x24',
    spotifyUrl: 'https://open.spotify.com/album/1weenldGvE43s0P5Y0T8fM',
    generator: demoArtKindofBlue
  },
  discovery: {
    name: 'Discovery',
    title: 'DISCOVERY',
    artist: 'Daft Punk',
    date: 'March 12, 2001',
    duration: '60:50',
    label: 'Virgin Records',
    tracks: ['One More Time','Aerodynamic','Digital Love','Harder, Better, Faster, Stronger','Crescendolls','Nightvision','Superheroes','High Life','Something About Us','Voyager','Veridis Quo','Short Circuit','Face to Face','Too Long'],
    palette: ['#120924','#38166d','#ff007f','#00e5ff','#ffbe0b'],
    background: '#0d071a',
    textColor: '#fdfbfe',
    borderColor: '#00e5ff',
    borderWidth: 8,
    theme: 'dark',
    fontFamily: 'sans',
    columns: '2',
    size: '18x24',
    spotifyUrl: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
    generator: demoArtDiscovery
  },
  rumours: {
    name: 'Rumours',
    title: 'RUMOURS',
    artist: 'Fleetwood Mac',
    date: 'February 4, 1977',
    duration: '39:43',
    label: 'Warner Bros. Records',
    tracks: ['Second Hand News','Dreams','Never Going Back Again',"Don't Stop",'Go Your Own Way','Songbird','The Chain','You Make Loving Fun',"I Don't Want to Know",'Oh Daddy','Gold Dust Woman'],
    palette: ['#28221b','#6b543e','#ab4a26','#d9a036','#f3ebe1'],
    background: '#f4ede2',
    textColor: '#241e17',
    borderColor: '#3a2d21',
    borderWidth: 8,
    theme: 'light',
    fontFamily: 'serif',
    columns: '2',
    size: '18x24',
    spotifyUrl: 'https://open.spotify.com/album/1TEowX5k7nvSR1VzSotWM0',
    generator: demoArtRumours
  },
  okComputer: {
    name: 'OK Computer',
    title: 'OK COMPUTER',
    artist: 'Radiohead',
    date: 'May 21, 1997',
    duration: '53:21',
    label: 'Parlophone / Capitol',
    tracks: ['Airbag','Paranoid Android','Subterranean Homesick Alien','Exit Music (For a Film)','Let Down','Karma Police','Fitter Happier','Electioneering','Climbing Up the Walls','No Surprises','Lucky','The Tourist'],
    palette: ['#1c2630','#415a77','#778da9','#e0e1dd','#ffffff'],
    background: '#e8ecf0',
    textColor: '#151d24',
    borderColor: '#151d24',
    borderWidth: 6,
    theme: 'light',
    fontFamily: 'mono',
    columns: '2',
    size: '18x24',
    spotifyUrl: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE',
    generator: demoArtOKComputer
  }
};

const THEMES = {
  custom: null,
  warmVinyl: { bg: '#161311', text: '#f5efe6', border: '#d19853', palette: ['#161311','#382317','#8c4e28','#d19853','#f5efe6'] },
  tokyoNeon: { bg: '#0b0d14', text: '#f7f9fc', border: '#00e5ff', palette: ['#0b0d14','#26de81','#00e5ff','#ff2d75','#f7f9fc'] },
  galleryCream: { bg: '#f5f2eb', text: '#1a1a1a', border: '#1a1a1a', palette: ['#1a1a1a','#524b3f','#948b7b','#d9d2c5','#f5f2eb'] },
  obsidianGold: { bg: '#0d0e12', text: '#f3eccb', border: '#d4af37', palette: ['#0d0e12','#252730','#7a6627','#d4af37','#f3eccb'] },
  nordicMist: { bg: '#1a2027', text: '#e8edf2', border: '#7f94a8', palette: ['#1a2027','#4b5d6e','#7f94a8','#9cb3c9','#e8edf2'] },
  terracotta: { bg: '#1b1310', text: '#f7ede2', border: '#cb6843', palette: ['#1b1310','#84432a','#cb6843','#e29578','#f7ede2'] }
};

const PAPER_MOODS = {
  obsidian: { theme: 'dark', bg: '#0b0c0e', bg2: '#040507', text: '#f5f5f7', border: '#ffffff' },
  cream: { theme: 'light', bg: '#f5f2eb', bg2: '#e2dcd0', text: '#1d1b18', border: '#1d1b18' },
  newsprint: { theme: 'light', bg: '#ded8cb', bg2: '#cdc4b3', text: '#1c1a17', border: '#2a2723' },
  polar: { theme: 'light', bg: '#ffffff', bg2: '#f0f3f6', text: '#0a0a0a', border: '#0a0a0a' },
  dark: { theme: 'dark', bg: '#0b0c0e', bg2: '#040507', text: '#f5f5f7', border: '#ffffff' },
  light: { theme: 'light', bg: '#f5f2eb', bg2: '#e2dcd0', text: '#1d1b18', border: '#1d1b18' }
};

function recolorCodeSvg(dataUrl, targetColor) {
  if (!dataUrl || !dataUrl.startsWith('data:image/svg+xml;base64,') || !/^#[0-9a-f]{6}$/i.test(targetColor)) return dataUrl;
  try {
    const raw = atob(dataUrl.split(',')[1]);
    const recolored = raw.replace(/fill=["'](?!none)[^"']*["']/gi, `fill="${targetColor}"`);
    return 'data:image/svg+xml;base64,' + utf8Base64(recolored);
  } catch {
    return dataUrl;
  }
}

function formatDuration(ms) {
  if (ms == null) return '';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function syncFields(){
  for(const id of ['title','artist','date','duration','label','size','theme','background','background2','bgGradient','textColor','borderColor','borderWidth','spotifyUrl','fontFamily','columns','artFit']){
    if ($(id)) $(id).value = state[id] ?? '';
  }
  $('tracks').value = state.tracks.join('\n');
  paintPalette();
  updateBg2Visibility();
}

function updateBg2Visibility(){
  const bg2Group = $('bg2Group');
  if (bg2Group) {
    const show = ['linear-v','linear-d','radial','subtle-linear','vibrant'].includes(state.bgGradient);
    bg2Group.hidden = !show;
  }
  const posterEl = $('poster');
  if (posterEl) {
    posterEl.classList.toggle('is-transparent', state.bgGradient === 'transparent');
  }
}

function paintPalette(){
  $('palette').replaceChildren(...state.palette.map((color,i)=>{
    const input=document.createElement('input');
    input.type='color';input.value=color;
    input.setAttribute('aria-label',`Palette color ${i+1}`);
    input.addEventListener('input',()=>{ state.palette[i]=input.value; render(); });
    return input;
  }));
}

function render(){
  try{
    svg=createPosterSVG(state);
    const posterEl=$('poster');
    posterEl.innerHTML=svg;
    posterEl.classList.toggle('is-transparent', state.bgGradient === 'transparent');
    const ppi=effectivePpi(state);
    const ppiEl=$('ppi');
    ppiEl.textContent=ppi?`${ppi} PPI`:'—';
    if(ppi>=300){
      ppiEl.className='ppi-badge ppi-excellent';
      $('qualityHint').textContent='✓ Artwork meets 300+ PPI gallery print standard at this size.';
    } else if(ppi>=150){
      ppiEl.className='ppi-badge ppi-good';
      $('qualityHint').textContent=`Artwork provides ${ppi} PPI at this size (suitable for wall viewing). Aim for 300 PPI for ultra-fine detail.`;
    } else if(ppi>0){
      ppiEl.className='ppi-badge ppi-low';
      $('qualityHint').textContent=`Artwork provides ${ppi} PPI at this size. Consider higher-resolution artwork or smaller print size.`;
    } else {
      ppiEl.className='ppi-badge';
      $('qualityHint').textContent='';
    }
    $('borderValue').textContent=`${state.borderWidth} units`;
    $('sizeBadge').textContent=state.size.replace('x',' × ')+' IN';
    const [w,h]=(state.size==='A3'?[11.7,16.5]:state.size.split('x').map(Number));
    $('exportDescription').textContent=`SVG · ${Math.round(w*Number($('dpi').value))} × ${Math.round(h*Number($('dpi').value))} PNG · Print / PDF`;
    return true;
  }catch(e){
    status('exportStatus',e.message,true);
    return false;
  }
}

async function loadPreset(key){
  const p = PRESETS[key] || PRESETS.slowOrbit;
  requestId++;
  $('searchButton').disabled = false;
  state = {
    title: p.title,
    artist: p.artist,
    date: p.date,
    duration: p.duration,
    label: p.label,
    tracks: [...p.tracks],
    artDataUrl: p.generator(),
    artWidth: 1800,
    artHeight: 1800,
    codeDataUrl: '',
    codeWidth: 640,
    codeHeight: 160,
    spotifyUrl: p.spotifyUrl || '',
    bgGradient: p.bgGradient || 'none',
    background2: p.background2 || (p.palette ? p.palette[1] : '#080808'),
    size: p.size || '18x24',
    palette: [...p.palette],
    background: p.background,
    textColor: p.textColor,
    borderColor: p.borderColor,
    borderWidth: p.borderWidth,
    theme: p.theme,
    fontFamily: p.fontFamily || 'sans',
    columns: p.columns || 'auto',
    artFit: 'meet'
  };
  artImage = await loadImage(state.artDataUrl);
  $('rights').checked = true;
  $('licenseNote').value = `Original procedural demo artwork created for ${p.name}.`;
  $('codeConfirmed').checked = false;
  $('removeCode').hidden = true;
  $('metadataSource').hidden = true;
  $('searchResults').replaceChildren();
  for (const id of ['searchStatus','codeStatus','artStatus','exportStatus']) status(id,'');
  $('previewCaption').textContent = `${p.name.toUpperCase()} · DEMO ART · NO COPYRIGHTED ART INCLUDED`;
  document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.toggle('active', btn.dataset.preset === key));
  syncFields();
  render();
  if (p.spotifyUrl) {
    autoPullSpotifyCode(p.spotifyUrl).catch(() => {});
  }
}

async function reset(){
  await loadPreset('slowOrbit');
}

for(const id of ['title','artist','date','duration','label','size','background','background2','textColor','borderColor','borderWidth','fontFamily','columns','artFit']){
  const el=$(id);
  if (el) {
    el.addEventListener('input',()=>{
      state[id]=id==='borderWidth'?Number(el.value):el.value;
      if (id === 'textColor' && state.codeDataUrl) {
        state.codeDataUrl = recolorCodeSvg(state.codeDataUrl, state.textColor);
      }
      render();
    });
  }
}

const bgGradientEl = $('bgGradient');
if (bgGradientEl) {
  bgGradientEl.addEventListener('change', () => {
    state.bgGradient = bgGradientEl.value;
    updateBg2Visibility();
    render();
  });
}

$('tracks').addEventListener('input',()=>{
  state.tracks=$('tracks').value.split('\n').map(t=>t.trim()).filter(Boolean);
  render();
});

$('dpi').addEventListener('change',render);

$('theme').addEventListener('change',()=>{
  const val = $('theme').value;
  const mood = PAPER_MOODS[val] || (val === 'light' || val === 'cream' ? PAPER_MOODS.cream : PAPER_MOODS.obsidian);
  state.theme = mood.theme;
  state.background = mood.bg;
  state.background2 = mood.bg2;
  state.textColor = mood.text;
  state.borderColor = mood.border;
  if (state.codeDataUrl) {
    state.codeDataUrl = recolorCodeSvg(state.codeDataUrl, state.textColor);
  }
  syncFields();
  render();
});

const palettePresetEl = $('palettePreset');
if (palettePresetEl) {
  palettePresetEl.addEventListener('change', () => {
    const val = palettePresetEl.value;
    if (val === 'extract' && artImage) {
      state.palette = extractPalette(artImage);
      state.background = state.theme === 'dark' ? state.palette[0] : '#f3f0e7';
      state.background2 = state.theme === 'dark' ? (state.palette[1] || '#080808') : '#e2dcd0';
      state.borderColor = state.theme === 'dark' ? state.palette[4] : '#222822';
    } else if (THEMES[val]) {
      const t = THEMES[val];
      state.palette = [...t.palette];
      state.background = t.bg;
      state.background2 = t.palette[1] || (state.theme === 'dark' ? '#080808' : '#e2dcd0');
      state.textColor = t.text;
      state.borderColor = t.border;
    }
    if (state.codeDataUrl) {
      state.codeDataUrl = recolorCodeSvg(state.codeDataUrl, state.textColor);
    }
    syncFields();
    render();
  });
}

const zoomToggle = $('zoomToggle');
if (zoomToggle) {
  zoomToggle.addEventListener('click', () => {
    const isZoomed = document.body.classList.toggle('poster-zoomed');
    zoomToggle.textContent = isZoomed ? 'Fit ⤡' : 'Zoom ⤢';
  });
}

document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => loadPreset(chip.dataset.preset));
});

$('reset').addEventListener('click',reset);

async function applyArt(file){
  if(!file)return;
  try{
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG, or WebP image.');
    if(file.size>25*1024*1024)throw new Error('Choose an image under 25 MB.');
    const data=await readFile(file);
    const image=await loadImage(data);
    if(image.naturalWidth*image.naturalHeight>100_000_000)throw new Error('Choose an image below 100 megapixels.');
    state.artDataUrl=data;
    state.artWidth=image.naturalWidth;
    state.artHeight=image.naturalHeight;
    artImage=image;
    state.palette=extractPalette(image);
    state.background=state.theme==='dark'?state.palette[0]:'#f3f0e7';
    state.borderColor=state.theme==='dark'?state.palette[4]:'#222822';
    $('rights').checked=false;
    $('licenseNote').value='';
    $('previewCaption').textContent='YOUR ARTWORK · PROCESSED ON THIS DEVICE';
    document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.remove('active'));
    syncFields();
    render();
    status('artStatus',`${file.name} · ${image.naturalWidth} × ${image.naturalHeight} pixels. Colors extracted.`);
  }catch(e){
    status('artStatus',e.message,true);
  }
}

$('artFile').addEventListener('change',e=>applyArt(e.target.files[0]));
for(const ev of ['dragenter','dragover'])$('dropZone').addEventListener(ev,e=>{e.preventDefault();$('dropZone').classList.add('dragging');});
for(const ev of ['dragleave','drop'])$('dropZone').addEventListener(ev,e=>{e.preventDefault();$('dropZone').classList.remove('dragging');if(ev==='drop')applyArt(e.dataTransfer.files[0]);});

$('extract').addEventListener('click',()=>{
  if (!artImage) return;
  state.palette=extractPalette(artImage);
  state.background=state.theme==='dark'?state.palette[0]:'#f3f0e7';
  state.borderColor=state.theme==='dark'?state.palette[4]:'#222822';
  syncFields();
  render();
});

async function api(path){
  if(location.protocol==='file:')throw new Error('Live search needs the local server. Run START-WINDOWS.cmd or npm start, then open http://127.0.0.1:3000. You can edit details and upload artwork here without it.');
  const r=await fetch(path);
  const body=await r.json();
  if(!r.ok)throw new Error(body.error||'Lookup failed. Please try again.');
  return body;
}

$('searchForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const rid=++requestId;
  $('searchButton').disabled=true;
  $('searchResults').replaceChildren();
  status('searchStatus','Searching MusicBrainz…');
  try{
    const data=await api('/api/search?q='+encodeURIComponent($('query').value.trim()));
    if(rid!==requestId)return;
    status('searchStatus',data.results.length?`${data.results.length} albums found. Choose the right artist and edition.`:'No matches. Try the album title or artist separately.');
    for(const album of data.results){
      const button=document.createElement('button');
      button.className='search-result';
      const title=document.createElement('strong');
      title.textContent=album.title;
      const meta=document.createElement('span');
      meta.textContent=[album.artist,album.date].filter(Boolean).join(' · ');
      button.append(title,meta);
      button.addEventListener('click',()=>selectAlbum(album.id));
      $('searchResults').append(button);
    }
  }catch(e){
    if(rid===requestId)status('searchStatus',e.message,true);
  }finally{
    if(rid===requestId)$('searchButton').disabled=false;
  }
});

async function fetchArtworkDataUrl(imageUrl) {
  const fetchUrl = location.protocol === 'file:' ? imageUrl : `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  const img = await loadImage(fetchUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.95),
    width: img.naturalWidth,
    height: img.naturalHeight,
    img
  };
}

async function applyPulledArtwork(imageUrl, sourceName) {
  status('artStatus', `Downloading high-resolution artwork from ${sourceName}…`);
  try {
    const { dataUrl, width, height, img } = await fetchArtworkDataUrl(imageUrl);
    state.artDataUrl = dataUrl;
    state.artWidth = width;
    state.artHeight = height;
    artImage = img;
    state.palette = extractPalette(img);
    state.background = state.theme === 'dark' ? state.palette[0] : '#f3f0e7';
    state.borderColor = state.theme === 'dark' ? state.palette[4] : '#222822';
    $('rights').checked = true;
    $('licenseNote').value = `High-resolution studio cover art via ${sourceName}.`;
    $('previewCaption').textContent = `STUDIO ARTWORK · ${sourceName.toUpperCase()}`;
    document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.remove('active'));
    syncFields();
    render();
    status('artStatus', `✓ High-resolution cover (${width} × ${height} px) pulled from ${sourceName}. Colors extracted.`);
  } catch (err) {
    status('artStatus', `Could not load artwork: ${err.message}`, true);
  }
}

async function autoPullArtwork(query, releaseGroupId = '') {
  const q = (query || `${state.artist} ${state.title}`).trim();
  if (!q) {
    status('artStatus', 'Enter an album title or artist to search artwork.', true);
    return;
  }
  status('artStatus', `Searching high-resolution artwork for "${q}"…`);
  try {
    let results = [];
    if (location.protocol === 'file:') {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=4`);
      const data = await res.json();
      for (const item of (data.results || [])) {
        if (item.artworkUrl100) {
          results.push({
            source: 'Apple Music (3000px)',
            title: item.collectionName,
            artist: item.artistName,
            url: item.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, '/3000x3000bb.$1'),
            thumb: item.artworkUrl100
          });
        }
      }
    } else {
      const res = await api(`/api/artwork-search?q=${encodeURIComponent(q)}&id=${encodeURIComponent(releaseGroupId || '')}`);
      results = res.results || [];
    }
    if (!results.length) {
      status('artStatus', 'No studio artwork found. You can upload an image file directly.', true);
      return;
    }
    await applyPulledArtwork(results[0].url, results[0].source);
  } catch (err) {
    status('artStatus', `Artwork lookup failed: ${err.message}`, true);
  }
}

async function searchArtworkGallery(query, releaseGroupId = '') {
  const gallery = $('artworkGallery');
  const q = (query || `${state.artist} ${state.title}`).trim();
  if (!q) return;
  gallery.replaceChildren();
  status('artStatus', `Searching covers for "${q}"…`);
  try {
    let results = [];
    if (location.protocol === 'file:') {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=8`);
      const data = await res.json();
      for (const item of (data.results || [])) {
        if (item.artworkUrl100) {
          results.push({
            source: 'Apple Music (3000px)',
            title: item.collectionName,
            artist: item.artistName,
            url: item.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, '/3000x3000bb.$1'),
            thumb: item.artworkUrl100
          });
        }
      }
    } else {
      const res = await api(`/api/artwork-search?q=${encodeURIComponent(q)}&id=${encodeURIComponent(releaseGroupId || '')}`);
      results = res.results || [];
    }
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'No covers found for this query.';
      gallery.append(empty);
      return;
    }
    for (const item of results) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'artwork-card';
      const img = document.createElement('img');
      img.src = item.thumb || item.url;
      img.alt = item.title;
      img.loading = 'lazy';
      const info = document.createElement('div');
      info.className = 'artwork-card-info';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const artist = document.createElement('span');
      artist.textContent = item.artist || item.source;
      const badge = document.createElement('span');
      badge.className = 'artwork-card-badge';
      badge.textContent = item.source;
      info.append(title, artist, badge);
      card.append(img, info);
      card.addEventListener('click', () => {
        applyPulledArtwork(item.url, item.source);
        $('artSearchBox').hidden = true;
      });
      gallery.append(card);
    }
    status('artStatus', `Found ${results.length} covers. Click any cover to apply it.`);
  } catch (err) {
    status('artStatus', `Search failed: ${err.message}`, true);
  }
}

async function autoPullSpotifyCode(spotifyUrlOrUri) {
  let target = (spotifyUrlOrUri || state.spotifyUrl || '').trim();
  if (!target) {
    status('codeStatus', 'Searching Spotify for this album…');
    try {
      const q = `${state.artist} ${state.title}`.trim();
      if (location.protocol !== 'file:') {
        const res = await api(`/api/spotify-search?q=${encodeURIComponent(q)}&id=${encodeURIComponent(state.releaseGroupId || '')}`);
        if (res.found && (res.spotifyUrl || res.uri)) {
          target = res.spotifyUrl || res.uri;
          state.spotifyUrl = target;
          if ($('spotifyUrl')) $('spotifyUrl').value = target;
        }
      }
    } catch {}
  }
  if (!target) {
    status('codeStatus', 'Could not auto-find Spotify link for this album. Paste a Spotify album link into the field above.', true);
    return;
  }
  status('codeStatus', 'Pulling official Spotify Code from Spotify CDN…');
  try {
    let uri;
    try { uri = spotifyUri(target); } catch {
      if (/^spotify:album:[A-Za-z0-9]{22}$/.test(target)) uri = target;
      else throw new Error('Enter a valid Spotify album link or URI.');
    }
    let dataUrl;
    if (location.protocol === 'file:') {
      const res = await fetch(`https://scannables.scdn.co/uri/plain/svg/000000/white/640/${encodeURIComponent(uri)}`);
      if (!res.ok) throw new Error('Spotify returned error: ' + res.status);
      let text = await res.text();
      text = text.replace(/<rect\s+[^>]*width=["']400["'][^>]*height=["']100["'][^>]*\/?>\s*/i, '');
      if (state.textColor && /^#[0-9a-f]{6}$/i.test(state.textColor)) {
        text = text.replace(/fill=["']#ffffff["']/gi, `fill="${state.textColor}"`);
      }
      dataUrl = 'data:image/svg+xml;base64,' + utf8Base64(text);
    } else {
      const colorParam = state.textColor ? `&color=${encodeURIComponent(state.textColor)}` : '';
      const res = await api(`/api/spotify-code?uri=${encodeURIComponent(uri)}${colorParam}`);
      dataUrl = res.dataUrl;
    }
    const img = await loadImage(dataUrl);
    state.codeDataUrl = dataUrl;
    state.codeWidth = img.naturalWidth || 640;
    state.codeHeight = img.naturalHeight || 160;
    $('codeConfirmed').checked = true;
    $('removeCode').hidden = false;
    render();
    status('codeStatus', '✓ Official Spotify Code pulled directly from Spotify CDN (backgroundless).');
  } catch (err) {
    status('codeStatus', `Could not pull Spotify Code: ${err.message}`, true);
  }
}

async function selectAlbum(id){
  const rid=++requestId;
  status('searchStatus','Loading the track list and release details…');
  try{
    const a=await api('/api/album?id='+encodeURIComponent(id));
    if(rid!==requestId)return;
    Object.assign(state,{
      title:a.title,
      artist:a.artist,
      date:a.date,
      label:a.label,
      tracks:a.tracks.map(t=>t.title),
      duration:formatDuration(a.durationMs),
      spotifyUrl:a.spotifyUrl||'',
      releaseGroupId: a.releaseGroupId || id,
      codeDataUrl:''
    });
    $('codeConfirmed').checked=false;
    $('removeCode').hidden=true;
    $('metadataSource').href=a.sourceUrl;
    $('metadataSource').hidden=false;
    $('searchResults').replaceChildren();
    document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.remove('active'));
    syncFields();
    render();
    status('codeStatus','');
    status('searchStatus','Details loaded.');

    // Auto-pull artwork and Spotify code in background
    if (a.spotifyUrl) {
      autoPullSpotifyCode(a.spotifyUrl).catch(() => {});
    } else {
      autoPullSpotifyCode().catch(() => {});
    }
    autoPullArtwork(`${a.artist} ${a.title}`, id).catch(() => {});
  }catch(e){
    if(rid===requestId)status('searchStatus',e.message,true);
  }finally{
    $('searchButton').disabled=false;
  }
}

$('spotifyUrl').addEventListener('input',()=>{
  state.spotifyUrl=$('spotifyUrl').value;
  state.codeDataUrl='';
  $('removeCode').hidden=true;
  $('codeConfirmed').checked=false;
  status('codeStatus','The destination changed. Pull or import a Code for this album.');
  render();
});

const autoPullArtBtn = $('autoPullArtBtn');
if (autoPullArtBtn) {
  autoPullArtBtn.addEventListener('click', () => autoPullArtwork(`${state.artist} ${state.title}`, state.releaseGroupId));
}

const toggleArtSearchBtn = $('toggleArtSearchBtn');
if (toggleArtSearchBtn) {
  toggleArtSearchBtn.addEventListener('click', () => {
    const box = $('artSearchBox');
    box.hidden = !box.hidden;
    if (!box.hidden) {
      $('artQuery').value = `${state.artist} ${state.title}`.trim();
      searchArtworkGallery($('artQuery').value, state.releaseGroupId);
    }
  });
}

const artSearchForm = $('artSearchForm');
if (artSearchForm) {
  artSearchForm.addEventListener('submit', e => {
    e.preventDefault();
    searchArtworkGallery($('artQuery').value.trim(), state.releaseGroupId);
  });
}

const autoPullCodeBtn = $('autoPullCodeBtn');
if (autoPullCodeBtn) {
  autoPullCodeBtn.addEventListener('click', () => autoPullSpotifyCode($('spotifyUrl').value));
}

$('copyUri').addEventListener('click',async()=>{
  try{
    const uri=spotifyUri($('spotifyUrl').value);
    await navigator.clipboard.writeText(uri);
    status('codeStatus','URI copied. Paste it into the official generator, then import the download.');
  }catch(e){
    status('codeStatus',e.message,true);
  }
});

function validateCodeSvg(text){
  if(text.length>2_000_000)throw new Error('SVG Code is too large.');
  const doc=new DOMParser().parseFromString(text,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw new Error('Not a valid SVG image.');
  const allowed=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','clipPath','title','desc','use']);
  for(const el of doc.querySelectorAll('*')){
    if(!allowed.has(el.localName))throw new Error('This SVG contains unsupported active content. Import the PNG from Spotify instead.');
    for(const a of el.attributes){
      if(/^on/i.test(a.name)||/javascript:|https?:|data:|url\s*\(/i.test(a.value)&&!/^xmlns(?::xlink)?$/.test(a.name))throw new Error('The SVG must be self-contained with no scripts or external references.');
      if(/(?:^|:)href$/.test(a.name)&&!/^#[\w.-]+$/.test(a.value))throw new Error('External SVG references are not allowed.');
    }
  }
  // Remove background rect so imported code is clean and backgroundless
  for (const rect of doc.querySelectorAll('rect')) {
    const w = rect.getAttribute('width');
    const h = rect.getAttribute('height');
    const x = rect.getAttribute('x') || '0';
    const y = rect.getAttribute('y') || '0';
    if ((w === '400' || w === '100%' || w === '640') && (h === '100' || h === '100%' || h === '160') && (x === '0' || x === '0%') && (y === '0' || y === '0%')) {
      rect.remove();
      break;
    }
  }
  // Tint imported bars and paths with active textColor for seamless integration
  if (state && state.textColor && /^#[0-9a-f]{6}$/i.test(state.textColor)) {
    for (const el of doc.querySelectorAll('rect, path')) {
      const fill = el.getAttribute('fill');
      if (fill && fill !== 'none') {
        el.setAttribute('fill', state.textColor);
      }
    }
  }
  return new XMLSerializer().serializeToString(doc);
}

$('codeFile').addEventListener('change',async e=>{
  const file=e.target.files[0];
  if(!file)return;
  try{
    spotifyUri($('spotifyUrl').value);
    if(file.size>2_000_000)throw new Error('Choose a Code file under 2 MB.');
    let data;
    if(file.type==='image/svg+xml'||file.name.toLowerCase().endsWith('.svg'))data='data:image/svg+xml;base64,'+utf8Base64(validateCodeSvg(await file.text()));
    else if(file.type==='image/png')data=await readFile(file);
    else throw new Error('Import the SVG or PNG downloaded from Spotify Codes.');
    const image=await loadImage(data);
    if(image.naturalWidth/image.naturalHeight<2)throw new Error('Use the complete horizontal Code image, including its logo and rectangle.');
    state.codeDataUrl=data;
    state.codeWidth=image.naturalWidth;
    state.codeHeight=image.naturalHeight;
    $('codeConfirmed').checked=false;
    $('removeCode').hidden=false;
    render();
    status('codeStatus','Code imported unchanged. Scan it in Spotify and verify the destination before exporting.');
  }catch(e){
    status('codeStatus',e.message,true);
  }
});

$('removeCode').addEventListener('click',()=>{
  state.codeDataUrl='';
  $('codeConfirmed').checked=false;
  $('removeCode').hidden=true;
  $('codeFile').value='';
  status('codeStatus','Code removed.');
  render();
});

function exportAllowed(){
  if(!$('rights').checked)throw new Error('Confirm you have the artwork rights before exporting. A checkbox does not grant a license.');
  if(state.codeDataUrl&&!$('codeConfirmed').checked)throw new Error('Scan the imported Code with Spotify and confirm the album destination first.');
  if(!render())throw new Error('Resolve the layout issue before exporting.');
}

const slug=()=>state.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'album-poster';

function download(blob,name){
  const a=document.createElement('a');
  const url=URL.createObjectURL(blob);
  a.href=url;
  a.download=name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

$('exportSvg').addEventListener('click',()=>{
  try{
    exportAllowed();
    download(new Blob([svg],{type:'image/svg+xml'}),`${slug()}-${state.size}.svg`);
    status('exportStatus','SVG downloaded. Artwork is embedded; text and border stay vector.');
  }catch(e){
    status('exportStatus',e.message,true);
  }
});

$('exportPng').addEventListener('click',async()=>{
  let objectUrl;
  try{
    exportAllowed();
    $('exportPng').disabled=true;
    const exportSvg=svg,exportSize=state.size,exportName=slug();
    const dpi=Number($('dpi').value);
    const [w,h]=(exportSize==='A3'?[11.7,16.5]:exportSize.split('x').map(Number));
    status('exportStatus',`Rendering ${Math.round(w*dpi)} × ${Math.round(h*dpi)} pixels…`);
    await new Promise(r=>setTimeout(r,30));
    objectUrl=URL.createObjectURL(new Blob([exportSvg],{type:'image/svg+xml'}));
    const image=await loadImage(objectUrl);
    const c=document.createElement('canvas');
    c.width=Math.round(w*dpi);
    c.height=Math.round(h*dpi);
    const ctx=c.getContext('2d');
    if(!ctx)throw new Error('Not enough memory. Try 150 DPI or a smaller print size.');
    ctx.drawImage(image,0,0,c.width,c.height);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    if(!blob)throw new Error('Export exceeded browser memory. Try 150 DPI.');
    download(await pngWithDpi(blob,dpi),`${exportName}-${exportSize}-${dpi}dpi.png`);
    c.width=c.height=1;
    status('exportStatus','PNG downloaded with print-resolution metadata. Source artwork detail is unchanged.');
  }catch(e){
    status('exportStatus',e.message,true);
  }finally{
    $('exportPng').disabled=false;
    if(objectUrl)URL.revokeObjectURL(objectUrl);
  }
});

$('printPdf').addEventListener('click',()=>{
  try{
    exportAllowed();
    const win=window.open('','_blank');
    if(!win)throw new Error('Allow pop-ups to open the print preview.');
    const [w,h]=(state.size==='A3'?[11.7,16.5]:state.size.split('x'));
    win.addEventListener('load',()=>win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>win.print())),{once:true});
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>Album poster — Print</title><style>@page{size:${w}in ${h}in;margin:0}html,body{margin:0;padding:0}svg{display:block;width:${w}in;height:${h}in}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>${svg}</body></html>`);
    win.document.close();
    status('exportStatus',`Choose Save as PDF, ${w} × ${h} inch paper, no margins, 100% scale, and background graphics. SVG is the exact-size alternative if your browser limits paper sizes.`);
  }catch(e){
    status('exportStatus',e.message,true);
  }
});

reset().catch(e=>status('exportStatus',e.message,true));
