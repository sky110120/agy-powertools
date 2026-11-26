import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseChecklist } from '../lib/progress.mjs';
import { createPricingStore, estimateCost, parseOfficialPricing, parsePartnerPricing, resolveRate } from '../lib/pricing.mjs';
import { createQuotaTracker } from '../lib/quota.mjs';
import { requestEvents, resolveUsageDataDirs, usageDashboard } from '../lib/analytics.mjs';
test('buffered provider responses use whole-request timing while genuine streamed responses exclude TTFT',()=>{
 const events=requestEvents({generations:[
  {requestId:'same-id',stepIndices:[8],modelName:'model',inputTokens:100,cacheReadTokens:0,outputTokens:1000,thinkingTokens:800,responseTokens:200,ttftMs:9990,streamingMs:10},
  {requestId:'streamed-id',stepIndices:[9],modelName:'model',inputTokens:100,cacheReadTokens:0,outputTokens:1324,thinkingTokens:751,responseTokens:573,ttftMs:117690,streamingMs:9248}
 ],times:new Map([[8,{createdMs:1000}],[9,{createdMs:2000}]])},'source');
 assert.equal(events[0].tps,100);assert.equal(events[0].wholeTps,100);assert.equal(events[0].tpsMode,'whole');assert.equal(events[0].durationMs,10000);assert.equal(events[0].tpsDurationMs,10000);assert.equal(events[0].timestampMs,1000);assert.equal(events[0].id,'same-id');
 assert.equal(events[1].tps,143.2);assert.equal(events[1].wholeTps,10.4);assert.equal(events[1].tpsMode,'stream');assert.equal(events[1].durationMs,126938);assert.equal(events[1].tpsDurationMs,9248);
});
test('progress counts leaf tasks without counting headings twice',()=>{
 const tasks=parseChecklist('- [ ] Parent\n  - [x] First\n  - [/] Active\n- [ ] Later');
 assert.deepEqual(tasks,[{title:'First',status:'complete'},{title:'Active',status:'running'},{title:'Later',status:'pending'}]);
 assert.deepEqual(parseChecklist('No plan recorded'),[]);
});
test('official price parsing selects standard rates and applies dated prices without pricing unknown models',()=>{
 const rates=parseOfficialPricing('## Gemini 4 Argon {% id="gemini-4-argon" %}\n{% tab title="Standard" %}\n* Input price\n* Not available\n* $2.00 through November 30, 2026.\n$4.00 starting December 1, 2026.\n---\n* Output price (including thinking tokens)\n* Not available\n* $10.00\n$20.00 starting December 1, 2026.\n---\n* Context caching price\n* Not available\n* $0.10\n$0.20 starting December 1, 2026.\n---\n{% /tab %}\n{% tab title="Batch" %}\n* Input price\n* $1.00');
 assert.equal(rates.length,1);const request={model:'Gemini 4 Argon (High)',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:Date.parse('2026-11-11')};
 assert.equal(estimateCost(request,rates),12.1);assert.equal(estimateCost({...request,timestampMs:Date.parse('2026-12-02')},rates),24.2);
 assert.equal(estimateCost({...request,model:'unpriced-model'},rates),null);
 const dir=mkdtempSync(join(tmpdir(),'agy-price-'));try{
  const store=createPricingStore(dir),neon=store.get().rates.find(r=>r.model==='gemini-4-neon');
  assert.deepEqual({input:neon.input,output:neon.output,cache:neon.cache},{input:3,output:15,cache:.15});
  assert.equal(estimateCost({model:'Gemini 4 Neon (XHigh)',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:Date.parse('2026-11-19')},store.get().rates),18.15);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('quota estimates require quota consumption and local priced requests in the same reset window',()=>{
 const dir=mkdtempSync(join(tmpdir(),'agy-quota-'));try{
 const tracker=createQuotaTracker(dir),rates=[{model:'gemini-4-argon',input:2,cache:.1,output:10}];
 const groups=fraction=>[{buckets:[{bucketId:'gemini-5h',remainingFraction:fraction,resetTimeMs:100000}]}];
 assert.equal(tracker.observe(groups(1),[],rates,1000).estimates[0].estimateUsd,null);
 const requests=[2000,3000,4000].map(timestampMs=>({model:'Gemini 4 Argon',timestampMs,inputTokens:10000,cacheReadTokens:0,outputTokens:0}));
 const result=tracker.observe(groups(.98),requests,rates,5000).estimates[0];assert.ok(Math.abs(result.estimateUsd-3)<1e-9);assert.equal(result.confidence,'low');assert.ok(Math.abs(result.estimateTokens-1500000)<1e-6);assert.ok(Math.abs(result.remainingTokens-1470000)<1e-6);
 assert.equal(tracker.observe([{buckets:[{bucketId:'gemini-5h',remainingFraction:.97,resetTimeMs:200000}]}],requests,rates,6000).estimates[0].estimateUsd,null);
 for(let i=0;i<120;i++)tracker.observe([{buckets:[{bucketId:'3p-5h',remainingFraction:1,resetTimeMs:300000+i*1000},{bucketId:'3p-weekly',remainingFraction:1,resetTimeMs:900000+i*1000}]}],requests,rates,6000+i*10);
 const moreRequests=[...requests,[6100,6200,6300].map(t=>({model:'Gemini 4 Argon',timestampMs:t,durationMs:1500,inputTokens:10000,cacheReadTokens:0,outputTokens:0}))].flat();
 const kept=tracker.observe([{buckets:[{bucketId:'gemini-5h',remainingFraction:.95,resetTimeMs:200000}]}],moreRequests,rates,8000).estimates[0];
 assert.ok(Math.abs(kept.estimateUsd-1.2)<1e-9);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('quota tracker computes full-cycle 100% quota from resetTimeMs minus window duration without prior samples',()=>{
 const dir=mkdtempSync(join(tmpdir(),'agy-quota-cycle-'));try{
 const tracker=createQuotaTracker(dir),rates=[{model:'gemini-4-carbon',input:2,cache:.1,output:10}];
 const resetTimeMs=Date.parse('2026-11-18T22:30:00Z');
 const startMs=resetTimeMs-5*3600*1000;
 const requests=[
   {model:'Gemini 4 Carbon (High)',timestampMs:startMs-5000,durationMs:1000,inputTokens:900000,cacheReadTokens:0,outputTokens:0},
   {model:'Gemini 4 Carbon (High)',timestampMs:startMs-500,durationMs:1200,inputTokens:50000,cacheReadTokens:0,outputTokens:0},
   {model:'Gemini 4 Carbon (High)',timestampMs:startMs+3000,durationMs:500,inputTokens:50000,cacheReadTokens:0,outputTokens:0},
   {model:'Gemini 4 Carbon (High)',timestampMs:startMs+6000,durationMs:500,inputTokens:50000,cacheReadTokens:0,outputTokens:0}
 ];
 const est=tracker.observe([{buckets:[{bucketId:'gemini-5h',window:'5h',remainingFraction:.99,resetTimeMs}]}],requests,rates,startMs+10000).estimates[0];
 assert.ok(Math.abs(est.estimateUsd-30)<1e-9);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('request cache hit rate counts cached tokens within total input, not output',()=>{
 const events=requestEvents({generations:[{stepIndices:[],modelName:'Gemini',inputTokens:25,cacheReadTokens:75,outputTokens:1000},{stepIndices:[],modelName:'Gemini',inputTokens:0,cacheReadTokens:0,outputTokens:0}],times:new Map()},'source');
 assert.equal(events[0].cacheHitPercent,75);assert.equal(events[1].cacheHitPercent,null);
});

test('Orchestrator planner and execution requests price by underlying model and count toward Gemini quota',()=>{
 const dir=mkdtempSync(join(tmpdir(),'agy-orch-price-'));try{
  const rates=createPricingStore(dir).get().rates;
  const ts=Date.parse('2026-11-20T05:00:00Z');
  assert.equal(estimateCost({model:'Orchestrator (Neon)',role:'planner',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),18.15);
  assert.equal(estimateCost({model:'Orchestrator (Neon)',role:'execution',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),9.075);
  assert.equal(estimateCost({model:'Gemini 4 Hydrogen (High)',role:'execution',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),9.075);
  assert.equal(estimateCost({model:'Orchestrator (Carbon)',role:'planner',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),12.1);
  assert.equal(estimateCost({model:'Orchestrator (Argon)',role:'planner',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),12.1);
  assert.equal(estimateCost({model:'Orchestrator Gemini 4 Neon Extra High',role:'planner',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),18.15);
  assert.equal(estimateCost({model:'Orchestrator (Claude Opus 5.5)',role:'planner',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),24.2);
  assert.equal(estimateCost({model:'Claude Opus 5.5 (Orchestrator)',role:'planner',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),24.2);
  assert.equal(estimateCost({model:'Claude Sonnet 5.5 (Orchestrator)',role:'execution',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:ts},rates),12.1);

  const tracker=createQuotaTracker(dir);
  const resetTimeMs=ts+4*3600*1000;
  const reqs=[
   {model:'Orchestrator (Neon)',role:'planner',timestampMs:ts-2000,durationMs:500,inputTokens:100000,cacheReadTokens:0,outputTokens:0},
   {model:'Gemini 4 Hydrogen (High)',role:'execution',timestampMs:ts-1500,durationMs:500,inputTokens:200000,cacheReadTokens:0,outputTokens:0},
   {model:'Orchestrator (Neon)',role:'planner',timestampMs:ts-1000,durationMs:500,inputTokens:100000,cacheReadTokens:0,outputTokens:0},
   {model:'Orchestrator (Claude Opus 5.5)',role:'planner',timestampMs:ts-900,durationMs:500,inputTokens:100000,cacheReadTokens:0,outputTokens:0},
   {model:'Claude Opus 5.5 (Orchestrator)',role:'planner',timestampMs:ts-800,durationMs:500,inputTokens:100000,cacheReadTokens:0,outputTokens:0},
   {model:'Claude Sonnet 5.5 (Orchestrator)',role:'execution',timestampMs:ts-700,durationMs:500,inputTokens:200000,cacheReadTokens:0,outputTokens:0}
  ];
  // Gemini: 0.3 + 0.3 + 0.3 = $0.90 across 3% => $30; Claude: 0.4 + 0.4 + 0.4 = $1.20 across 3% => $40
  const res=tracker.observe([
   {buckets:[{bucketId:'gemini-5h',window:'5h',remainingFraction:.97,resetTimeMs},{bucketId:'claude-5h',window:'5h',remainingFraction:.97,resetTimeMs}]}
  ],reqs,rates,ts).estimates;
  assert.ok(Math.abs(res[0].estimateUsd-30)<1e-9);
  assert.ok(Math.abs(res[1].estimateUsd-40)<1e-9);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('parsePartnerPricing dynamically parses current and future Claude models without bleeding sections',()=>{
  const html=`
    <nav><a href="#opus">Opus 5.5</a><a href="#future">Claude Opus 6</a></nav>
    <h3 id="opus">Opus 5.5</h3>
    <table><tr><td>Input $4.00</td><td>Output $20.00</td><td>Cache Hit $0.20</td><td>5m Cache Write $5.00</td></tr></table>
    <h3>Claude Haiku 5.5</h3>
    <table><tr><td>Input $0.10</td><td>Output $0.50</td><td>Cache Hit $0.01</td><td>5m Cache Write $0.125</td></tr></table>
    <h3>Claude Opus 4.7</h3>
    <table><tr><td>Input $5.00</td><td>Output $25.00</td><td>5m Cache Write $6.25</td></tr></table>
    <h3 id="future">Claude Opus 6</h3>
    <table><tr><td>Input $6.00</td><td>Output $30.00</td><td>Cache Read $0.30</td></tr></table>
  `;
  const rates=parsePartnerPricing(html,'2026-11-21');
  assert.deepEqual(rates.map(r=>r.model),['claude-opus-5-5','claude-haiku-5-5','claude-opus-6']);
  assert.equal(rates[0].input,4);assert.equal(rates[0].output,20);assert.equal(rates[0].cache,0.2);assert.equal(rates[0].cacheWrite,5);
  assert.equal(rates[1].cacheWrite,0.125);
  assert.equal(rates[2].input,6);assert.equal(rates[2].cache,0.3);assert.equal(rates[2].cacheWrite,undefined);
});

test('pricingMode standard uses official post-promo list prices while promo respects introductory dates and isolates quota checkpoints',()=>{
  const dir=mkdtempSync(join(tmpdir(),'agy-pricing-mode-'));
  try{
    const rates=createPricingStore(dir).get().rates;
    const carbon=rates.find(r=>r.model==='gemini-4-carbon');
    assert.deepEqual(resolveRate(carbon,{pricingMode:'standard',date:'2026-11-24'}).active,{input:4,cache:0.2,output:20});
    assert.equal(resolveRate(carbon,{pricingMode:'standard',date:'2026-11-24'}).promoActive,true);
    assert.equal(resolveRate(carbon,{pricingMode:'promo',date:'2026-11-24'}).active.input,2);
    assert.equal(resolveRate(carbon,{pricingMode:'promo',date:'2026-12-01'}).promoActive,false);
    const req={model:'Gemini 4 Carbon (High)',inputTokens:1e6,cacheReadTokens:1e6,outputTokens:1e6,timestampMs:Date.parse('2026-11-24T12:00:00Z')};
    assert.equal(estimateCost(req,rates,{pricingMode:'promo'}),12.1);
    assert.equal(estimateCost(req,rates,{pricingMode:'standard'}),24.2);

    // Quota tracker isolates checkpoints by pricingMode so switching basis mid-cycle reflects the selected mode cleanly
    const tracker=createQuotaTracker(dir);
    const resetTimeMs=Date.parse('2026-11-24T17:00:00Z');
    const baseMs=resetTimeMs-4*3600*1000;
    const reqs=[0,1,2].map(i=>({model:'Gemini 4 Carbon (High)',timestampMs:baseMs+i*1000,durationMs:500,inputTokens:50000,cacheReadTokens:0,outputTokens:0}));
    const promoEst=tracker.observe([{buckets:[{bucketId:'gemini-5h',window:'5h',remainingFraction:0.99,resetTimeMs}]}],reqs,rates,baseMs+10000,'',{pricingMode:'promo'}).estimates[0];
    const stdEst=tracker.observe([{buckets:[{bucketId:'gemini-5h',window:'5h',remainingFraction:0.99,resetTimeMs}]}],reqs,rates,baseMs+15000,'',{pricingMode:'standard'}).estimates[0];
    assert.ok(Math.abs(promoEst.estimateUsd-30)<1e-9);
    assert.ok(Math.abs(stdEst.estimateUsd-60)<1e-9);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('usageDashboard merges Desktop and Antigravity CLI SQLite conversations, updates incrementally, and keeps custom dirs isolated',()=>{
  const varint=value=>{const bytes=[];let n=BigInt(value);do{let b=Number(n&127n);n>>=7n;if(n)b|=128;bytes.push(b);}while(n);return Buffer.from(bytes);};
  const integer=(n,value)=>Buffer.concat([varint(n*8),varint(value)]);
  const bytesField=(n,value)=>{const buf=Buffer.from(value);return Buffer.concat([varint(n*8+2),varint(buf.length),buf]);};
  const concat=(...parts)=>Buffer.concat(parts);
  const seedDb=(baseDir,convId,{requestId,model,inTok,cacheTok,outTok,sec,error='',retryError=''})=>{
    const convDir=join(baseDir,'conversations');
    mkdirSync(convDir,{recursive:true});
    const db=new DatabaseSync(join(convDir,`${convId}.db`));
    try{
      db.exec('CREATE TABLE IF NOT EXISTS gen_metadata(idx INTEGER PRIMARY KEY, data BLOB); CREATE TABLE IF NOT EXISTS steps(idx INTEGER PRIMARY KEY, step_type INTEGER, metadata BLOB);');
      const reqMeta=concat(bytesField(1,'request_id'),bytesField(2,requestId));
      const retryMeta=retryError?bytesField(17,bytesField(3,retryError)):Buffer.alloc(0);
      const chat=concat(
        bytesField(4,concat(integer(2,inTok),integer(3,outTok),integer(5,cacheTok))),
        bytesField(11,integer(1,1)),
        bytesField(12,integer(1,2)),
        retryMeta,
        bytesField(20,reqMeta),
        bytesField(21,model)
      );
      const gen=concat(bytesField(1,chat),integer(2,1),bytesField(4,convId),...(error?[bytesField(5,error)]:[]));
      db.prepare('INSERT OR REPLACE INTO gen_metadata(idx, data) VALUES (0, ?)').run(gen);
      const stepMeta=concat(bytesField(1,integer(1,sec)),bytesField(8,integer(1,sec+3)));
      db.prepare('INSERT OR REPLACE INTO steps(idx, step_type, metadata) VALUES (1, 2, ?)').run(stepMeta);
    }finally{db.close();}
  };

  const root=mkdtempSync(join(tmpdir(),'agy-cli-merge-'));
  try{
    const geminiDir=join(root,'.gemini');
    const appDir=join(geminiDir,'antigravity');
    const cliDir=join(geminiDir,'antigravity-cli');
    const isolatedDir=join(root,'custom-profile');

    assert.deepEqual(resolveUsageDataDirs(appDir,{env:{}}),[appDir,cliDir]);
    assert.deepEqual(resolveUsageDataDirs(appDir,{env:{},includeCli:false}),[appDir]);
    assert.deepEqual(resolveUsageDataDirs(isolatedDir,{env:{}}),[isolatedDir]);
    assert.deepEqual(resolveUsageDataDirs(isolatedDir,{env:{ANTIGRAVITY_CLI_DATA_DIR:cliDir}}),[isolatedDir,cliDir]);
    assert.deepEqual(resolveUsageDataDirs(appDir,{env:{ANTIGRAVITY_CLI_DATA_DIR:''}}),[appDir]);

    const daySec=Math.floor(new Date().setHours(10, 0, 0, 0)/1000);
    seedDb(appDir,'app-conv-1',{requestId:'req-app-1',model:'Gemini 4 Carbon (High)',inTok:1000,cacheTok:4000,outTok:200,sec:daySec});
    seedDb(cliDir,'cli-conv-1',{requestId:'req-cli-1',model:'Gemini 4 Neon (XHigh)',inTok:2000,cacheTok:8000,outTok:500,sec:daySec+60,retryError:'429 transient'});

    const merged=usageDashboard(appDir,{force:true,env:{}});
    assert.equal(merged.totalRequests,2);
    assert.deepEqual(merged.requests.map(r=>r.id),['req-cli-1','req-app-1']);
    assert.equal(merged.requests[0].conversationId,'cli-conv-1');
    assert.equal(merged.requests[1].conversationId,'app-conv-1');
    assert.equal(merged.days.length,1);
    assert.equal(merged.days[0].requests,2);
    assert.equal(merged.days[0].tokens,1000+4000+200+2000+8000+500);
    assert.equal(merged.totalErrors,1);
    assert.equal(merged.errors[0].error,'429 transient');

    // Incremental addition of a second CLI conversation with duplicate + new request IDs
    seedDb(cliDir,'cli-conv-2',{requestId:'req-cli-2',model:'Gemini 4 Argon (High)',inTok:500,cacheTok:0,outTok:100,sec:daySec+120,error:'stream aborted'});
    seedDb(cliDir,'cli-conv-dup',{requestId:'req-app-1',model:'Gemini 4 Carbon (High)',inTok:1000,cacheTok:4000,outTok:200,sec:daySec});
    const updated=usageDashboard(appDir,{force:true,env:{}});
    assert.equal(updated.totalRequests,3);
    assert.deepEqual(updated.requests.map(r=>r.id),['req-cli-2','req-cli-1','req-app-1']);
    assert.equal(updated.totalErrors,2);

    rmSync(join(cliDir, 'conversations', 'cli-conv-1.db'));
    rmSync(join(cliDir, 'conversations', 'cli-conv-2.db'));
    assert.equal(usageDashboard(isolatedDir, { env: {} }).totalRequests, 0);
    assert.equal(usageDashboard(appDir, { includeCli: false }).totalRequests, 1);
    const restored = usageDashboard(appDir, { force: true, env: {} });
    assert.deepEqual(restored.requests, updated.requests);
    assert.deepEqual(restored.errors, updated.errors);
    seedDb(cliDir, 'cli-conv-1', { requestId:'replacement', model:'Gemini', inTok:1, cacheTok:0, outTok:1, sec:daySec });
    const replacementFile = join(cliDir, 'conversations', 'cli-conv-1.db');
    utimesSync(replacementFile, daySec, daySec);
    usageDashboard(appDir, { force:true, env:{} });
    seedDb(cliDir, 'cli-conv-1', { requestId:'replacement', model:'Gemini', inTok:2, cacheTok:0, outTok:1, sec:daySec });
    utimesSync(replacementFile, daySec, daySec);
    const replaced = usageDashboard(appDir, { force:true, env:{} });
    assert.equal(replaced.requests.find(r => r.id === 'replacement').inputTokens, 2);
    assert.equal(replaced.totalRequests, 3);
    assert.equal(replaced.requests.some(r => r.id === 'req-cli-1'), false);
    assert.equal(replaced.totalErrors, 1);
    rmSync(join(cliDir, 'conversations', 'cli-conv-1.db'));
    assert.deepEqual(usageDashboard(appDir, { force:true, env:{} }).requests, replaced.requests);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('quota tracker self-heals pre-upgrade checkpoints missing CLI requests and separates dedicated Argon quota pools',()=>{
  const dir=mkdtempSync(join(tmpdir(),'agy-quota-cli-heal-'));
  try{
    const baseMs=Date.parse('2026-11-25T12:00:00Z');
    const resetTimeMs=baseMs+5*3600_000;
    const rates=createPricingStore(dir).get().rates;

    // Simulate pre-upgrade quota-samples.json where CLI spent 8% first (recorded as 0 local requests)
    // and Desktop spent 2% afterward ($1.20 across 2 requests in standard mode)
    const preUpgradeSamples=[{
      id:'alice@example.com::gemini-5h',
      resetTimeMs,
      active:true,
      lastAt:baseMs+20*60_000,
      checkpoints:[
        {atMs:baseMs+10*60_000,fraction:0.92,observedCost:0,observedTokens:0,observedRequests:0,pricingMode:'standard'},
        {atMs:baseMs+20*60_000,fraction:0.90,observedCost:1.2,observedTokens:300_000,observedRequests:2,pricingMode:'standard'}
      ]
    }];
    writeFileSync(join(dir,'quota-samples.json'),JSON.stringify(preUpgradeSamples,null,2));

    const tracker=createQuotaTracker(dir);
    // CLI spent $4.80 across 4 requests before +10m (Gemini 4 Carbon standard input=$4/1M => 300k tokens = $1.20 each)
    // Desktop spent $1.20 across 2 requests between +10m and +20m (150k tokens = $0.60 each)
    // Total combined = $6.00 across 10% delta => true 100% quota = $60.00
    const cliReqs=[1,2,3,4].map(i=>({
      id:`cli-${i}`,model:'Gemini 4 Carbon (High)',timestampMs:baseMs+i*60_000,durationMs:500,
      inputTokens:300_000,cacheReadTokens:0,outputTokens:0
    }));
    const appReqs=[1,2].map(i=>({
      id:`app-${i}`,model:'Gemini 4 Carbon (High)',timestampMs:baseMs+12*60_000+i*60_000,durationMs:500,
      inputTokens:150_000,cacheReadTokens:0,outputTokens:0
    }));
    const observed=tracker.observe(
      [{displayName:'Gemini Models',buckets:[{bucketId:'gemini-5h',window:'5h',remainingFraction:0.90,resetTimeMs}]}],
      [...cliReqs,...appReqs],
      rates,
      baseMs+25*60_000,
      'alice@example.com',
      {pricingMode:'standard'}
    );
    const est=observed.estimates[0];
    assert.equal(est.observedRequests,6);
    assert.ok(Math.abs(est.observedCostUsd-6)<1e-9,`Expected $6.00 observedCostUsd, got ${est.observedCostUsd}`);
    assert.ok(Math.abs(est.estimateUsd-60)<1e-9,`Expected $60.00 estimateUsd, got ${est.estimateUsd}`);

    const healed=JSON.parse(readFileSync(join(dir,'quota-samples.json'),'utf8'));
    const healedCps=healed.find(s=>s.id==='alice@example.com::gemini-5h').checkpoints;
    assert.equal(healedCps[0].observedRequests,4);
    assert.ok(Math.abs(healedCps[0].observedCost-4.8)<1e-9);
    assert.equal(healedCps[1].observedRequests,6);
    assert.ok(Math.abs(healedCps[1].observedCost-6)<1e-9);

    // Verify dedicated Argon pool vs Gemini pool separation when Argon group is present
    const argonReqs=[1,2,3].map(i=>({
      id:`argon-${i}`,model:'Gemini 4 Argon (High)',timestampMs:baseMs+i*60_000,durationMs:500,
      inputTokens:250_000,cacheReadTokens:0,outputTokens:0
    }));
    const poolRes=tracker.observe(
      [
        {displayName:'Gemini Models',buckets:[{bucketId:'gemini-5h',window:'5h',remainingFraction:0.90,resetTimeMs}]},
        {displayName:'Gemini 4 Argon',buckets:[{bucketId:'argon-5h',window:'5h',remainingFraction:0.95,resetTimeMs}]}
      ],
      [...cliReqs,...appReqs,...argonReqs],
      rates,
      baseMs+26*60_000,
      'alice@example.com',
      {pricingMode:'standard'}
    );
    const geminiEst=poolRes.estimates.find(e=>e.bucketId==='gemini-5h');
    const argonEst=poolRes.estimates.find(e=>e.bucketId==='argon-5h');
    assert.equal(geminiEst.observedRequests,6);
    assert.ok(Math.abs(geminiEst.estimateUsd-60)<1e-9);
    // Argon: 3 * 250k * $4/1M = $3.00 across 5% => $60.00
    assert.equal(argonEst.observedRequests,3);
    assert.ok(Math.abs(argonEst.estimateUsd-60)<1e-9);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('quota estimates retain measured progress through missing requests and token regressions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-quota-regression-'));
  try {
    const tracker = createQuotaTracker(dir);
    const rates = [{ model: 'gemini-4-carbon', input: 2, cache: 0, output: 10 }];
    const rows = [1, 2, 3].map(timestampMs => ({ timestampMs, model: 'Gemini 4 Carbon', inputTokens: 10000, cacheReadTokens: 0, outputTokens: 0 }));
    const observe = (fraction, requests, now) => tracker.observe([{ buckets: [{ bucketId: 'gemini-5h', resetTimeMs: 100000, remainingFraction: fraction }] }], requests, rates, now).estimates[0];
    const baseline = observe(.95, rows, 10);
    assert.ok(baseline.estimateUsd > 0);
    const checkpoints = () => JSON.parse(readFileSync(join(dir, 'quota-samples.json')))[0].checkpoints;
    const original = checkpoints();
    for (const scan of [[], rows.slice(1), rows.map(r => ({ ...r, inputTokens: 10 }))]) {
      const estimate = observe(.90, scan, 20);
      assert.deepEqual(checkpoints(), original);
      assert.equal(estimate.observedRequests, 3);
      assert.equal(estimate.estimateUsd, baseline.estimateUsd);
      assert.equal(estimate.estimateTokens, baseline.estimateTokens);
    }
    const recovered = observe(.90, rows.concat({ ...rows[0], timestampMs: 25 }), 30);
    assert.equal(recovered.observedRequests, 4);
    assert.equal(checkpoints().length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('usage archive expires old rows and retains the newest 20000 records per profile', () => {
  const profile = mkdtempSync(join(tmpdir(), 'agy-archive-limit-'));
  try {
    const dir = join(profile, 'plugin_data', 'agy-powertools');
    mkdirSync(dir, { recursive: true });
    const now = Date.now();
    const record = { conversationId: 'deleted', inputTokens: 1, cacheReadTokens: 0, outputTokens: 1, retryErrors: [] };
    const records = Array.from({ length: 20001 }, (_, i) => ({ ...record, id: `r${i}`, timestampMs: now - i }));
    records.push({ ...record, id: 'expired', timestampMs: now - 91 * 86400000 });
    const path = join(dir, 'usage-history-cache.json');
    writeFileSync(path, JSON.stringify(records));
    const result = usageDashboard(profile, { includeCli: false, force: true });
    assert.equal(result.totalRequests, 20000);
    assert.equal(result.requests.at(-1).id, 'r19999');
    const saved = JSON.parse(readFileSync(path));
    assert.equal(saved.length, 20000);
    writeFileSync(path, JSON.stringify([records[0], records.at(-1)]));
    assert.deepEqual(usageDashboard(profile, { includeCli: false, force: true }).requests, [records[0]]);
  } finally { rmSync(profile, { recursive: true, force: true }); }
});
