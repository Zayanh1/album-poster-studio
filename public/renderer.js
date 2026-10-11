/** Print renderer: embedded raster artwork + resolution-independent typography. */
const SIZES = {
  '12x12': [12, 12],
  '12x18': [12, 18],
  '18x24': [18, 24],
  '24x36': [24, 36],
  'A3': [11.7, 16.5],
  'A4': [8.3, 11.7]
};
const clamp = (n, min, max, fallback) => Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback;
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
export function escapeXML(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c])); }
function dataImage(value, allowSVG = false) {
  if (!value) return '';
  // Restrict embedded images to inert raster data, never remote URLs or SVG payloads.
  if (!(allowSVG ? /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i : /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i).test(value)) throw new Error('Use an embedded PNG, JPEG, or WebP image. Remote URLs and SVG images are not allowed.');
  return value.replace(/\s/g, '');
}
function plain(value, max = 400) { return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max); }
function width(text, size, bold = false) {
  return Array.from(text).reduce((sum, c) => sum + (/\s/.test(c) ? .28 : /[ilI.,:;'!|]/.test(c) ? .25 : /[MW@#%]/.test(c) ? .91 : /[^\u0000-\u024f]/.test(c) ? 1 : /[A-Z]/.test(c) ? .67 : .53), 0) * size * (bold ? 1.04 : 1);
}
function fit(text, max, preferred, bold = false) { return Math.min(preferred, preferred * max / Math.max(1, width(text, preferred, bold))); }
function wrap(text, max, size, bold = false) {
  const str = String(text ?? '').trim();
  if (!str) return [''];
  const words = str.split(/\s+/);
  const output = [];
  let line = '';
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (width(testLine, size, bold) <= max) {
      line = testLine;
    } else {
      if (line) {
        output.push(line);
        line = '';
      }
      if (width(word, size, bold) > max) {
        let chunk = '';
        for (const char of Array.from(word)) {
          if (chunk && width(chunk + char, size, bold) > max) {
            output.push(chunk);
            chunk = '';
          }
          chunk += char;
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  }
  if (line) output.push(line);
  return output.length ? output : [''];
}
function layout(state) {
  const inches = SIZES[state.size] || SIZES['18x24'];
  const h = 1080 * inches[1] / inches[0];
  const tracks = (Array.isArray(state.tracks) ? state.tracks : []).map(t => plain(t));
  if (tracks.length > 60) throw new Error('This poster supports up to 60 tracks. Remove extra tracks before exporting.');
  
  const gap = 30, left = 54, metadataX = 808;
  const colCount = state.columns === '1' ? 1 : state.columns === '3' ? 3 : 2;
  const availableTrackWidth = metadataX - left - gap;
  const colWidth = colCount === 1 ? availableTrackWidth : colCount === 3 ? Math.floor((availableTrackWidth - gap * 2) / 3) : 330;

  // Adaptive font sizing: if track titles are long or many, scale trackSize down so artSize stays >= 300
  let trackSize = tracks.length > 40 ? 13 : tracks.length > 24 ? 15 : 18;
  if (colCount === 3 && trackSize > 13) trackSize = 13;
  if (colCount === 1 && tracks.length <= 8) trackSize = 20;

  let columns, lines, rowHeight, metadataHeight, needed, artSize, middle;

  const getColumns = () => {
    if (colCount === 1) {
      return [tracks];
    } else if (colCount === 3) {
      const perCol = Math.ceil(tracks.length / 3);
      return [tracks.slice(0, perCol), tracks.slice(perCol, perCol * 2), tracks.slice(perCol * 2)];
    } else {
      middle = Math.ceil(tracks.length / 2);
      return [tracks.slice(0, middle), tracks.slice(middle)];
    }
  };

  while (trackSize >= 8.5) {
    columns = getColumns();
    lines = columns.map(column => column.map(t => wrap(t, colWidth - 33, trackSize)));
    rowHeight = trackSize * 1.37;
    const trackPad = trackSize < 12 ? 3 : 6;
    metadataHeight = [state.date, state.duration, state.label, String(tracks.length)].filter(Boolean).reduce((sum, value) => sum + 39 + 19 * wrap(plain(value, 140), 218, 14).length, 0) + (state.codeDataUrl ? 218 * clamp(state.codeHeight, 1, 10000, 160) / clamp(state.codeWidth, 1, 10000, 640) : 0);
    needed = Math.max(140, metadataHeight, ...lines.map(column => column.reduce((total, rows) => total + rows.length * rowHeight + trackPad, 0)));
    artSize = Math.min(972, h - 54 - 196 - needed - 65);
    if (artSize >= 300 || trackSize <= 8.5) break;
    trackSize -= 0.5;
  }

  if (artSize < 300) throw new Error('These track names are too long for this print layout. Shorten track labels or choose a taller format.');
  return { inches, h, tracks, middle: middle || Math.ceil(tracks.length / 2), columns, colCount, lines, trackSize, rowHeight, needed, artSize, left, colWidth, gap, metadataX };
}
export function effectivePpi(state = {}) {
  const l = layout(state);
  const aw = Number(state.artWidth) || 0, ah = Number(state.artHeight) || 0;
  if (!aw || !ah) return 0;
  const printedSquare = (l.artSize - 2 * clamp(state.borderWidth, 0, 32, 8)) / 1080 * l.inches[0];
  return Math.round(Math.max(aw, ah) / printedSquare);
}
export function createPosterSVG(state = {}) {
  const l = layout(state), { h, artSize, left, tracks, trackSize, rowHeight, colWidth, metadataX } = l;
  const dark = state.theme !== 'light';
  const bg = color(state.background, dark ? '#151515' : '#F3F0E9');
  const bg2 = color(state.background2, dark ? '#080808' : '#DDD6C6');
  const ink = color(state.textColor, dark ? '#F7F2E8' : '#171717');
  const border = color(state.borderColor, dark ? '#F7F2E8' : '#171717');
  const bw = clamp(state.borderWidth, 0, 32, 8);
  const palette = (Array.isArray(state.palette) && state.palette.length ? state.palette : ['#30251F','#735845','#A77953','#C6A989','#DDD2BE']).slice(0,5).map(c => color(c,'#777777'));
  const art = dataImage(state.artDataUrl), code = dataImage(state.codeDataUrl, true);
  const fontChoice = state.fontFamily === 'serif' ? 'Georgia, "Times New Roman", Garamond, serif' : state.fontFamily === 'mono' ? '"SF Mono", Menlo, Consolas, Monaco, monospace' : 'Arial, Helvetica, sans-serif';
  const artFit = state.artFit === 'slice' ? 'xMidYMid slice' : 'xMidYMid meet';
  const ax = (1080 - artSize) / 2, ay = 54;

  let bgFill = bg;
  let defsMarkup = '';
  let auraLayer = '';
  const gradMode = state.bgGradient || 'none';
  if (gradMode === 'transparent' || gradMode === 'backgroundless') {
    bgFill = 'none';
  } else if (gradMode === 'art-aura' || gradMode === 'aura') {
    defsMarkup = `<defs>
      <filter id="artAuraBlur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="96"/>
        <feColorMatrix type="matrix" values="1.2 0 0 0 0  0 1.2 0 0 0  0 0 1.2 0 0  0 0 0 0.82 0"/>
      </filter>
      <linearGradient id="auraShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#070709" stop-opacity="0.82"/>
        <stop offset="28%" stop-color="#070709" stop-opacity="0.10"/>
        <stop offset="62%" stop-color="#070709" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="#070709" stop-opacity="0.95"/>
      </linearGradient>
      <clipPath id="auraClip"><rect width="1080" height="${h}"/></clipPath>
    </defs>`;
    bgFill = palette[0] || bg;
    if (art) {
      const auraScale = artSize * 1.38;
      const auraX = (1080 - auraScale) / 2;
      const auraY = ay - (auraScale - artSize) * 0.45;
      auraLayer = `<g clip-path="url(#auraClip)"><image x="${auraX}" y="${auraY}" width="${auraScale}" height="${auraScale}" preserveAspectRatio="${artFit}" filter="url(#artAuraBlur)" xlink:href="${art}"/><rect width="1080" height="${h}" fill="url(#auraShade)"/></g>`;
    }
  } else if (gradMode === 'cinema-glow') {
    defsMarkup = `<defs><radialGradient id="posterBg" cx="50%" cy="32%" r="68%"><stop offset="0%" stop-color="${palette[1] || bg2}" stop-opacity="0.9"/><stop offset="48%" stop-color="${palette[2] || bg}" stop-opacity="0.5"/><stop offset="100%" stop-color="${palette[0] || '#08080a'}"/></radialGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'linear-v') {
    defsMarkup = `<defs><linearGradient id="posterBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'linear-d') {
    defsMarkup = `<defs><linearGradient id="posterBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'radial') {
    defsMarkup = `<defs><radialGradient id="posterBg" cx="50%" cy="32%" r="65%" fx="50%" fy="32%"><stop offset="0%" stop-color="${bg2}"/><stop offset="100%" stop-color="${bg}"/></radialGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'subtle-linear') {
    defsMarkup = `<defs><linearGradient id="posterBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${bg2}" stop-opacity="0.88"/></linearGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'vibrant') {
    defsMarkup = `<defs><linearGradient id="posterBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${palette[1] || bg}"/><stop offset="50%" stop-color="${palette[2] || bg2}"/><stop offset="100%" stop-color="${palette[3] || palette[0] || bg}"/></linearGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'palette') {
    defsMarkup = `<defs><linearGradient id="posterBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${palette[0]}"/><stop offset="35%" stop-color="${palette[1]}"/><stop offset="70%" stop-color="${palette[2]}"/><stop offset="100%" stop-color="${palette[3] || palette[4]}"/></linearGradient></defs>`;
    bgFill = 'url(#posterBg)';
  } else if (gradMode === 'duotone') {
    defsMarkup = `<defs><linearGradient id="posterBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${palette[0]}"/><stop offset="100%" stop-color="${palette[4]}"/></linearGradient></defs>`;
    bgFill = 'url(#posterBg)';
  }
  
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${l.inches[0]}in" height="${l.inches[1]}in" viewBox="0 0 1080 ${h}" role="img" aria-label="${escapeXML(plain(state.title || 'Album poster'))}">`,
    defsMarkup,
    `<title>${escapeXML(plain(state.title || 'Album poster'))} — ${escapeXML(plain(state.artist))}</title>`,
    `<rect width="1080" height="${h}" fill="${bgFill}"/>`,
    auraLayer
  ].filter(Boolean);
  const text = (str, x, y, size, options = {}) => parts.push(`<text x="${x}" y="${y}" fill="${ink}" font-family="${fontChoice}" font-size="${size.toFixed(3)}"${options.bold ? ' font-weight="700"' : ''}${options.opacity ? ` opacity="${options.opacity}"` : ''}${options.spacing ? ` letter-spacing="${options.spacing}"` : ''}>${escapeXML(str)}</text>`);
  parts.push(`<rect x="${ax}" y="${ay}" width="${artSize}" height="${artSize}" fill="${border}"/>`);
  if (art) parts.push(`<image x="${ax+bw}" y="${ay+bw}" width="${artSize-2*bw}" height="${artSize-2*bw}" preserveAspectRatio="${artFit}" xlink:href="${art}"/>`);
  else { text('YOUR ALBUM ART', ax+artSize*.13, ay+artSize*.52, fit('YOUR ALBUM ART',artSize*.74,40), {bold:true}); }
  const title = plain(state.title || 'UNTITLED', 160);
  const titleY = ay + artSize + 64;
  const titleSize = fit(title, 972, 57, true);
  text(title, left, titleY, titleSize, {bold:true});
  const artist = plain(state.artist || 'ARTIST NAME', 160);
  text(artist, left, titleY+37, fit(artist,710,23), {opacity:.82});
  const swatchW = 34, swatchGap = 3;
  const rx = state.swatchStyle === 'pill' ? 11 : 2;
  const totalSwatchesW = palette.length * swatchW + (palette.length - 1) * swatchGap;
  const startX = 1026 - totalSwatchesW;
  palette.forEach((c,i) => parts.push(`<rect x="${startX + i * (swatchW + swatchGap)}" y="${titleY+14}" width="${swatchW}" height="24" rx="${rx}" ry="${rx}" fill="${c}"/>`));
  const ruleY = titleY+64;
  parts.push(`<path d="M54 ${ruleY}H1026" stroke="${ink}" stroke-width="2"/>`);
  const contentY = ruleY+35;
  const trackPad = trackSize < 12 ? 3 : 6;
  l.lines.forEach((column,index) => {
    let y = contentY;
    const colOffset = index === 0 ? 0 : l.colCount === 3 ? index * Math.ceil(tracks.length / 3) : l.middle;
    column.forEach((rows,j) => {
      text(String(colOffset+j+1).padStart(2,'0'),left+index*(colWidth+l.gap),y,trackSize*.75,{opacity:.55});
      rows.forEach(row => { text(row,left+index*(colWidth+l.gap)+33,y,trackSize); y+=rowHeight; });
      y+=trackPad;
    });
  });
  let my = contentY;
  const metadata = (heading,value) => {
    if (!value) return;
    text(heading,metadataX,my,10,{spacing:1.5,opacity:.55}); my+=21;
    wrap(plain(value,140),218,14).forEach(line => { text(line,metadataX,my,14); my+=19; }); my+=18;
  };
  metadata('RELEASED',state.date);
  metadata('RUNTIME',state.duration);
  metadata('LABEL',state.label);
  metadata('TRACKS',String(tracks.length));
  if(code) {
    const cw = clamp(state.codeWidth,1,10000,640), ch = clamp(state.codeHeight,1,10000,160);
    const codeW = 218, codeH = codeW*ch/cw;
    if (my+codeH > h-48) throw new Error('Spotify code is too tall for this poster. Use the full horizontal Spotify Code image.');
    parts.push(`<image x="${metadataX}" y="${my}" width="${codeW}" height="${codeH}" preserveAspectRatio="xMidYMid meet" xlink:href="${code}"/>`);
  }
  parts.push('</svg>'); return parts.join('\n');
}
/** Chroma-weighted deterministic palette extraction ensuring vibrant artwork colors are prioritized. */
export function extractPalette(image) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) throw new Error('Palette extraction requires a browser canvas.');
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  ctx.drawImage(image,0,0,96,96);
  const pixels = ctx.getImageData(0,0,96,96).data;
  const bins = new Map();
  for (let i=0;i<pixels.length;i+=4) {
    if(pixels[i+3]<128) continue;
    const rgb=[pixels[i],pixels[i+1],pixels[i+2]], key=rgb.map(v=>v>>5).join(',');
    const b=bins.get(key)||{n:0,r:0,g:0,b:0}; b.n++; b.r+=rgb[0];b.g+=rgb[1];b.b+=rgb[2]; bins.set(key,b);
  }
  // Weight bins by both pixel frequency and color chroma (saturation), ensuring rich hues are captured
  const ranked = [...bins.values()].map(b => {
    const r = b.r / b.n, g = b.g / b.n, bl = b.b / b.n;
    const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
    const chroma = max - min;
    const score = b.n * (1 + (chroma / 28) ** 1.35);
    return { rgb: [r, g, bl], chroma, n: b.n, score };
  }).sort((a,b) => b.score - a.score).map(b => b.rgb);

  const chosen = [];
  for(const rgb of ranked) {
    if(chosen.every(c => c.reduce((sum,v,i)=>sum+(v-rgb[i])**2,0) > 2200)) {
      chosen.push(rgb);
    }
    if(chosen.length === 5) break;
  }
  for(const rgb of ranked) {
    if(chosen.length === 5) break;
    if(!chosen.includes(rgb)) chosen.push(rgb);
  }
  if (!chosen.length) chosen.push([127,127,127]);
  while(chosen.length < 5) chosen.push(chosen[chosen.length-1]);
  return chosen.sort((a,b) => a.reduce((s,v)=>s+v,0) - b.reduce((s,v)=>s+v,0)).map(rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2,'0')).join(''));
}

