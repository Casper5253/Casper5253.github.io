import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const rows=[];
for(const channel of ['msedge','chrome']){
 const browser=await chromium.launch({channel});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
  await page.route('**/*',route=>new URL(route.request().url()).origin==='http://localhost:4329'?route.continue():route.abort());
  await page.goto('http://localhost:4329/#refine');await page.waitForTimeout(1000);
  const group=page.locator('#refine .artifact-group').first();const card=group.locator('[data-stack-card].is-current');const img=card.locator('img');
  await img.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
  const rect=await img.boundingBox();const point={x:rect.x+rect.width*.5,y:rect.y+rect.height*.5};
  const before=await group.locator('[data-stack-card].is-current').getAttribute('data-title');
  const hit=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return{element:e?.outerHTML.slice(0,180),button:e?.closest('[data-stack-card]')?.getAttribute('data-title')}},point);
  await page.mouse.click(point.x,point.y);await page.waitForTimeout(250);
  const after=await group.locator('[data-stack-card].is-current').getAttribute('data-title');const dialog=await group.locator('dialog').evaluate(e=>e.open);
  rows.push({channel,width,before,point,hit,after,dialog});await page.close();
 }}finally{await browser.close()}
}
await writeFile(new URL('./evidence/p3-sol3/card-hit-area.json',import.meta.url),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
if(rows.some(row=>!row.dialog||row.after!==row.before))process.exitCode=1;
