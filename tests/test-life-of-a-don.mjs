import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  const profileDir = process.env.TEMP + '\\edge-profile-don-' + Date.now();
  await mkdir(profileDir, { recursive: true });

  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9337',
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
        const res = await fetch('http://127.0.0.1:9337/json/list');
        const list = await res.json();
        target = list.find(t => t.type === 'page' && t.url.includes('3000'));
        if (target) break;
      } catch {}
    }
    if (!target) throw new Error('Edge failed to start or page target was not found.');

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

    await new Promise(r => setTimeout(r, 1200));

    // Test 1: Verify Dark Mode styling
    await evaluate(`(() => {
      const toggle = document.getElementById('uiThemeToggle');
      if (toggle && document.body.getAttribute('data-ui-theme') !== 'dark') {
        toggle.click();
      }
    })()`);
    await new Promise(r => setTimeout(r, 300));

    const darkInspection = await evaluate(`(() => {
      const input = document.getElementById('query');
      const dropZone = document.getElementById('dropZone');
      const stage = document.querySelector('.stage');
      const searchBtn = document.getElementById('searchButton');
      return {
        inputBg: getComputedStyle(input).backgroundColor,
        dropZoneBg: getComputedStyle(dropZone).backgroundColor,
        stageBg: getComputedStyle(stage).backgroundColor,
        searchBtnBg: getComputedStyle(searchBtn).backgroundColor,
        searchBtnColor: getComputedStyle(searchBtn).color
      };
    })()`);
    console.log('✓ Dark mode computed styles:', darkInspection);
    assert.match(darkInspection.inputBg, /rgb\(32,\s*34,\s*40\)/, 'Input background is dark');
    assert.match(darkInspection.dropZoneBg, /rgb\(26,\s*28,\s*34\)/, 'Dropzone background is dark');
    assert.match(darkInspection.stageBg, /rgb\(21,\s*23,\s*28\)/, 'Stage background is dark');

    // Test 2: Select "Life of a DON" preset
    await evaluate(`document.querySelector('.preset-chip[data-preset="lifeOfADon"]').click()`);
    await new Promise(r => setTimeout(r, 600));

    const donDetails = await evaluate(`(() => {
      const title = document.getElementById('title').value;
      const artist = document.getElementById('artist').value;
      const bgGrad = document.getElementById('bgGradient').value;
      const exportStatus = document.getElementById('exportStatus').textContent;
      const fullSvg = document.getElementById('poster').innerHTML;
      const hasAuraFilter = fullSvg.includes('artAuraBlur');
      const auraImg = fullSvg.includes('filter="url(#artAuraBlur)"');
      const swatches = Array.from(document.querySelectorAll('#poster svg rect[y]')).filter(r => r.getAttribute('height') === '24');
      return { title, artist, bgGrad, exportStatus, hasAuraFilter, auraImg, swatchCount: swatches.length };
    })()`);
    console.log('✓ Life of a DON preset loaded:', donDetails);
    assert.equal(donDetails.title, 'Life of a DON');
    assert.equal(donDetails.artist, 'Don Toliver');
    assert.equal(donDetails.bgGrad, 'art-aura');
    assert.equal(donDetails.hasAuraFilter, true, 'Atmospheric ambient aura filter exists');
    assert.equal(donDetails.auraImg, true, 'Atmospheric ambient aura image layer exists');
    assert.equal(donDetails.swatchCount, 5, 'Contiguous palette swatches rendered');

    // Test 3: Take screenshot of the poster stage
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await mkdir('tests/audit-output', { recursive: true });
    await writeFile('tests/audit-output/life-of-a-don-aura-stage.png', Buffer.from(shot.data, 'base64'));
    console.log('✓ Saved screenshot to tests/audit-output/life-of-a-don-aura-stage.png');

    // Scroll poster into view and capture zoomed poster
    await evaluate(`(() => {
      document.getElementById('poster').scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const posterShot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile('tests/audit-output/life-of-a-don-poster-scrolled.png', Buffer.from(posterShot.data, 'base64'));
    console.log('✓ Saved scrolled screenshot to tests/audit-output/life-of-a-don-poster-scrolled.png');

    ws.close();
    console.log('\n>>> All Tests Passed with 100% Success!');
  } finally {
    edgeProcess.kill();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
