export function modelIdentity(label='') {
  const raw=String(label||'').trim();
  const effort=raw.match(/\((low|medium|high|xhigh|extra\s+high|max|minimal|thinking)\)|[-_\s](low|medium|high|xhigh|extra\s+high|max|minimal)$/i);
  const depth=(effort?.[1]||effort?.[2]||'').toLowerCase().replace(/^extra\s+high$/,'xhigh');
  const orch=raw.match(/^orchestrator(?:\s*\(([^)]+)\)|\s+(.+))?$/i);
  if(orch){
    const tail=(orch[1]||orch[2]||'').replace(/\([^)]*\)/g,'').replace(/\s+(low|medium|high|xhigh|extra\s+high|max|minimal|thinking)$/i,'').trim().toLowerCase();
    if(/claude/i.test(tail)){
      const norm=tail.replace(/\s+/g,'-').replace(/(claude-(?:opus|sonnet|haiku)-\d+)\.(\d+)/,'$1-$2');
      return {id:`orchestrator-${norm}`,effort:depth};
    }
    const g4=tail.match(/(?:gemini[\s-]*4[\s-]*)?(neon|carbon|argon|hydrogen)$/);
    const variant=g4?g4[1]:tail.replace(/\s+/g,'-');
    const id=!variant||variant==='carbon'?'gemini-pro-orchestrator':`gemini-pro-orchestrator-${variant}`;
    return {id,effort:depth};
  }
  let id=raw.toLowerCase().replace(/\([^)]*\)/g,'').trim().replace(/\s+/g,'-').replace(/-(low|medium|high|xhigh|extra-high|max|minimal)$/,'');
  id=id.replace(/(claude-(?:opus|sonnet|haiku)-\d+)\.(\d+)/,'$1-$2');
  return {id,effort:depth};
}
const DAY_DURATION_MS = 86400000;
const WEEKLY_QUOTA_DURATION_MS = 7 * DAY_DURATION_MS;
const MS_PER_SECOND = 1000;
const NS_PER_MILLISECOND = 1000000;

export function timestampToMs(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value || typeof value !== 'object') return null;
  if (value.seconds === undefined || value.seconds === null) return null;
  const seconds = Number(value.seconds);
  if (!Number.isFinite(seconds)) return null;
  const nanos = Number(value.nanos);
  return seconds * MS_PER_SECOND + (Number.isFinite(nanos) ? Math.floor(nanos / NS_PER_MILLISECOND) : 0);
}

function quotaPoolIdentity(groupName = '', bucketId = '') {
  const combined = `${groupName} ${bucketId}`;
  if (/argon/i.test(combined)) return { key: 'argon', label: 'Argon' };
  if (/claude|gpt|\b3p\b/i.test(combined)) return { key: 'claude', label: 'Claude / GPT' };
  if (/gemini/i.test(combined)) return { key: 'gemini', label: 'Gemini' };
  const clean = String(groupName || bucketId || 'quota').trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'quota';
  return { key: slug, label: clean };
}

function requestQuotaPoolKey(modelLabel = '', hasArgonPool = false) {
  const raw = String(modelLabel || '');
  if (/claude|gpt/i.test(raw)) return 'claude';
  if (hasArgonPool && /argon/i.test(raw)) return 'argon';
  if (/gemini|orchestrator/i.test(raw)) return 'gemini';
  return '';
}

export function resolveWeeklyQuotaWindow(options = {}) {
  const now = Number.isFinite(options?.now) ? options.now : Date.now();
  const normalizedEmail = typeof options?.email === 'string' ? options.email.trim().toLowerCase() : '';
  const list = Array.isArray(options?.accounts?.accounts) ? options.accounts.accounts : [];
  const activeAccountRecord = options?.accounts?.activeId
    ? list.find(a => a?.id === options.accounts.activeId) || null
    : null;
  const activeEmail = typeof options?.activeEmail === 'string' && options.activeEmail.trim()
    ? options.activeEmail.trim().toLowerCase()
    : String(activeAccountRecord?.email || '').trim().toLowerCase();
  const targetingInactiveEmail = Boolean(normalizedEmail && activeEmail && normalizedEmail !== activeEmail);
  let effectiveFetchedAtMs = !targetingInactiveEmail && Number.isFinite(options?.fetchedAtMs) ? options.fetchedAtMs : null;
  let source = 'fallback';
  let rawGroups = null;

  if (targetingInactiveEmail) {
    const matched = list.find(a => String(a?.email || '').trim().toLowerCase() === normalizedEmail) || null;
    if (Array.isArray(matched?.groups) && matched.groups.length > 0) {
      rawGroups = matched.groups;
      source = 'cached-account';
      if (Number.isFinite(matched.syncedAtMs)) effectiveFetchedAtMs = matched.syncedAtMs;
    }
  } else if (Array.isArray(options?.account?.groups) && options.account.groups.length > 0) {
    rawGroups = options.account.groups;
    source = 'live';
  } else if (list.length > 0) {
    const matched = (normalizedEmail && list.find(a => String(a?.email || '').trim().toLowerCase() === normalizedEmail))
      || activeAccountRecord
      || null;
    if (Array.isArray(matched?.groups) && matched.groups.length > 0) {
      rawGroups = matched.groups;
      source = 'cached-account';
      if (effectiveFetchedAtMs == null && Number.isFinite(matched.syncedAtMs)) effectiveFetchedAtMs = matched.syncedAtMs;
    }
  }

  if (!rawGroups && !targetingInactiveEmail && Array.isArray(options?.quotaSamples) && options.quotaSamples.length > 0) {
    const weeklySamples = options.quotaSamples.filter(
      s => s && typeof s.bucketId === 'string' && /weekly/i.test(s.bucketId) && Number.isFinite(s.resetTimeMs) && s.resetTimeMs > now
    );
    if (weeklySamples.length > 0) {
      rawGroups = weeklySamples.map(s => ({
        displayName: '',
        buckets: [{ bucketId: s.bucketId, window: 'weekly', remainingFraction: null, resetTimeMs: s.resetTimeMs }]
      }));
      source = 'samples';
    }
  }

  const estimateByBucket = new Map();
  if (!targetingInactiveEmail && Array.isArray(options?.estimates)) {
    for (const est of options.estimates) {
      if (est && typeof est.bucketId === 'string') estimateByBucket.set(est.bucketId, est);
    }
  }

  const pools = [];
  const poolMap = new Map();
  for (const group of rawGroups || []) {
    for (const bucket of Array.isArray(group?.buckets) ? group.buckets : []) {
      if (!bucket || bucket.disabled === true) continue;
      const bucketId = String(bucket?.bucketId || '');
      const isWeekly = bucket?.window === 'weekly' || /weekly/i.test(bucketId);
      if (!isWeekly) continue;
      const { key, label } = quotaPoolIdentity(group?.displayName || '', bucketId);
      const rawFraction = bucket?.remaining?.case === 'remainingFraction'
        ? bucket.remaining.value
        : bucket?.remainingFraction;
      const remainingFraction = typeof rawFraction === 'number' && Number.isFinite(rawFraction)
        ? Math.max(0, Math.min(1, rawFraction))
        : null;
      const rawResetMs = timestampToMs(bucket?.resetTime ?? bucket?.resetTimeMs);
      const resetTimeMs = (remainingFraction != null && remainingFraction >= 1 && bucket?.description === '') ? null : rawResetMs;
      let state = 'unknown';
      let startMs = now - WEEKLY_QUOTA_DURATION_MS;
      if (Number.isFinite(resetTimeMs)) {
        if (resetTimeMs > now) {
          state = 'active';
          startMs = resetTimeMs - WEEKLY_QUOTA_DURATION_MS;
          const est = bucketId ? estimateByBucket.get(bucketId) : null;
          if (
            est &&
            Number.isFinite(est.cycleStartMs) &&
            (est.resetTimeMs == null || est.resetTimeMs === resetTimeMs) &&
            est.cycleStartMs > startMs &&
            est.cycleStartMs <= now
          ) {
            startMs = est.cycleStartMs;
          }
        } else {
          state = 'expired';
          startMs = resetTimeMs;
        }
      } else if (remainingFraction != null && remainingFraction >= 1) {
        state = 'unstarted';
        startMs = Number.isFinite(effectiveFetchedAtMs) && effectiveFetchedAtMs <= now ? effectiveFetchedAtMs : now;
      }
      const pool = { key, label, bucketId, remainingFraction, resetTimeMs, startMs, state };
      if (!poolMap.has(key) || (state === 'active' && poolMap.get(key).state !== 'active')) {
        if (poolMap.has(key)) {
          const idx = pools.findIndex(p => p.key === key);
          if (idx >= 0) pools[idx] = pool;
        } else {
          pools.push(pool);
        }
        poolMap.set(key, pool);
      }
    }
  }

  const activePools = pools.filter(p => p.state === 'active');
  let status = 'fallback';
  let start = now - WEEKLY_QUOTA_DURATION_MS;
  let resetTimeMs = null;

  if (activePools.length > 0) {
    status = 'active';
    start = Math.min(...activePools.map(p => p.startMs));
    resetTimeMs = Math.min(...activePools.map(p => p.resetTimeMs));
  } else if (pools.length > 0 && pools.every(p => p.state === 'unstarted' || p.state === 'expired')) {
    status = 'unstarted';
    const candidateStarts = pools.map(p => p.startMs).filter(v => Number.isFinite(v) && v <= now);
    start = candidateStarts.length ? Math.min(...candidateStarts) : now;
  }

  const hasArgonPool = poolMap.has('argon');
  function match(request) {
    if (!request || !Number.isFinite(request.timestampMs) || request.timestampMs > now) return false;
    const reqEmail = typeof request.accountEmail === 'string' ? request.accountEmail.trim().toLowerCase() : '';
    if (normalizedEmail && reqEmail && reqEmail !== normalizedEmail) return false;
    const billedAt = request.timestampMs + (Number.isFinite(request.durationMs) && request.durationMs > 0 ? request.durationMs : 0);
    if (billedAt > now) return false;
    if (!pools.length) return billedAt >= start;
    const poolKey = requestQuotaPoolKey(request.model, hasArgonPool);
    const pool = poolKey ? poolMap.get(poolKey) : null;
    if (pool) {
      if (pool.state === 'active') return billedAt >= pool.startMs;
      if (pool.state === 'expired') return billedAt >= pool.resetTimeMs;
      if (pool.state === 'unstarted') return Number.isFinite(effectiveFetchedAtMs) && effectiveFetchedAtMs <= now ? billedAt >= effectiveFetchedAtMs : false;
      return billedAt >= start;
    }
    if (status === 'unstarted') return Number.isFinite(effectiveFetchedAtMs) && effectiveFetchedAtMs <= now ? billedAt >= effectiveFetchedAtMs : false;
    return billedAt >= start;
  }

  return { start, end: now, resetTimeMs, status, source, pools, activePools, match };
}

export function dateRange(preset,now=Date.now(),custom={}) {
  if(preset==='weeklyQuota')return resolveWeeklyQuotaWindow({...custom,now});
  const end=new Date(now),start=new Date(now);start.setHours(0,0,0,0);
  if(preset==='today')return{start:+start,end:now};
  if(preset==='24h')return{start:now-DAY_DURATION_MS,end:now};
  if(preset==='yesterday'){const until=+start;start.setDate(start.getDate()-1);return{start:+start,end:until};}
  if(preset==='week')start.setDate(start.getDate()-(start.getDay()+6)%7);
  else if(preset==='month')start.setDate(1);
  else if(preset==='30d')start.setDate(start.getDate()-29);
  else if(preset==='custom'){const a=Date.parse(custom.start+'T00:00:00'),b=new Date(custom.end+'T00:00:00');b.setDate(b.getDate()+1);if(!Number.isFinite(a)||!Number.isFinite(+b))return{start:now-DAY_DURATION_MS,end:now};if(a<+b)return{start:a,end:+b};const until=new Date(a);until.setDate(until.getDate()+1);return{start:+new Date(custom.end+'T00:00:00'),end:+until};}
  else if(preset==='all')return{start:Number.isFinite(custom.oldestTimestamp)?custom.oldestTimestamp:0,end:now};
  return{start:+start,end:+end};
}
export function summarizeRequests(requests,range,catalog=[]) {
  const selected=requests.filter(r=>Number.isFinite(r.timestampMs)&&(typeof range?.match==='function'?range.match(r):r.timestampMs>=range.start&&r.timestampMs<range.end));
  const models=new Map();
  const emptyModel=id=>({id,requests:0,success:0,errors:0,tokens:0,inputTokens:0,cacheReadTokens:0,outputTokens:0,cost:0,priced:0,output:0,duration:0,peakTps:null});
  for(const model of catalog){const {id}=modelIdentity(model.modelId||model.label);if(!models.has(id))models.set(id,emptyModel(id));}
  let tokens=0,inputTokens=0,cacheReadTokens=0,outputTokens=0,cost=0,priced=0,success=0,errors=0;
  const points=Array.from({length:32},()=>({tokens:0,requests:0,cost:0}));
  const width=Math.max(1,range.end-range.start);
  for(const r of selected){
    const {id}=modelIdentity(r.model);if(!models.has(id))models.set(id,emptyModel(id));
    const m=models.get(id),inTok=r.inputTokens||0,cacheTok=r.cacheReadTokens||0,outTok=r.outputTokens||0,count=inTok+cacheTok+outTok;
    m.requests++;m.tokens+=count;m.inputTokens+=inTok;m.cacheReadTokens+=cacheTok;m.outputTokens+=outTok;
    tokens+=count;inputTokens+=inTok;cacheReadTokens+=cacheTok;outputTokens+=outTok;
    if(r.status==='success'){success++;m.success++;}if(r.status==='error'){errors++;m.errors++;}
    if(r.costUsd!=null){cost+=r.costUsd;priced++;m.cost+=r.costUsd;m.priced++;}
    const speedDur=r.tpsDurationMs>0?r.tpsDurationMs:r.durationMs;
    if(speedDur>0&&outTok>0){m.output+=outTok;m.duration+=speedDur;m.peakTps=Math.max(m.peakTps||0,r.tps??outTok*1000/speedDur);}
    const p=points[Math.min(31,Math.max(0,Math.floor((r.timestampMs-range.start)/width*32)))];p.tokens+=count;p.requests++;p.cost+=r.costUsd||0;
  }
  const totalIn=inputTokens+cacheReadTokens;
  const cacheHitPercent=totalIn>0?Number((cacheReadTokens/totalIn*100).toFixed(1)):null;
  return{
    requests:selected,tokens,inputTokens,cacheReadTokens,outputTokens,cacheHitPercent,
    cost:priced?cost:selected.length?null:0,priced,success,errors,points,
    models:[...models.values()].map(m=>{
      const mIn=m.inputTokens+m.cacheReadTokens;
      return{...m,cacheHitPercent:mIn>0?Number((m.cacheReadTokens/mIn*100).toFixed(1)):null,cost:m.priced?m.cost:null,avgTps:m.duration?m.output*1000/m.duration:null};
    }).sort((a,b)=>b.tokens-a.tokens||a.id.localeCompare(b.id))
  };
}

export function annotateCacheAnomalies(requests=[],{maxGapMs=180000,minPrevCache=4000,minPrevHit=50,minCurInput=4000,minMissedInput=16000,minKeepRatio=0.6}={}) {
  const anomalies=new Map();
  if(!Array.isArray(requests)||!requests.length)return anomalies;
  const ordered=requests
    .filter(r=>r&&r.conversationId&&Number.isFinite(r.timestampMs)&&r.status!=='error')
    .slice()
    .sort((a,b)=>a.timestampMs-b.timestampMs||String(a.id||'').localeCompare(String(b.id||'')));
  const cachedModels=new Set();
  for(const r of ordered){if((r.cacheReadTokens||0)>0)cachedModels.add(modelIdentity(r.model).id);}
  const lastByKey=new Map();
  for(const r of ordered){
    const modelId=modelIdentity(r.model).id;
    const key=`${r.conversationId}::${modelId}`;
    const curIn=r.inputTokens||0,curCache=r.cacheReadTokens||0,curTotalIn=curIn+curCache;
    const curHit=curTotalIn>0?Number((curCache/curTotalIn*100).toFixed(1)):null;
    const prev=lastByKey.get(key);
    let anomalous=false;
    if(prev&&curHit!=null&&curTotalIn>=minCurInput&&curTotalIn>=prev.totalIn*minKeepRatio){
      const gapMs=r.timestampMs-prev.timestampMs;
      if(gapMs>=0&&gapMs<=maxGapMs){
        if(prev.cache>=minPrevCache&&prev.hit>=minPrevHit){
          if(curCache===0){
            anomalies.set(r.id,{kind:'cleared',gapMs,prevHit:prev.hit,curHit:0,prevCache:prev.cache,curCache:0,prevTotalIn:prev.totalIn});
            anomalous=true;
          }else if(prev.hit-curHit>=40&&curHit<20&&curCache<prev.cache*0.5){
            anomalies.set(r.id,{kind:'dropped',gapMs,prevHit:prev.hit,curHit,prevCache:prev.cache,curCache,prevTotalIn:prev.totalIn});
            anomalous=true;
          }
        }else if(curCache===0&&cachedModels.has(modelId)&&(prev.anomalous||prev.totalIn>=minMissedInput)){
          anomalies.set(r.id,{kind:'missed',gapMs,prevHit:prev.hit,curHit:0,prevCache:prev.cache,curCache:0,prevTotalIn:prev.totalIn});
          anomalous=true;
        }
      }
    }
    if(curTotalIn>=2000&&curHit!=null){
      lastByKey.set(key,{timestampMs:r.timestampMs,cache:curCache,hit:curHit,totalIn:curTotalIn,anomalous});
    }
  }
  return anomalies;
}

export function subscriptionIdentity(tier={}) {
  const name=tier?.name||'',id=tier?.id||'',values=[name,id,tier?.description||''].join(' ');
  const family=/ultra/i.test(values)?'ultra':/\bpro\b/i.test(values)?'pro':/plus/i.test(values)?'plus':/team|business|enterprise/i.test(values)?'team':/free|standard|default/i.test(values)?'free':'unknown';
  const multiplier=family==='ultra'?(values.match(/(?:\bultra[\s_-]*|\b)(20|5)\s*[x×](?=$|[\W_])/i)?.[1]||null):null;
  return {family,multiplier:multiplier?Number(multiplier):null,style:family==='ultra'&&multiplier?`ultra${multiplier}`:family,label:family==='ultra'&&multiplier?`Google AI Ultra ${multiplier}x`:name||'-',id};
}

export function distributionModels(models,limit=5) {
  const active=models.filter(model=>model.tokens>0||model.cost>0);
  const entries=active.slice(0,limit).map(model=>({id:model.id,tokens:model.tokens,cost:model.cost}));
  const rest=active.slice(limit),priced=rest.filter(model=>Number.isFinite(model.cost));
  if(rest.length)entries.push({id:'__other__',tokens:rest.reduce((sum,model)=>sum+model.tokens,0),cost:priced.length?priced.reduce((sum,model)=>sum+model.cost,0):null});
  return entries;
}
