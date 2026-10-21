import {chromium} from 'playwright-core';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('./evidence/p3-sol3/',import.meta.url);await mkdir(out,{recursive:true});
const result=[];
for(const channel of ['msedge','chrome']){
 const browser=await chromium.launch({channel});
 try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},deviceScaleFactor:width===390?3:1});
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin==='http://localhost:4329'||['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)?route.continue():route.abort()});
  for(const path of ['/','/writing/hx/','/writing/quantlab/','/writing/how-this-site-was-built/']){
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.addInitScript(()=>{window.shifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.shifts.push({value:e.value,time:e.startTime,node:e.sources.map(s=>s.node?.outerHTML?.slice(0,200))})}).observe({type:'layout-shift',buffered:true})});
   await page.goto('http://localhost:4329'+path);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
   const evidence=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,shifts:window.shifts,main:document.querySelectorAll('main').length,fontResources:performance.getEntriesByType('resource').filter(r=>r.name.includes('fonts.google')).map(r=>r.name),overflowElements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed'}).map(e=>({tag:e.tagName,cls:e.className?.baseVal??e.className,rect:e.getBoundingClientRect().toJSON(),text:e.textContent?.trim().slice(0,150)})).slice(0,15),portrait:[...document.querySelectorAll('.portrait img')].map(i=>({src:i.currentSrc,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,rendered:i.getBoundingClientRect().toJSON(),srcset:i.srcset}))}));
   result.push({channel,path,viewport:width,...evidence,errors});
   if(width===390&&path==='/writing/hx/')await page.screenshot({path:fileURLToPath(new URL(`${channel}-390-hx-article.png`,out))});
   await page.close();
  }
  await context.close();
 }
 }finally{await browser.close()}
}
await writeFile(new URL('article-layout.json',out),JSON.stringify(result,null,2));
console.log(JSON.stringify(result.map(r=>({channel:r.channel,path:r.path,width:r.width,scrollWidth:r.scrollWidth,shifts:r.shifts,fontRequests:r.fontResources.length,errors:r.errors})),null,2));
