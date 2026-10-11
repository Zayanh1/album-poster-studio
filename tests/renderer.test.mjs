import test from 'node:test';
import assert from 'node:assert/strict';
import {createPosterSVG,effectivePpi,escapeXML} from '../public/renderer.js';
const raster='data:image/png;base64,iVBORw0KGgo=';
const state={title:'Album',artist:'Artist',tracks:['One','Two'],artDataUrl:raster,artWidth:3000,artHeight:3000};
test('poster physical dimensions are exact',()=>{
 assert.match(createPosterSVG(state),/width="18in" height="24in" viewBox="0 0 1080 1440"/);
 assert.match(createPosterSVG({...state,size:'12x18'}),/width="12in" height="18in" viewBox="0 0 1080 1620"/);
 assert.match(createPosterSVG({...state,size:'24x36'}),/width="24in" height="36in"/);
});
test('user titles and tracks cannot inject SVG markup',()=>{
 const svg=createPosterSVG({...state,title:'<script>alert("x")</script>',tracks:['A & B','<image href="evil"/>']});
 assert.doesNotMatch(svg,/<script/);assert.match(svg,/&lt;script&gt;/);assert.match(svg,/A &amp; B/);assert.equal(escapeXML("'"),'&apos;');
});
test('external artwork and active SVG artwork are refused',()=>{
 assert.throws(()=>createPosterSVG({...state,artDataUrl:'https://example.com/a.png'}),/embedded/);
 assert.throws(()=>createPosterSVG({...state,artDataUrl:'data:image/svg+xml;base64,AAAA'}),/embedded/);
 assert.throws(()=>createPosterSVG({...state,codeDataUrl:'javascript:alert(1)'}),/embedded/);
});
test('sixty tracks fit and sixty-one is explicitly rejected',()=>{
 const tracks=Array.from({length:60},(_,i)=>`Track number ${i+1}`);
 const svg=createPosterSVG({...state,tracks});
 assert.match(svg,/>Track number 60<\/text>/);
 assert.throws(()=>createPosterSVG({...state,tracks:[...tracks,'61']}),/60 tracks/);
});
test('source artwork is embedded, contained, and bordered',()=>{
 const svg=createPosterSVG({...state,borderWidth:8,borderColor:'#ABCDEF'});
 assert.match(svg,/preserveAspectRatio="xMidYMid meet"/); assert.match(svg,/fill="#ABCDEF"/);assert.match(svg,/xlink:href="data:image\/png;base64,iVBORw0KGgo="/);
 assert.ok(effectivePpi(state)>180);assert.equal(effectivePpi({}),0);
});
test('authentic code embeds unchanged and no fake code is invented',()=>{
 const code='data:image/png;base64,YXV0aGVudGlj';
 const svg=createPosterSVG({...state,codeDataUrl:code,codeWidth:640,codeHeight:160});
 assert.ok(svg.includes(code));assert.equal((svg.match(/<image /g)||[]).length,2);
 assert.equal((createPosterSVG(state).match(/<image /g)||[]).length,1);
});
test('validated SVG Spotify assets are accepted only in code slot',()=>{
 const code='data:image/svg+xml;base64,PHN2Zy8+';
 assert.ok(createPosterSVG({...state,codeDataUrl:code}).includes(code));
});
test('Unicode tracks remain present and colors cannot add attributes',()=>{
 const svg=createPosterSVG({...state,tracks:['月の光','Beyoncé'],textColor:'red" onload="bad()'});
 assert.match(svg,/月の光/); assert.match(svg,/Beyoncé/);assert.doesNotMatch(svg,/onload/);
});
test('word wrapping wraps cleanly on whole word boundaries without cutting words in half',()=>{
 const svg=createPosterSVG({...state,tracks:['The Dark Side of the Moon and Other Stories That Keep Going']});
 assert.doesNotMatch(svg,/Oth<\/text>/);
 assert.match(svg,/Other Stories/);
});
test('adaptive layout handles 60 long tracks without crashing',()=>{
 const tracks=Array.from({length:60},(_,i)=>`Movement ${i+1} In C Minor - Allegro Maestoso`);
 const svg=createPosterSVG({...state,tracks});
 assert.match(svg,/>Movement 60 In C Minor/);
});
test('typography font families, artwork fit, and column options render accurately',()=>{
 const serifSvg=createPosterSVG({...state,fontFamily:'serif',artFit:'slice',columns:'3'});
 assert.match(serifSvg,/font-family="Georgia/);
 assert.match(serifSvg,/preserveAspectRatio="xMidYMid slice"/);
 const monoSvg=createPosterSVG({...state,fontFamily:'mono',columns:'1'});
 assert.match(monoSvg,/font-family=""SF Mono"/);
 const squareSvg=createPosterSVG({...state,size:'12x12'});
 assert.match(squareSvg,/width="12in" height="12in" viewBox="0 0 1080 1080"/);
});
test('poster background gradient options render valid SVG defs and fill',()=>{
 const linearSvg=createPosterSVG({...state,bgGradient:'linear-v',background:'#111111',background2:'#333333'});
 assert.match(linearSvg,/<linearGradient id="posterBg" x1="0%" y1="0%" x2="0%" y2="100%">/);
 assert.match(linearSvg,/fill="url\(#posterBg\)"/);
 const radialSvg=createPosterSVG({...state,bgGradient:'radial',background:'#111111',background2:'#555555'});
 assert.match(radialSvg,/<radialGradient id="posterBg" cx="50%" cy="32%"/);
 assert.match(radialSvg,/fill="url\(#posterBg\)"/);
 const paletteSvg=createPosterSVG({...state,bgGradient:'palette',palette:['#111111','#222222','#333333','#444444','#555555']});
 assert.match(paletteSvg,/<linearGradient id="posterBg" x1="0%" y1="0%" x2="100%" y2="100%">/);
 assert.match(paletteSvg,/fill="url\(#posterBg\)"/);
});

