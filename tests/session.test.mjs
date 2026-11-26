import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { parseSessionData, exportTranscript, resolveConversationId } from '../sidecars/inspector/main.mjs';
import { decodeGeneration } from '../lib/database.mjs';
import { fields } from '../lib/protobuf.mjs';
import { isHubTarget, findIdentifier } from '../lib/native-host.mjs';

const varint = value => { const a=[]; let n=BigInt(value); do { let b=Number(n&127n); n>>=7n; if(n)b|=128; a.push(b); } while(n); return Buffer.from(a); };
const integer = (n,value) => Buffer.concat([varint(n*8),varint(value)]);
const bytes = (n,value) => { const b=Buffer.from(value); return Buffer.concat([varint(n*8+2),varint(b.length),b]); };
const concat = (...parts) => Buffer.concat(parts);
const duration = seconds => concat(integer(1,seconds));
const timestamp = seconds => concat(integer(1,seconds));
const context = concat(integer(1,48000),integer(4,200000),bytes(3,bytes(1,concat(bytes(1,'System Prompt'),integer(4,6000)))));
const generation = bytes(1,concat(bytes(4,concat(integer(2,500),integer(3,100),integer(5,1500))),bytes(9,bytes(10,context)),bytes(11,duration(2)),bytes(12,duration(5)),bytes(19,'fixture-model')));

test('reads provider timings and actual context capacity from protobuf',()=>{
  const g=decodeGeneration(generation);
  assert.equal(g.providerInputTokens,2000);assert.equal(g.context.maxTokens,200000);assert.equal(g.context.usedTokens,48000);
  assert.equal(g.ttftMs,2000);assert.equal(g.streamingMs,5000);assert.equal(g.outputTokens,100);
  assert.equal(g.context.categories[0].tokens,6000);
  assert.throws(()=>fields(Buffer.from([10,8,1])),/Truncated/);
});

test('real database metrics, complete branch boundary, invalid IDs and transcript fallback',()=>{
  const root=mkdtempSync(join(tmpdir(),'agy-test-'));const previous=process.env.ANTIGRAVITY_APP_DATA_DIR;
  process.env.ANTIGRAVITY_APP_DATA_DIR=root;
  try{
    const logs=join(root,'brain','fixture','.system_generated','logs');mkdirSync(logs,{recursive:true});mkdirSync(join(root,'conversations'));
    const longResponse='assistant-'.repeat(100)+'RESPONSE_END';const longOutput='result-'.repeat(300)+'OUTPUT_END';
    const steps=[
      {step_index:0,type:'USER_INPUT',created_at:'2025-01-01T00:00:00Z',content:'<USER_REQUEST>first</USER_REQUEST>'},
      {step_index:1,type:'PLANNER_RESPONSE',created_at:'2025-01-01T00:00:01Z',input_tokens:500,cache_read_tokens:1500,output_tokens:100,content:longResponse,tool_calls:[{name:'run_command',args:{CommandLine:'echo fixture'}}]},
      {step_index:2,type:'GENERIC',created_at:'2025-01-01T00:00:08Z',content:longOutput},
      {step_index:3,type:'USER_INPUT',created_at:'2025-01-01T00:00:10Z',content:'second secret request'},
      {step_index:4,type:'PLANNER_RESPONSE',created_at:'2025-01-01T00:00:11Z',content:'second reply'}
    ];
    writeFileSync(join(logs,'transcript.jsonl'),steps.map(s=>JSON.stringify(s)).join('\n')+'\n{"partial":');
    const dbPath=join(root,'conversations','fixture.db');const db=new DatabaseSync(dbPath);
    db.exec('CREATE TABLE gen_metadata(idx INTEGER PRIMARY KEY,data BLOB); CREATE TABLE steps(idx INTEGER PRIMARY KEY,metadata BLOB);');
    db.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(0,generation);
    db.prepare('INSERT INTO steps VALUES (?,?)').run(1,concat(bytes(1,timestamp(1735689601)),bytes(6,timestamp(1735689603)),bytes(7,timestamp(1735689608)),bytes(8,timestamp(1735689608))));db.close();
    const before=readFileSync(dbPath);const state=parseSessionData('fixture',{includeSessions:false});
    assert.equal(state.telemetry.tps,20);assert.equal(state.telemetry.avgTtftMs,2000);assert.equal(state.telemetry.cacheHitPercent,75);
    assert.equal(state.contextWindow.maxTokens,200000);assert.equal(state.contextWindow.usedPercent,1);
    assert.equal(state.turns[0].durationMs,8000);assert.deepEqual(readFileSync(dbPath),before);
    const branch=exportTranscript('fixture',1);
    assert.ok(branch.markdownTranscript.includes(longResponse));assert.ok(branch.markdownTranscript.includes(longOutput));
    assert.ok(!branch.markdownTranscript.includes('second secret request'));
    assert.deepEqual(readFileSync(branch.rawSnapshotPath,'utf8').trim().split('\n').map(JSON.parse),steps.slice(0,3));
    assert.throws(()=>exportTranscript('fixture',3),/轮次/);assert.throws(()=>exportTranscript('../fixture',1),/源会话/);
    assert.equal(resolveConversationId('../fixture'),'');assert.equal(parseSessionData('missing').turns.length,0);
    assert.equal(parseSessionData('',{strict:true}).conversationId,'');
    const fallbackLogs=join(root,'brain','fallback','.system_generated','logs');mkdirSync(fallbackLogs,{recursive:true});writeFileSync(join(fallbackLogs,'transcript.jsonl'),steps.map(s=>JSON.stringify(s)).join('\n'));
    const fallback=parseSessionData('fallback');assert.equal(fallback.telemetry.tps,null);assert.equal(fallback.telemetry.avgTtftMs,null);assert.equal(fallback.contextWindow.maxTokens,null);
    assert.equal(fallback.turns[1].completedAtIso,null);assert.equal(fallback.turns[1].durationMs,null);
  }finally{if(previous===undefined)delete process.env.ANTIGRAVITY_APP_DATA_DIR;else process.env.ANTIGRAVITY_APP_DATA_DIR=previous;rmSync(root,{recursive:true,force:true});}
});

test('hooks stay valid and data-only, including inherited sidecar environment',()=>{
  const result=spawnSync(process.execPath,['scripts/telemetry-hook.mjs','PreInvocation'],{input:JSON.stringify({invocationNum:0}),encoding:'utf8',env:{...process.env,ANTIGRAVITY_SIDECAR_WEB_PORT:'9999'}});
  assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),{});assert.equal(result.stderr,'');
});

test('a retried request does not fail a running turn, and genuine termination remains visible',()=>{
  const root=mkdtempSync(join(tmpdir(),'agy-retry-')),previous=process.env.ANTIGRAVITY_APP_DATA_DIR;
  process.env.ANTIGRAVITY_APP_DATA_DIR=root;
  try{
    const logs=join(root,'brain','retry','.system_generated','logs');mkdirSync(logs,{recursive:true});
    const path=join(logs,'transcript.jsonl'),steps=[{step_index:0,type:'USER_INPUT',content:'Read files',created_at:'2026-11-16T00:00:00Z'},{step_index:1,type:'ERROR_MESSAGE',content:'stream interrupted'}];
    const save=()=>writeFileSync(path,steps.map(s=>JSON.stringify(s)).join('\n'));
    const options={includeSessions:false,strict:true,execution:{conversationId:'retry',turnStartStepIndex:0,status:2,terminationReason:0}};
    save();let state=parseSessionData('retry',options);assert.equal(state.progress.status,'running');assert.equal(state.turns[0].status,'running');assert.equal(state.errors.length,1);
    assert.equal(parseSessionData('retry',{...options,execution:{...options.execution,status:1,terminationReason:1}}).progress.status,'error');
    steps.push({step_index:2,type:'PLANNER_RESPONSE',content:'Reading next file',tool_calls:[{name:'read_file',args:{Path:'fixture.md'}}]},{step_index:3,type:'GENERIC',content:'file result'});save();
    assert.equal(parseSessionData('retry',{includeSessions:false}).progress.status,'running');
    assert.equal(parseSessionData('retry',options).errors.length,1);
    steps.push({step_index:4,type:'PLANNER_RESPONSE',content:'Intermediate update'});save();
    assert.equal(parseSessionData('retry',options).progress.status,'running');
    assert.equal(parseSessionData('retry',{...options,execution:{...options.execution,status:1,terminationReason:4}}).progress.status,'complete');
    assert.equal(parseSessionData('retry',{...options,execution:{...options.execution,status:1,terminationReason:2}}).progress.status,'stopped');
    assert.equal(parseSessionData('retry',{...options,execution:{...options.execution,status:2,turnStartStepIndex:99}}).progress.status,'complete');
  }finally{if(previous===undefined)delete process.env.ANTIGRAVITY_APP_DATA_DIR;else process.env.ANTIGRAVITY_APP_DATA_DIR=previous;rmSync(root,{recursive:true,force:true});}
});

test('native integration follows conversation titles and excludes external pages and iframes',()=>{
  assert.ok(isHubTarget({type:'page',title:'Antigravity',url:'https://127.0.0.1:1234/'}));
  assert.ok(isHubTarget({type:'page',title:'(3) Antigravity',url:'https://127.0.0.1:1234/powertools'}));
  assert.ok(isHubTarget({type:'page',title:'Conversation - Project - Antigravity',url:'https://127.0.0.1:1234/c/fixture'}));
  assert.ok(isHubTarget({type:'page',title:'(2) Conversation - Project - Antigravity',url:'https://127.0.0.1:1234/c/fixture'}));
  assert.ok(isHubTarget({type:'page',title:'Antigravity (SSH: prod-box)',url:'https://127.0.0.1:1234/'}));
  assert.ok(isHubTarget({type:'page',title:'Conversation - Project - Antigravity (SSH: prod-box)',url:'https://127.0.0.1:1234/c/fixture'}));
  assert.ok(isHubTarget({type:'page',title:'Conversation - Project - Antigravity [SSH: prod-box]',url:'https://127.0.0.1:1234/c/fixture'}));
  assert.ok(!isHubTarget({type:'page',title:'Antigravity Docs',url:'https://127.0.0.1:1234/'}));
  assert.ok(!isHubTarget({type:'page',title:'Antigravity',url:'https://example.com/'}));
  assert.ok(!isHubTarget({type:'iframe',title:'Antigravity',url:'https://127.0.0.1:1234/'}));
  assert.equal(findIdentifier({events:[{response:{conversationId:'new-id'}}]}),'new-id');
  assert.equal(findIdentifier({events:[{metadata:{projectId:'source-project'}}]},['projectId']),'source-project');
});

test('parseSessionData aggregates per-turn model, cache hit rate, tokens, and speed', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-turn-meta-'));
  const previous = process.env.ANTIGRAVITY_APP_DATA_DIR;
  process.env.ANTIGRAVITY_APP_DATA_DIR = root;
  try {
    const logs = join(root, 'brain', 'turnmeta', '.system_generated', 'logs');
    mkdirSync(logs, { recursive: true });
    mkdirSync(join(root, 'conversations'), { recursive: true });
    const steps = [
      { step_index: 0, type: 'USER_INPUT', created_at: '2025-01-01T00:00:00Z', content: 'turn one' },
      { step_index: 1, type: 'PLANNER_RESPONSE', created_at: '2025-01-01T00:00:01Z', content: 'reply one' },
      { step_index: 2, type: 'USER_INPUT', created_at: '2025-01-01T00:00:10Z', content: 'turn two' },
      { step_index: 3, type: 'PLANNER_RESPONSE', created_at: '2025-01-01T00:00:11Z', content: '', tool_calls: [{ name: 'run_command', args: { CommandLine: 'ls' } }] },
      { step_index: 4, type: 'GENERIC', created_at: '2025-01-01T00:00:12Z', content: 'ok' },
      { step_index: 5, type: 'PLANNER_RESPONSE', created_at: '2025-01-01T00:00:13Z', content: 'reply two' }
    ];
    writeFileSync(join(logs, 'transcript.jsonl'), steps.map(s => JSON.stringify(s)).join('\n'));
    const mkGen = (stepIndices, modelName, inTok, cacheTok, outTok, thinkTok, ttftSec, streamSec) => concat(
      bytes(1, concat(
        bytes(4, concat(integer(2, inTok), integer(3, outTok), integer(5, cacheTok), integer(9, thinkTok))),
        bytes(11, duration(ttftSec)),
        bytes(12, duration(streamSec)),
        bytes(21, modelName)
      )),
      ...stepIndices.map(idx => integer(2, idx))
    );
    const dbPath = join(root, 'conversations', 'turnmeta.db');
    const db = new DatabaseSync(dbPath);
    db.exec('CREATE TABLE gen_metadata(idx INTEGER PRIMARY KEY,data BLOB); CREATE TABLE steps(idx INTEGER PRIMARY KEY,metadata BLOB);');
    db.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(0, mkGen([1], 'Gemini 4 Neon (High)', 200, 800, 100, 20, 1, 2));
    db.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(1, mkGen([3], 'Gemini 4 Neon (High)', 300, 700, 50, 10, 1, 1));
    db.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(2, mkGen([5], 'Gemini 4 Flash (Medium)', 500, 1500, 150, 30, 1, 3));
    db.close();

    const state = parseSessionData('turnmeta', { includeSessions: false });
    assert.equal(state.turns.length, 2);

    const t1 = state.turns[0];
    assert.equal(t1.shortModel, 'Neon');
    assert.equal(t1.modelName, 'Gemini 4 Neon (High)');
    assert.deepEqual(t1.models, ['Gemini 4 Neon (High)']);
    assert.equal(t1.newInputTokens, 200);
    assert.equal(t1.cacheReadTokens, 800);
    assert.equal(t1.totalInputTokens, 1000);
    assert.equal(t1.outputTokens, 100);
    assert.equal(t1.thinkingTokens, 20);
    assert.equal(t1.cacheHitPercent, 80);
    assert.equal(t1.requestCount, 1);
    assert.equal(t1.tps, 50);

    const t2 = state.turns[1];
    assert.equal(t2.shortModel, 'Neon → Flash');
    assert.equal(t2.modelName, 'Gemini 4 Flash (Medium)');
    assert.deepEqual(t2.models, ['Gemini 4 Neon (High)', 'Gemini 4 Flash (Medium)']);
    assert.equal(t2.newInputTokens, 800);
    assert.equal(t2.cacheReadTokens, 2200);
    assert.equal(t2.totalInputTokens, 3000);
    assert.equal(t2.outputTokens, 200);
    assert.equal(t2.thinkingTokens, 40);
    assert.equal(t2.cacheHitPercent, 73.3);
    assert.equal(t2.requestCount, 2);
    assert.equal(t2.tps, 50);
  } finally {
    if (previous === undefined) delete process.env.ANTIGRAVITY_APP_DATA_DIR;
    else process.env.ANTIGRAVITY_APP_DATA_DIR = previous;
    rmSync(root, { recursive: true, force: true });
  }
});

