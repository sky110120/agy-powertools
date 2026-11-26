import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateCacheAnomalies, dateRange, modelIdentity, resolveWeeklyQuotaWindow, summarizeRequests, subscriptionIdentity, distributionModels, timestampToMs } from '../lib/dashboard.mjs';
test('calendar ranges use local midnight and a Monday week boundary',()=>{
 const now=+new Date(2026,10,13,12,30),midnight=+new Date(2026,10,13);
 assert.deepEqual(dateRange('today',now),{start:midnight,end:now});
 assert.deepEqual(dateRange('yesterday',now),{start:+new Date(2026,10,12),end:midnight});
 assert.equal(dateRange('week',now).start,+new Date(2026,10,9));
 assert.equal(dateRange('month',now).start,+new Date(2026,10,1));
 assert.deepEqual(dateRange('custom',now,{start:'2026-11-10',end:'2026-11-12'}),{start:+new Date(2026,10,10),end:midnight});
 assert.equal(dateRange('24h',now).end-dateRange('24h',now).start,86400000);
});

test('paired distribution groups share model order and preserve unknown expenses',()=>{
  assert.deepEqual(distributionModels([]),[]);
  const models=Array.from({length:7},(_,i)=>({id:'model-'+i,tokens:100-i,cost:i===5?null:i/10}));
  const entries=distributionModels(models);assert.equal(entries.length,6);assert.equal(entries[5].id,'__other__');
  assert.equal(entries.reduce((sum,m)=>sum+m.tokens,0),models.reduce((sum,m)=>sum+m.tokens,0));
  assert.equal(entries[5].cost,.6);assert.equal(distributionModels([{id:'unknown',tokens:10,cost:null}])[0].cost,null);
});
test('model effort variants aggregate with catalog entries and preserve unpriced costs',()=>{
 assert.deepEqual(modelIdentity('Gemini 4 Hydrogen (XHigh)'),{id:'gemini-4-hydrogen',effort:'xhigh'});
 assert.deepEqual(modelIdentity('claude-opus-5-5-high'),{id:'claude-opus-5-5',effort:'high'});
 assert.deepEqual(modelIdentity('Orchestrator (Neon)'),{id:'gemini-pro-orchestrator-neon',effort:''});
 assert.deepEqual(modelIdentity('Orchestrator (Carbon)'),{id:'gemini-pro-orchestrator',effort:''});
 assert.deepEqual(modelIdentity('Orchestrator (Argon)'),{id:'gemini-pro-orchestrator-argon',effort:''});
 assert.deepEqual(modelIdentity('Orchestrator Gemini 4 Neon Extra High'),{id:'gemini-pro-orchestrator-neon',effort:'xhigh'});
 assert.deepEqual(modelIdentity('Orchestrator (Claude Opus 5.5)'),{id:'orchestrator-claude-opus-5-5',effort:''});
 assert.deepEqual(modelIdentity('Orchestrator Claude Opus 5.5 (Medium)'),{id:'orchestrator-claude-opus-5-5',effort:'medium'});
 assert.deepEqual(modelIdentity('Claude Opus 5.5 (Orchestrator)'),{id:'claude-opus-5-5',effort:''});
 const summary=summarizeRequests([
 {model:'Gemini 4 Hydrogen (High)',timestampMs:1000,inputTokens:100,cacheReadTokens:20,outputTokens:100,durationMs:1000,tps:100,costUsd:.2,status:'success'},
 {model:'gemini-4-hydrogen-low',timestampMs:2000,inputTokens:100,outputTokens:300,durationMs:6000,tps:50,costUsd:.3,status:'success'},
 {model:'unknown',timestampMs:3000,inputTokens:1,status:'error',costUsd:null},
 {model:'excluded',timestampMs:4000,inputTokens:9999,costUsd:10},
 ],{start:1000,end:4000},[{modelId:'gemini-4-hydrogen-medium'},{modelId:'zero-usage'}]);
 assert.equal(summary.requests.length,3);assert.equal(summary.tokens,621);assert.equal(summary.cost,.5);
 const model=summary.models.find(m=>m.id==='gemini-4-hydrogen');assert.equal(model.requests,2);assert.equal(model.peakTps,100);assert.ok(Math.abs(model.avgTps-400000/7000)<1e-9);
 assert.equal(summary.models.find(m=>m.id==='unknown').cost,null);assert.equal(summary.models.find(m=>m.id==='zero-usage').requests,0);
 assert.equal(summary.points.reduce((sum,p)=>sum+p.requests,0),3);
 assert.equal(summarizeRequests([{model:'x',timestampMs:1,inputTokens:1}],{start:0,end:2}).cost,null);
});

test('membership style uses explicit native tier identity and never guesses Ultra multipliers',()=>{
 assert.deepEqual(subscriptionIdentity({name:'Google AI Ultra',id:'g1-ultra-tier'}),{family:'ultra',multiplier:null,style:'ultra',label:'Google AI Ultra',id:'g1-ultra-tier'});
 assert.equal(subscriptionIdentity({name:'Google AI Pro'}).family,'pro');
 assert.equal(subscriptionIdentity({name:'Google AI Ultra 5x'}).style,'ultra5');
 assert.equal(subscriptionIdentity({id:'g1-ultra-20x-tier'}).label,'Google AI Ultra 20x');
 assert.equal(subscriptionIdentity({name:'Google AI Ultra',description:'20 TB storage'}).multiplier,null);
 assert.equal(subscriptionIdentity({name:'Google AI Ultra (20x)'}).multiplier,20);assert.equal(subscriptionIdentity({}).family,'unknown');
});

test('empty custom dates do not start at the Unix epoch and reversed dates are inclusive',()=>{
 const now=+new Date(2026,10,13,12);
 assert.deepEqual(dateRange('custom',now),{start:now-86400000,end:now});
 assert.deepEqual(dateRange('custom',now,{start:'2026-11-13',end:'2026-11-10'}),{start:+new Date(2026,10,10),end:+new Date(2026,10,14)});
 assert.equal(dateRange('all',now,{oldestTimestamp:1000}).start,1000);
});

test('summarizeRequests computes overall and per-model cache hit rates and annotateCacheAnomalies avoids false positives',()=>{
  const base=1_700_000_000_000;
  const reqs=[
    // First cold request -> NOT an anomaly
    {id:'r1',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base,inputTokens:20000,cacheReadTokens:0,outputTokens:500,status:'success',costUsd:0.1},
    // Warm cached request 30s later (90% hit) -> NOT an anomaly
    {id:'r2',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+30_000,inputTokens:2000,cacheReadTokens:18000,outputTokens:400,status:'success',costUsd:0.02},
    // Sudden full cache wipeout 45s later -> CLEARED anomaly
    {id:'r3',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+75_000,inputTokens:22000,cacheReadTokens:0,outputTokens:500,status:'success',costUsd:0.12},
    // Consecutive 0% miss 20s after wipeout -> MISSED anomaly
    {id:'r3b',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+95_000,inputTokens:24000,cacheReadTokens:0,outputTokens:400,status:'success',costUsd:0.13},
    // Re-warmed cache 20s later (92% hit)
    {id:'r4',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+115_000,inputTokens:2000,cacheReadTokens:23000,outputTokens:300,status:'success',costUsd:0.02},
    // Large new file pasted (cacheRead still 22000 >= 50% of 23000) -> dilution, NOT anomaly
    {id:'r5',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+140_000,inputTokens:150000,cacheReadTokens:22000,outputTokens:300,status:'success',costUsd:0.5},
    // Warm again then cliff drop 50s later (cacheRead dropped from 150000 to 5000, hit 3.2%) -> DROPPED anomaly
    {id:'r6',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+170_000,inputTokens:5000,cacheReadTokens:150000,outputTokens:300,status:'success',costUsd:0.05},
    {id:'r7',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+220_000,inputTokens:150000,cacheReadTokens:5000,outputTokens:300,status:'success',costUsd:0.5},
    // Context compaction / rewind (155k -> 15k) 40s later -> NOT an anomaly
    {id:'r7b',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+260_000,inputTokens:15000,cacheReadTokens:0,outputTokens:200,status:'success',costUsd:0.05},
    // Non-caching model consecutive 0% misses -> NOT an anomaly (model has never returned cacheRead > 0)
    {id:'r8',conversationId:'c1',model:'Gemini 4 Hydrogen (High)',timestampMs:base+180_000,inputTokens:20000,cacheReadTokens:0,outputTokens:200,status:'success',costUsd:0.01},
    {id:'r8b',conversationId:'c1',model:'Gemini 4 Hydrogen (High)',timestampMs:base+210_000,inputTokens:22000,cacheReadTokens:0,outputTokens:200,status:'success',costUsd:0.01},
    // Same cache-capable model after > 5 min TTL expiry -> cold start NOT anomaly, but 30s follow-up 0% IS MISSED
    {id:'r9',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+260_000+400_000,inputTokens:160000,cacheReadTokens:0,outputTokens:300,status:'success',costUsd:0.5},
    {id:'r10',conversationId:'c1',model:'Gemini 4 Neon (High)',timestampMs:base+260_000+430_000,inputTokens:165000,cacheReadTokens:0,outputTokens:300,status:'success',costUsd:0.5}
  ];
  const summary=summarizeRequests(reqs,{start:base-1000,end:base+1_000_000});
  assert.equal(summary.cacheReadTokens,218000);
  assert.equal(summary.inputTokens,757000);
  assert.equal(summary.cacheHitPercent,22.4);
  const neon=summary.models.find(m=>m.id==='gemini-4-neon');
  assert.equal(neon.cacheReadTokens,218000);
  assert.equal(neon.cacheHitPercent,23.4);
  const hydrogen=summary.models.find(m=>m.id==='gemini-4-hydrogen');
  assert.equal(hydrogen.cacheHitPercent,0);

  const anomalies=annotateCacheAnomalies(reqs);
  assert.equal(anomalies.size,4);
  assert.equal(anomalies.get('r3')?.kind,'cleared');
  assert.equal(anomalies.get('r3')?.gapMs,45000);
  assert.equal(anomalies.get('r3b')?.kind,'missed');
  assert.equal(anomalies.get('r7')?.kind,'dropped');
  assert.equal(anomalies.get('r10')?.kind,'missed');
  assert.equal(anomalies.has('r1'),false);
  assert.equal(anomalies.has('r5'),false);
  assert.equal(anomalies.has('r7b'),false);
  assert.equal(anomalies.has('r8'),false);
  assert.equal(anomalies.has('r8b'),false);
  assert.equal(anomalies.has('r9'),false);
});


test('weeklyQuota resolves exact native reset windows, per-pool cycle boundaries, untouched 100% pools, and persisted sample fallbacks', () => {
  assert.equal(timestampToMs({ seconds: 1795856368n, nanos: 250000000 }), 1795856368250);
  assert.equal(timestampToMs(1795856368000), 1795856368000);
  assert.equal(timestampToMs(null), null);

  const SEVEN_DAYS_MS = 7 * 86400_000;
  const now = 1_795_283_196_000;
  const geminiResetMs = 1_795_856_368_000;
  const geminiCycleStartMs = geminiResetMs - SEVEN_DAYS_MS;
  const fetchedAtMs = now - 20_000;

  // Case 1: Live account with active Gemini weekly cycle and untouched (100% left, no resetTime) Claude/GPT weekly bucket
  const liveAccount = {
    groups: [
      {
        displayName: 'Gemini Models',
        buckets: [
          { bucketId: 'gemini-weekly', window: 'weekly', remaining: { case: 'remainingFraction', value: 0.99 }, resetTime: { seconds: BigInt(geminiResetMs / 1000), nanos: 0 } },
          { bucketId: 'gemini-5h', window: '5h', remaining: { case: 'remainingFraction', value: 0.98 }, resetTime: { seconds: BigInt((now + 7200_000) / 1000), nanos: 0 } }
        ]
      },
      {
        displayName: 'Claude and GPT models',
        buckets: [
          { bucketId: 'claude-weekly', window: 'weekly', remaining: { case: 'remainingFraction', value: 1 }, resetTime: null },
          { bucketId: 'claude-5h', window: '5h', remaining: { case: 'remainingFraction', value: 1 }, resetTime: null }
        ]
      }
    ]
  };

  const range = dateRange('weeklyQuota', now, { account: liveAccount, fetchedAtMs });
  assert.equal(range.status, 'active');
  assert.equal(range.source, 'live');
  assert.equal(range.start, geminiCycleStartMs);
  assert.equal(range.end, now);
  assert.equal(range.resetTimeMs, geminiResetMs);

  const requests = [
    // Previous Gemini cycle request (finished before geminiCycleStartMs) -> excluded
    { id: 'old-gem', model: 'Gemini 4 Carbon (High)', timestampMs: geminiCycleStartMs - 10_000, durationMs: 2_000, inputTokens: 500_000, cacheReadTokens: 0, outputTokens: 1_000, costUsd: 1.01, status: 'success' },
    // Cycle-triggering Gemini request (started 500ms before cycleStartMs, finished 800ms after) -> included
    { id: 'trigger-gem', model: 'Gemini 4 Carbon (High)', timestampMs: geminiCycleStartMs - 500, durationMs: 1_300, inputTokens: 100_000, cacheReadTokens: 0, outputTokens: 500, costUsd: 0.21, status: 'success' },
    // In-cycle Orchestrator (Gemini) & Argon (unified under Gemini when no dedicated Argon pool) -> included
    { id: 'orch-gem', model: 'Orchestrator Gemini 4 Neon Extra High', timestampMs: geminiCycleStartMs + 60_000, durationMs: 1_000, inputTokens: 50_000, cacheReadTokens: 0, outputTokens: 500, costUsd: 0.16, status: 'success' },
    { id: 'argon-gem', model: 'Gemini 4 Argon (Medium)', timestampMs: geminiCycleStartMs + 120_000, durationMs: 1_000, inputTokens: 20_000, cacheReadTokens: 0, outputTokens: 200, costUsd: 0.04, status: 'success' },
    // Historical Claude request from 2 days ago while Claude weekly bucket is 100% untouched -> excluded
    { id: 'old-claude', model: 'Claude Opus 5.5 (Medium)', timestampMs: now - 2 * 86400_000, durationMs: 2_000, inputTokens: 300_000, cacheReadTokens: 0, outputTokens: 2_000, costUsd: 1.24, status: 'success' },
    // Brand-new Claude request sent after fetchedAtMs before next quota poll -> included
    { id: 'new-claude', model: 'Claude Sonnet 5.5 (Medium)', timestampMs: fetchedAtMs + 5_000, durationMs: 1_000, inputTokens: 10_000, cacheReadTokens: 0, outputTokens: 200, costUsd: 0.03, status: 'success' }
  ];

  const summary = summarizeRequests(requests, range);
  assert.deepEqual(summary.requests.map(r => r.id), ['trigger-gem', 'orch-gem', 'argon-gem', 'new-claude']);

  // Case 2: Mid-cycle early reset boundary from quota.observe estimates refines cycleStartMs only when resetTimeMs matches
  const earlyBoundaryMs = geminiCycleStartMs + 3600_000;
  const refined = resolveWeeklyQuotaWindow({
    account: liveAccount,
    estimates: [
      { bucketId: 'gemini-weekly', cycleStartMs: earlyBoundaryMs, resetTimeMs: geminiResetMs },
      { bucketId: 'claude-weekly', cycleStartMs: now - SEVEN_DAYS_MS, resetTimeMs: null }
    ],
    fetchedAtMs,
    now
  });
  assert.equal(refined.start, earlyBoundaryMs);
  assert.equal(refined.pools.find(p => p.key === 'claude')?.state, 'unstarted');

  const mismatchedEst = resolveWeeklyQuotaWindow({
    account: liveAccount,
    estimates: [{ bucketId: 'gemini-weekly', cycleStartMs: earlyBoundaryMs, resetTimeMs: geminiResetMs - 999_000 }],
    fetchedAtMs,
    now
  });
  assert.equal(mismatchedEst.start, geminiCycleStartMs);

  // Case 3: All weekly buckets untouched (100% remaining, no active resetTime) -> unstarted, excludes prior-week usage
  const allFull = resolveWeeklyQuotaWindow({
    account: {
      groups: [
        { displayName: 'Gemini Models', buckets: [{ bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 1, resetTimeMs: null }] },
        { displayName: 'Claude and GPT models', buckets: [{ bucketId: 'claude-weekly', window: 'weekly', remainingFraction: 1, resetTimeMs: null }] }
      ]
    },
    fetchedAtMs: now,
    now
  });
  assert.equal(allFull.status, 'unstarted');
  assert.equal(summarizeRequests(requests, allFull).requests.length, 0);

  // Case 4: Persisted quotaSamples fallback while live account RPC is still in-flight
  const fromSamples = resolveWeeklyQuotaWindow({
    account: null,
    quotaSamples: [{ bucketId: 'gemini-weekly', resetTimeMs: geminiResetMs, lastAt: now - 5_000 }],
    now
  });
  assert.equal(fromSamples.status, 'active');
  assert.equal(fromSamples.source, 'samples');
  assert.equal(fromSamples.start, geminiCycleStartMs);
  assert.equal(fromSamples.resetTimeMs, geminiResetMs);

  // Case 5: Fallback when neither live account nor valid samples exist
  const fallback = resolveWeeklyQuotaWindow({ account: null, quotaSamples: [], now });
  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.start, now - SEVEN_DAYS_MS);

  // Case 6: Requests explicitly tagged to another account are excluded from current account's weekly window
  const scopedRange = resolveWeeklyQuotaWindow({ account: liveAccount, email: 'alice@example.com', fetchedAtMs, now });
  const mixedAccountReqs = [
    { id: 'alice-req', model: 'Gemini 4 Carbon (High)', timestampMs: geminiCycleStartMs + 60_000, durationMs: 1000, inputTokens: 1000, cacheReadTokens: 0, outputTokens: 100, accountEmail: 'alice@example.com', status: 'success' },
    { id: 'bob-req', model: 'Gemini 4 Carbon (High)', timestampMs: geminiCycleStartMs + 90_000, durationMs: 1000, inputTokens: 9000, cacheReadTokens: 0, outputTokens: 100, accountEmail: 'bob@example.com', status: 'success' },
    { id: 'unattr-req', model: 'Gemini 4 Carbon (High)', timestampMs: geminiCycleStartMs + 120_000, durationMs: 1000, inputTokens: 500, cacheReadTokens: 0, outputTokens: 100, accountEmail: '', status: 'success' }
  ];
  assert.deepEqual(summarizeRequests(mixedAccountReqs, scopedRange).requests.map(r => r.id), ['alice-req', 'unattr-req']);

  // Case 7: Filtering by an inactive account email MUST use that inactive account's cached groups (NOT active account's live window/estimates/samples)
  const bobResetMs = now + 2 * 86400_000;
  const bobCycleStartMs = bobResetMs - SEVEN_DAYS_MS;
  const accountsState = {
    activeId: 'a1',
    accounts: [
      { id: 'a1', email: 'alice@example.com', syncedAtMs: fetchedAtMs, groups: liveAccount.groups },
      {
        id: 'a2',
        email: 'bob@example.com',
        syncedAtMs: now - 3600_000,
        groups: [{
          displayName: 'Gemini Models',
          buckets: [{ bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.7, resetTimeMs: bobResetMs }]
        }]
      },
      { id: 'a3', email: 'charlie@example.com', syncedAtMs: null, groups: [] }
    ]
  };
  const bobRange = resolveWeeklyQuotaWindow({
    account: liveAccount,
    accounts: accountsState,
    estimates: [{ bucketId: 'gemini-weekly', cycleStartMs: geminiCycleStartMs + 7200_000, resetTimeMs: geminiResetMs }],
    quotaSamples: [{ bucketId: 'gemini-weekly', resetTimeMs: geminiResetMs, lastAt: now - 5_000 }],
    email: 'bob@example.com',
    activeEmail: 'alice@example.com',
    fetchedAtMs,
    now
  });
  assert.equal(bobRange.source, 'cached-account');
  assert.equal(bobRange.status, 'active');
  assert.equal(bobRange.resetTimeMs, bobResetMs);
  assert.equal(bobRange.start, bobCycleStartMs);

  // Inactive account with no cached groups falls back cleanly instead of borrowing active account's live window or quotaSamples
  const charlieRange = resolveWeeklyQuotaWindow({
    account: liveAccount,
    accounts: accountsState,
    quotaSamples: [{ bucketId: 'gemini-weekly', resetTimeMs: geminiResetMs, lastAt: now - 5_000 }],
    email: 'charlie@example.com',
    activeEmail: 'alice@example.com',
    fetchedAtMs,
    now
  });
  assert.equal(charlieRange.source, 'fallback');
  assert.equal(charlieRange.status, 'fallback');
  assert.equal(charlieRange.resetTimeMs, null);

  // Case 8: Disabled buckets are ignored, and untouched 100% weekly bucket with description: '' is treated as unstarted
  const placeholderUnstarted = resolveWeeklyQuotaWindow({
    account: {
      groups: [{
        displayName: 'Gemini Models',
        buckets: [
          { bucketId: 'gemini-weekly', window: 'weekly', remaining: { case: 'remainingFraction', value: 1 }, resetTime: { seconds: BigInt(Math.floor((now + SEVEN_DAYS_MS) / 1000)) }, description: '' },
          { bucketId: 'gemini-weekly-disabled', window: 'weekly', remainingFraction: 0.2, resetTimeMs: now + 86400_000, disabled: true }
        ]
      }]
    },
    fetchedAtMs: now,
    now
  });
  assert.equal(placeholderUnstarted.status, 'unstarted');
  assert.equal(placeholderUnstarted.resetTimeMs, null);
});

test('weekly quota totals use separate Gemini, third-party and Argon billing boundaries', () => {
  const day = 86400000, now = 10 * day;
  const quotaSamples = ['gemini-weekly', '3p-weekly', 'argon-weekly'].map((bucketId, i) => ({ bucketId, resetTimeMs: now + (3 + i) * day }));
  const range = resolveWeeklyQuotaWindow({ now, quotaSamples });
  const models = ['Gemini Carbon', 'Orchestrator (Claude Opus)', 'GPT', 'Gemini Argon', 'unknown'];
  const requests = models.flatMap(model => [6, 7, 8].map(d => ({ model, timestampMs: d * day })));
  assert.deepEqual(summarizeRequests(requests, range).requests.map(r => r.timestampMs / day), [6,7,8, 7,8, 7,8, 8, 6,7,8]);
  assert.equal(range.match({ model: 'GPT', timestampMs: now - 1, durationMs: 2 }), false);
});
