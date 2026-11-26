import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { requestEvents } from '../lib/analytics.mjs';
import { pricedSession } from '../lib/native-host.mjs';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../lib/native-fonts.js', import.meta.url), 'utf8'), context);
const { catalog, localizedNames } = context.__agyFontTools;

function makeNames(records) {
  const strings = records.map(([, , value]) => Buffer.from(value,'utf16le').swap16());
  const data = Buffer.alloc(6 + 12*records.length);
  data.writeUInt16BE(records.length,2);
  data.writeUInt16BE(data.length,4);
  let offset = 0;
  records.forEach(([lang,id],i) => {
    [3,1,lang,id,strings[i].length,offset].forEach((v,j) => data.writeUInt16BE(v,6+12*i+2*j));
    offset += strings[i].length;
  });
  return Buffer.concat([data,...strings]);
}

function fontFixture(collection) {
  const table = makeNames([[0x804,1,'旧族名'],[0x804,16,'示例字体'],[0x404,1,'範例字體'],[0xc04,1,'香港字體'],[0x409,6,'Example-Regular']]);
  const first = collection ? 20 : 0;
  const dummy = makeNames([[0x804,16,'另一字体'],[0x409,6,'Other']]);
  const header = Buffer.alloc(first + (collection ? 56 : 28));
  function directory(at, offset, length) {
    header.writeUInt32BE(0x10000,at);
    header.writeUInt16BE(1,at+4);
    header.write('name',at+12);
    header.writeUInt32BE(offset,at+20);
    header.writeUInt32BE(length,at+24);
  }
  if (collection) {
    header.write('ttcf'); header.writeUInt32BE(2,8); header.writeUInt32BE(first,12); header.writeUInt32BE(first+28,16);
    directory(first,header.length,dummy.length);
  }
  directory(first+(collection?28:0),header.length+(collection?dummy.length:0),table.length);
  return new Blob([header,collection?dummy:'',table,Buffer.alloc(65536)]);
}

test('OpenType family localization reads bounded slices, selects the TTC face and prefers name ID 16', async () => {
  for (const collection of [false,true]) {
    const blob = fontFixture(collection), reads = [];
    const result = await localizedNames({family:'Example', postscriptName:'Example-Regular', blob:async()=>({size:blob.size,slice(a,b){reads.push(b-a);return blob.slice(a,b);}})});
    assert.deepEqual({...result},{cn:'示例字体',tw:'範例字體',hk:'香港字體'});
    assert.ok(reads.reduce((a,b)=>a+b,0)<1024);
  }
  await assert.rejects(localizedNames({blob:async()=>new Blob(['invalid'])}), /bounds/);
});

test('catalog keeps the canonical family and combines installed style weights', () => {
  const faces = ['Light','Regular','Medium Italic','SemiBold','Bold','Thin','ExtraBold'].map(style=>({family:'Microsoft YaHei',style}));
  const [entry] = catalog(faces,()=>true);
  assert.equal(entry.family,'Microsoft YaHei');
  assert.equal(entry.cn,'微软雅黑');
  assert.equal(entry.tw,'微軟雅黑');
  assert.deepEqual([...entry.weights],[300,400,500,600,700,100,800]);
});

test('prices request events at both turn boundaries and distinguishes a priced zero from unavailable rates', () => {
  const generation = (stepIndices, inputTokens, modelName='Gemini 4 Neon') => ({stepIndices,inputTokens,modelName,cacheReadTokens:0,outputTokens:0});
  const requests = requestEvents({times:new Map(),generations:[generation([7],0),generation([4,2],1e6),generation([4],1e6),generation([5],1e6),generation([],1e6),generation([10],1e6,'Unknown')]},'fixture');
  const parsed = {requests,turns:[[2,4],[6,7],[8,9],[10,10]].map(([stepIndexStart,stepIndexEnd])=>({stepIndexStart,stepIndexEnd}))};
  const rate = {model:'gemini-4-neon',input:1,output:1,cache:1,until:'2100-01-01',next:{input:3,output:1,cache:1}};
  for (const [pricingMode, expected] of [['standard',6],['promo',2]]) {
    const result = pricedSession(parsed,[rate],{pricingMode});
    assert.deepEqual(result.turns.map(t=>t.costUsd),[expected,0,null,null]);
    assert.equal(result.costUsd,2*expected);
  }
});
