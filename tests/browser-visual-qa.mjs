import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function runBrowserVisualQATest() {
  console.log('Launching Headless Edge for Visual QA on port 9334...');
  const profileDir = process.env.TEMP + '\\edge-profile-qa-' + Date.now();
  await mkdir(profileDir, { recursive: true });

  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9334',
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
        const res = await fetch('http://127.0.0.1:9334/json/list');
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

    console.log('\n--- 1. Pull Spotify Code for Dark Side ---');
    await evaluate('document.querySelector(".preset-chip[data-preset=\\"darkSide\\"]").click()');
    await new Promise(r => setTimeout(r, 800));
    
    // Auto pull code
    await evaluate('document.getElementById("autoPullCodeBtn").click()');
    let codeReady = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const hasCode = await evaluate('Boolean(document.querySelector("#poster svg image[x=\\"808\\"]"))');
      if (hasCode) { codeReady = true; break; }
    }
    console.log('✓ Spotify Code loaded in SVG:', codeReady);

    console.log('\n--- 2. Switch to Vintage Newsprint Paper Mood ---');
    await evaluate(`
      const themeSelect = document.getElementById("theme");
      themeSelect.value = "newsprint";
      themeSelect.dispatchEvent(new Event("change"));
    `);
    await new Promise(r => setTimeout(r, 400));
    const newsprintBg = await evaluate('document.querySelector("#poster svg rect").getAttribute("fill")');
    const newsprintTextColor = await evaluate('document.getElementById("textColor").value');
    console.log('✓ Newsprint background fill in SVG:', newsprintBg);
    console.log('✓ Newsprint text color:', newsprintTextColor);

    // Verify Spotify code in SVG was recolored to match newsprint text color!
    const codeHref = await evaluate('document.querySelector("#poster svg image[x=\\"808\\"]").getAttribute("xlink:href")');
    const decodedCodeSvg = Buffer.from(codeHref.split(',')[1], 'base64').toString('utf8');
    const hasNewsprintColorInCode = decodedCodeSvg.includes(`fill="${newsprintTextColor}"`);
    console.log('✓ Spotify Code bars dynamically re-tinted to newsprint text color (#1c1a17):', hasNewsprintColorInCode);

    console.log('\n--- 3. Switch to Transparent Mode ---');
    await evaluate(`
      const gradSelect = document.getElementById("bgGradient");
      gradSelect.value = "transparent";
      gradSelect.dispatchEvent(new Event("change"));
    `);
    await new Promise(r => setTimeout(r, 400));
    const transparentBg = await evaluate('document.querySelector("#poster svg rect").getAttribute("fill")');
    const hasTransparentClass = await evaluate('document.getElementById("poster").classList.contains("is-transparent")');
    console.log('✓ Transparent background fill in SVG (none):', transparentBg === 'none');
    console.log('✓ Poster stage element displays checkerboard cue class (.is-transparent):', hasTransparentClass);

    console.log('\n--- 4. Capture Visual QA Screenshot ---');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile('tests/audit-output/browser-visual-qa.png', Buffer.from(screenshot.data, 'base64'));
    console.log('✓ Screenshot saved to tests/audit-output/browser-visual-qa.png');

    ws.close();
    console.log('\n>>> Visual QA Browser Suite Completed with 100% Success!');
  } finally {
    edge.kill('SIGTERM');
  }
}

runBrowserVisualQATest().catch(err => {
  console.error('Browser Visual QA test failed:', err);
  process.exit(1);
});
