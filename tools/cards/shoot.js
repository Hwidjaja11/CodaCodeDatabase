const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1012,height:638},deviceScaleFactor:2}); const p=await ctx.newPage();
 const people=JSON.parse(fs.readFileSync('people.json')); const boxes={};
 for(let i=0;i<people.length;i++){ const nm=people[i].name.replace(' (Alias)','');
  await p.goto('file://'+process.cwd()+`/card${i+1}.html`); await p.waitForLoadState('load');
  const f=`CodaCode-Card-${String(i+1).padStart(2,'0')}-${nm}.png`;
  await p.screenshot({path:f, omitBackground:true});
  boxes[f]=await p.evaluate(()=>{const r=document.getElementById('bars').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}); }
 fs.writeFileSync('boxes.json',JSON.stringify(boxes)); await b.close(); })();
