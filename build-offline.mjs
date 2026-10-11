import {readFile,writeFile} from 'node:fs/promises';
const [html,css,renderer,utils,app]=await Promise.all(['public/index.html','public/styles.css','public/renderer.js','public/export-utils.js','public/app.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
const script=renderer.replace(/export function /g,'function ')+ '\n'+utils.replace(/export /g,'')+'\n'+app.replace(/^import .*;\n/gm,'');
const bundled=html.replace('<link rel="stylesheet" href="/styles.css">',`<style>${css}</style>`).replace('<script type="module" src="/app.js"></script>',`<script type="module">${script.replace(/<\/script/gi,'<\\/script')}</script>`).replace('href="/" aria-label="Sleeve home"','href="#" aria-label="Sleeve home"');
await writeFile(new URL('OPEN-STUDIO.html',import.meta.url),bundled);
console.log('Built OPEN-STUDIO.html — local editing and export, no installation required.');
