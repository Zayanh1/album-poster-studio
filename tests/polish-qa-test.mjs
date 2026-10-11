import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  const profileDir = process.env.TEMP + '\\edge-profile-polish-' + Date.now();
  await mkdir(profileDir, { recursive: true });

  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9336',
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
        const res = await fetch('http://127.0.0.1:9336/json/list');
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

    // Test 1: UI Theme Toggle
    const themeTest = await evaluate(`(() => {
      const btn = document.getElementById('uiThemeToggle');
      if (!btn) return { error: 'No uiThemeToggle button found' };
      const initial = document.body.getAttribute('data-ui-theme') || 'light';
      btn.click();
      const toggled = document.body.getAttribute('data-ui-theme') || 'light';
      btn.click();
      const restored = document.body.getAttribute('data-ui-theme') || 'light';
      return { initial, toggled, restored, btnText: btn.textContent };
    })()`);
    console.log('Theme test debug:', themeTest);
    assert.notEqual(themeTest.initial, themeTest.toggled, 'Theme changed on click');
    assert.equal(themeTest.initial, themeTest.restored, 'Theme restored on second click');
    console.log('✓ UI Theme Toggle verified (initial: ' + themeTest.initial + ' -> ' + themeTest.toggled + ')');

    // Test 2: Color Swap Button
    const s = await evaluate(`(() => {
      const bgBefore = document.getElementById('background').value;
      const textBefore = document.getElementById('textColor').value;
      document.getElementById('swapColorsBtn').click();
      const bgAfter = document.getElementById('background').value;
      const textAfter = document.getElementById('textColor').value;
      return { bgBefore, textBefore, bgAfter, textAfter };
    })()`);
    assert.equal(s.bgAfter, s.textBefore, 'Background matches previous text color');
    assert.equal(s.textAfter, s.bgBefore, 'Text matches previous background color');
    console.log('✓ Color Swap Button (⇄) verified');

    // Test 3: Palette swatch click
    const swatchSuccess = await evaluate(`(() => {
      const swatches = document.querySelectorAll('.palette-swatch-card');
      if (!swatches.length) return false;
      const firstSwatch = swatches[0];
      const color = firstSwatch.querySelector('input').value;
      firstSwatch.click();
      const currentBg = document.getElementById('background').value;
      return currentBg.toLowerCase() === color.toLowerCase();
    })()`);
    assert.equal(swatchSuccess, true, 'Clicking swatch sets background');
    console.log('✓ Interactive Swatch Cards verified');

    // Test 4: Copy SVG and Export Buttons exist
    const b = await evaluate(`(() => {
      const copySvg = document.getElementById('copySvg');
      const exportSvg = document.getElementById('exportSvg');
      const exportPng = document.getElementById('exportPng');
      const shortcutsBtn = document.getElementById('shortcutsBtn');
      const dialog = document.getElementById('shortcutsDialog');
      return {
        hasCopySvg: Boolean(copySvg),
        hasExportSvg: Boolean(exportSvg),
        hasExportPng: Boolean(exportPng),
        hasShortcuts: Boolean(shortcutsBtn && dialog)
      };
    })()`);
    assert.equal(b.hasCopySvg, true, 'Copy SVG button present');
    assert.equal(b.hasExportSvg, true, 'Export SVG button present');
    assert.equal(b.hasExportPng, true, 'Export PNG button present');
    assert.equal(b.hasShortcuts, true, 'Shortcuts dialog present');
    console.log('✓ All Action & Export controls verified');

    ws.close();
    console.log('\n>>> All Polish QA Tests Passed with 100% Success!');
  } finally {
    edgeProcess.kill();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
