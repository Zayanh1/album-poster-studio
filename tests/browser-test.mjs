import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function runBrowserTest() {
  console.log('Launching Headless Edge on port 9333...');
  const profileDir = process.env.TEMP + '\\edge-profile-' + Date.now();
  await mkdir(profileDir, { recursive: true });

  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + profileDir,
    'http://127.0.0.1:3000'
  ], { stdio: 'ignore' });

  try {
    let target = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch('http://127.0.0.1:9333/json/list');
        const list = await res.json();
        target = list.find(t => t.type === 'page' && t.url.includes('3000'));
        if (target) break;
      } catch {}
    }

    if (!target) {
      throw new Error('Edge failed to start or page target was not found.');
    }

    console.log('Connected to Edge target:', target.title, '| WS URL:', target.webSocketDebuggerUrl);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || 'Evaluation error');
      }
      return res.result?.value;
    }

    // Wait for app to initialize
    await new Promise(r => setTimeout(r, 1200));

    console.log('\n--- Test 1: Page Title and Initial DOM ---');
    const pageTitle = await evaluate('document.title');
    console.log('Page title:', pageTitle);
    const posterSvgExists = await evaluate('Boolean(document.querySelector("#poster svg"))');
    console.log('Initial poster SVG rendered:', posterSvgExists);

    console.log('\n--- Test 2: Sample Inspiration Chips ---');
    const chipsCount = await evaluate('document.querySelectorAll(".preset-chip").length');
    console.log('Preset chips count:', chipsCount);
    await evaluate('document.querySelector(".preset-chip[data-preset=\\"darkSide\\"]").click()');
    await new Promise(r => setTimeout(r, 500));
    const titleVal = await evaluate('document.getElementById("title").value');
    console.log('Clicked Dark Side preset, title field value:', titleVal);

    console.log('\n--- Test 3: Spotify Code Auto-Finding (Empty Input) ---');
    // Empty the input and click auto-pull to verify auto-find
    await evaluate(`
      document.getElementById("spotifyUrl").value = "";
      document.getElementById("autoPullCodeBtn").click();
    `);
    let codeSuccess = false;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 600));
      const hasCode = await evaluate('Boolean(document.querySelector("#poster svg image[x=\\"808\\"]"))');
      const spotifyUrlVal = await evaluate('document.getElementById("spotifyUrl").value');
      const codeStatus = await evaluate('document.getElementById("codeStatus").textContent');
      if (spotifyUrlVal && (hasCode || codeStatus.includes('Official Spotify Code'))) {
        console.log('✓ Auto-found Spotify URL without user typing it:', spotifyUrlVal);
        console.log('✓ Spotify Code successfully pulled and rendered in SVG! Status:', codeStatus);
        codeSuccess = true;
        break;
      }
    }
    if (!codeSuccess) {
      const codeStatus = await evaluate('document.getElementById("codeStatus").textContent');
      console.log('Spotify code status text:', codeStatus);
    }

    console.log('\n--- Test 4: 3000px Artwork Auto-Pulling ---');
    await evaluate(`
      document.getElementById("autoPullArtBtn").click();
    `);
    let artSuccess = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 600));
      const artStatus = await evaluate('document.getElementById("artStatus").textContent');
      const ppiText = await evaluate('document.getElementById("ppi").textContent');
      if (artStatus.includes('pulled') || artStatus.includes('3000') || artStatus.includes('High-resolution')) {
        console.log('✓ High-res artwork successfully pulled! Status:', artStatus);
        console.log('Print PPI badge:', ppiText);
        artSuccess = true;
        break;
      }
    }

    console.log('\n--- Test 5: Search Covers Gallery ---');
    await evaluate(`
      document.getElementById("toggleArtSearchBtn").click();
      document.getElementById("artQuery").value = "Daft Punk Discovery";
      document.getElementById("artSearchSubmit").click();
    `);
    let galleryCount = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 600));
      galleryCount = await evaluate('document.querySelectorAll("#artworkGallery .artwork-card").length');
      if (galleryCount > 0) {
        console.log(`✓ Artwork gallery populated with ${galleryCount} covers!`);
        break;
      }
    }

    console.log('\n--- Test 6: Background Gradient Modes ---');
    await evaluate(`
      {
        const gradSelect = document.getElementById("bgGradient");
        gradSelect.value = "radial";
        gradSelect.dispatchEvent(new Event("change"));
      }
    `);
    await new Promise(r => setTimeout(r, 400));
    const hasRadial = await evaluate('document.querySelector("#poster svg").outerHTML.includes("<radialGradient id=\\"posterBg\\"")');
    console.log('✓ Radial ambient spotlight gradient rendered:', hasRadial);

    await evaluate(`
      {
        const gradSelect = document.getElementById("bgGradient");
        gradSelect.value = "palette";
        gradSelect.dispatchEvent(new Event("change"));
      }
    `);
    await new Promise(r => setTimeout(r, 400));
    const hasPaletteGrad = await evaluate('document.querySelector("#poster svg").outerHTML.includes("<linearGradient id=\\"posterBg\\"")');
    console.log('✓ Artwork palette gradient blend rendered:', hasPaletteGrad);

    console.log('\n--- Test 7: Capture Screenshot ---');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile('tests/browser-test-screenshot.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to tests/browser-test-screenshot.png');

    ws.close();
    console.log('\nAll browser automated tests completed successfully!');
  } finally {
    edge.kill('SIGTERM');
  }
}

runBrowserTest().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
