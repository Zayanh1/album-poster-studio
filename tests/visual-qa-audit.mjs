import { createPosterSVG, effectivePpi } from '../public/renderer.js';
import { KNOWN_SPOTIFY_ALBUMS } from '../server.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Relative luminance & contrast ratio calculation per WCAG 2.1
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
}

function srgbLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  if (!hex1 || !hex2 || !/^#[0-9a-f]{6}$/i.test(hex1) || !/^#[0-9a-f]{6}$/i.test(hex2)) {
    return null;
  }
  const l1 = srgbLuminance(hexToRgb(hex1));
  const l2 = srgbLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const DUMMY_ART = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runVisualQAAudit() {
  console.log('=====================================================');
  console.log('   SLEEVE ALBUM POSTER STUDIO — VISUAL QA AUDIT      ');
  console.log('=====================================================\n');

  const auditDir = path.resolve('tests/audit-output');
  await mkdir(auditDir, { recursive: true });

  const results = {
    spotifyCode: {},
    albumStress: [],
    backgroundModes: [],
    visualMetrics: [],
    layoutDefects: [],
    recommendations: []
  };

  // -----------------------------------------------------------------
  // 1. SPOTIFY CODE VERIFICATION (Endpoint & Transparency)
  // -----------------------------------------------------------------
  console.log('>>> [1/4] Verifying Spotify Code SVG Transparency & API Integration...');

  const testUris = [
    { name: 'Dark Side of the Moon', uri: 'spotify:album:4LH4d3cOWNNsVw41Gqt2kv', tint: '#ffffff' },
    { name: 'Discovery', uri: 'spotify:album:2noRn2Aes5aoNVsU6iWThc', tint: '#00e5ff' },
    { name: 'Rumours', uri: 'spotify:album:1TEowX5k7nvSR1VzSotWM0', tint: '#241e17' },
    { name: 'OK Computer', uri: 'spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE', tint: '#151d24' }
  ];

  const fetchedCodes = {};

  for (const item of testUris) {
    const url = `http://127.0.0.1:3000/api/spotify-code?uri=${encodeURIComponent(item.uri)}&color=${encodeURIComponent(item.tint)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch code for ${item.name}: ${res.status}`);
    }
    const json = await res.json();
    const svgText = Buffer.from(json.dataUrl.split(',')[1], 'base64').toString('utf8');

    // Check for opaque background rect: 400x100 or any full-canvas rect
    const hasFullRect = /<rect[^>]*width=["']400["'][^>]*height=["']100["']/i.test(svgText);
    const rectMatches = svgText.match(/<rect[^>]+>/g) || [];
    const pathMatches = svgText.match(/<path[^>]+>/g) || [];
    const fills = [...new Set(svgText.match(/fill=["'][^"']+["']/g) || [])];
    
    // Check if tint was applied to all bars and paths
    const allFilledWithTint = fills.every(f => f.toLowerCase().includes(item.tint.toLowerCase()));

    fetchedCodes[item.name] = json.dataUrl;

    console.log(`  Album: ${item.name}`);
    console.log(`    - Has opaque 400x100 background rect: ${hasFullRect ? 'FAIL (Opaque rect found!)' : 'PASS (Backgroundless)'}`);
    console.log(`    - Total vertical bars (<rect>): ${rectMatches.length}`);
    console.log(`    - Spotify icon elements (<path>): ${pathMatches.length}`);
    console.log(`    - Color fills detected: ${fills.join(', ')}`);
    console.log(`    - Tint matched requested color: ${allFilledWithTint ? 'YES' : 'PARTIAL/NO'}`);

    results.spotifyCode[item.name] = {
      transparent: !hasFullRect,
      barsCount: rectMatches.length,
      fills,
      tintApplied: allFilledWithTint
    };
  }

  // -----------------------------------------------------------------
  // 2. ALBUM STRESS TESTING (Diverse Albums)
  // -----------------------------------------------------------------
  console.log('\n>>> [2/4] Stress Testing Diverse Album Archetypes...');

  const albumArchetypes = [
    {
      id: 'darkSide',
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
      theme: 'dark',
      fontFamily: 'sans',
      codeKey: 'Dark Side of the Moon'
    },
    {
      id: 'discovery',
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
      theme: 'dark',
      fontFamily: 'sans',
      codeKey: 'Discovery'
    },
    {
      id: 'rumours',
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
      theme: 'light',
      fontFamily: 'serif',
      codeKey: 'Rumours'
    },
    {
      id: 'okComputer',
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
      theme: 'light',
      fontFamily: 'mono',
      codeKey: 'OK Computer'
    },
    {
      id: 'extreme60',
      title: 'COMPLETE ORCHESTRAL SUITE IN SIXTY MOVEMENTS',
      artist: 'Symphony Orchestra & International Soloists',
      date: 'November 15, 2024',
      duration: '2:45:10',
      label: 'Deutsche Grammophon Masterworks',
      tracks: Array.from({ length: 60 }, (_, i) => `Movement ${i + 1}: Largo e Maestoso con Fuoco e Dolcezza in D Minor, Op. ${i * 3 + 1}`),
      palette: ['#141414','#3a3a3a','#8a8a8a','#c4c4c4','#ffffff'],
      background: '#111111',
      textColor: '#ffffff',
      borderColor: '#ffffff',
      theme: 'dark',
      fontFamily: 'serif',
      codeKey: 'Dark Side of the Moon'
    }
  ];

  for (const alb of albumArchetypes) {
    const posterState = {
      title: alb.title,
      artist: alb.artist,
      date: alb.date,
      duration: alb.duration,
      label: alb.label,
      tracks: alb.tracks,
      palette: alb.palette,
      background: alb.background,
      textColor: alb.textColor,
      borderColor: alb.borderColor,
      borderWidth: 8,
      theme: alb.theme,
      fontFamily: alb.fontFamily,
      columns: 'auto',
      size: '18x24',
      artDataUrl: DUMMY_ART,
      codeDataUrl: fetchedCodes[alb.codeKey] || '',
      codeWidth: 640,
      codeHeight: 160
    };

    let renderedSvg;
    let error = null;
    try {
      renderedSvg = createPosterSVG(posterState);
    } catch (err) {
      error = err.message;
    }

    const contrast = contrastRatio(alb.textColor, alb.background);
    const contrastRating = contrast >= 7 ? 'AAA (Superb)' : contrast >= 4.5 ? 'AA (Good)' : 'FAIL (<4.5)';

    console.log(`  Album: ${alb.title} (${alb.tracks.length} tracks)`);
    if (error) {
      console.log(`    - Render FAILED: ${error}`);
      results.albumStress.push({ title: alb.title, error, pass: false });
    } else {
      const ppi = effectivePpi(posterState);
      const hasCodeImage = renderedSvg.includes('<image x="808"');
      const hasTitle = renderedSvg.includes(alb.title);
      console.log(`    - Render SUCCESS! Length: ${renderedSvg.length} chars`);
      console.log(`    - Text/Bg Contrast Ratio: ${contrast ? contrast.toFixed(2) : 'N/A'}:1 [${contrastRating}]`);
      console.log(`    - Spotify Code integrated: ${hasCodeImage ? 'YES' : 'NO'}`);
      
      // Save SVG artifact
      await writeFile(path.join(auditDir, `${alb.id}.svg`), renderedSvg);

      results.albumStress.push({
        title: alb.title,
        trackCount: alb.tracks.length,
        contrast: contrast ? contrast.toFixed(2) : null,
        contrastRating,
        hasCodeImage,
        pass: true
      });
    }
  }

  // -----------------------------------------------------------------
  // 3. BACKGROUND MODES & PAPER MOODS TESTING
  // -----------------------------------------------------------------
  console.log('\n>>> [3/4] Testing Background Modes & Paper Moods...');

  const bgModes = [
    { name: 'none', bgGradient: 'none', bg: '#090a0d', bg2: '#212529', text: '#f5f5f7' },
    { name: 'transparent', bgGradient: 'transparent', bg: '#090a0d', bg2: '#212529', text: '#151515' },
    { name: 'linear-v', bgGradient: 'linear-v', bg: '#090a0d', bg2: '#251640', text: '#f5f5f7' },
    { name: 'linear-d', bgGradient: 'linear-d', bg: '#090a0d', bg2: '#251640', text: '#f5f5f7' },
    { name: 'radial', bgGradient: 'radial', bg: '#090a0d', bg2: '#2d1b4e', text: '#f5f5f7' },
    { name: 'palette', bgGradient: 'palette', bg: '#090a0d', bg2: '#212529', text: '#ffffff' },
    { name: 'duotone', bgGradient: 'duotone', bg: '#090a0d', bg2: '#212529', text: '#ffffff' },
    // Paper mood tests
    { name: 'mood-newsprint', bgGradient: 'none', bg: '#ded8cb', bg2: '#cdc4b3', text: '#1b1b1b' },
    { name: 'mood-cream', bgGradient: 'none', bg: '#f5f2eb', bg2: '#e5ded0', text: '#211d19' },
    { name: 'mood-obsidian', bgGradient: 'none', bg: '#0b0c0e', bg2: '#181a20', text: '#edebe4' },
    { name: 'mood-polar', bgGradient: 'none', bg: '#ffffff', bg2: '#f0f3f6', text: '#0a0a0a' }
  ];

  for (const mode of bgModes) {
    const posterState = {
      title: 'DISCOVERY',
      artist: 'Daft Punk',
      date: 'March 12, 2001',
      duration: '60:50',
      label: 'Virgin Records',
      tracks: ['One More Time','Aerodynamic','Digital Love','Harder, Better, Faster, Stronger','Crescendolls'],
      palette: ['#120924','#38166d','#ff007f','#00e5ff','#ffbe0b'],
      background: mode.bg,
      background2: mode.bg2,
      bgGradient: mode.bgGradient,
      textColor: mode.text,
      borderColor: mode.text,
      borderWidth: 6,
      theme: mode.bg === '#ffffff' || mode.bg === '#f5f2eb' || mode.bg === '#ded8cb' ? 'light' : 'dark',
      fontFamily: 'sans',
      columns: '1',
      size: '18x24',
      artDataUrl: DUMMY_ART,
      codeDataUrl: fetchedCodes['Discovery'],
      codeWidth: 640,
      codeHeight: 160
    };

    const svg = createPosterSVG(posterState);
    const bgFillMatch = svg.match(/<rect width="1080" height="\d+" fill="([^"]+)"\/>/);
    const bgFill = bgFillMatch ? bgFillMatch[1] : 'unknown';

    console.log(`  Mode: ${mode.name.padEnd(16)} | fill: ${bgFill.padEnd(20)} | Valid SVG: ${svg.includes('</svg>') ? 'YES' : 'NO'}`);
    await writeFile(path.join(auditDir, `bg-${mode.name}.svg`), svg);

    results.backgroundModes.push({
      mode: mode.name,
      bgFill,
      hasTransparentFill: bgFill === 'none'
    });
  }

  // -----------------------------------------------------------------
  // 4. METRIC & AESTHETIC DEEP-DIVE INSPECTION
  // -----------------------------------------------------------------
  console.log('\n>>> [4/4] Deep-Dive Inspection of SVG Layout & Visual Metrics...');

  // Inspect Rumours (light background) with Discovery (vibrant) code to test contrast
  // Check what happens if code color does not match textColor!
  console.log('\n[CRITICAL TEST]: Testing Spotify Code color synchronization vs poster text color');
  const lightRumoursState = {
    title: 'RUMOURS',
    artist: 'Fleetwood Mac',
    date: 'February 4, 1977',
    duration: '39:43',
    label: 'Warner Bros. Records',
    tracks: ['Dreams', 'The Chain', 'Go Your Own Way'],
    palette: ['#28221b','#6b543e','#ab4a26','#d9a036','#f3ebe1'],
    background: '#f4ede2', // Light cream paper
    textColor: '#241e17', // Dark ink
    borderColor: '#3a2d21',
    borderWidth: 8,
    theme: 'light',
    fontFamily: 'serif',
    columns: '1',
    size: '18x24',
    artDataUrl: DUMMY_ART,
    codeDataUrl: fetchedCodes['Dark Side of the Moon'], // Has WHITE fill: #ffffff
    codeWidth: 640,
    codeHeight: 160
  };

  const codeSvgDecoded = Buffer.from(fetchedCodes['Dark Side of the Moon'].split(',')[1], 'base64').toString('utf8');
  console.log('  Code embedded fill color:', codeSvgDecoded.match(/fill="([^"]+)"/)?.[1]);
  console.log('  Poster background color:', lightRumoursState.background);
  console.log('  Poster text color:', lightRumoursState.textColor);
  const codeOnCreamContrast = contrastRatio('#ffffff', lightRumoursState.background);
  console.log(`  CONTRAST of WHITE code on CREAM paper: ${codeOnCreamContrast?.toFixed(2)}:1 (FAIL! Almost invisible!)`);

  const codeCorrectedContrast = contrastRatio(lightRumoursState.textColor, lightRumoursState.background);
  console.log(`  CONTRAST of SYNCED code (${lightRumoursState.textColor}) on CREAM paper: ${codeCorrectedContrast?.toFixed(2)}:1 (AAA PASS!)\n`);

  // Write summary audit report JSON
  await writeFile(path.join(auditDir, 'audit-results.json'), JSON.stringify(results, null, 2));

  console.log('Audit completed successfully. All artifacts written to tests/audit-output/');
  return results;
}

runVisualQAAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
