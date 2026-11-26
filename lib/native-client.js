(() => {
  const version='2.16.3';
  const hookNames=globalThis.__agyNativeBindings?.names||{resolve:'sjc',segment:'Yyc',menu:'lHc'};
  if(globalThis.__agyNativeAdapter?.version===version&&globalThis.__agyNativeAdapter.active)return;
  globalThis.__agyNativeAdapter?.dispose?.();
  let disposed=false;
  const fiber = element => element?.[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
  function providers(element) {
    const result = [];
    for (let node = fiber(element); node; node = node.return) {
      if (node.tag === 10 && node.memoizedProps?.value !== undefined) result.push({ type: node.type, value: node.memoizedProps.value });
    }
    return result;
  }
  function service(source) {
    const entry = providers(source || pageSource()).find(p => typeof p.value?.forkConversation === 'function');
    if (!entry) throw new Error('Antigravity conversation service is unavailable');
    return entry.value;
  }
  function wrap(child, element) {
    return providers(element).reduce((tree, p) => B.createElement(p.type, { value: p.value }, tree), child);
  }
  const pageSource = () => document.querySelector('[aria-label="Message input"],[data-agy-original-aria-label="Message input"]') || document.querySelector('a[href="/customizations"]') || document.querySelector('#root')?.firstElementChild || document.body?.firstElementChild;
  const store = () => providers(pageSource()).map(p=>p.value?.store).find(s=>s?.getState&&s?.dispatch);
  const router = () => providers(pageSource()).map(p=>p.value).find(v=>typeof v?.navigate==='function'&&typeof v?.buildRouteTree==='function');
  const overview = () => providers(pageSource()).map(p=>p.value).find(v=>v?.cascadeId&&typeof v.togglePanel==='function'&&typeof v.setOverlayOpen==='function');
  const authService = () => providers(pageSource()).find(p=>p.value?.core?.authService)?.value?.core?.authService || null;
  function capabilities() {
    const p=providers(pageSource()),s=store()?.getState(),context=p.find(p=>p.value?.cascadeContext)?.value;
    const model=context?.cascadeContext?.state?.selectedModel;
    return {email:s?.userStatus?.email||'',name:s?.userStatus?.name||'',avatarUrl:s?.userStatus?.profilePictureUrl||'',subscription:globalThis.__agyDashboard?.subscriptionIdentity(s?.userStatus?.userTier),plan:s?.userStatus?.userTier?.name||'',planId:s?.userStatus?.userTier?.id||'',models:s?.userStatus?.cascadeModelConfigData?.clientModelConfigs?.map(m=>({label:m.label,modelId:m.modelId}))||[],model:model?.label||'',contextOptions:model?.contextWindowOptions||[],
      contextSelectionEnabled:!!p.find(p=>p.value?.getCache&&p.value?.featureNames)?.value.get('contextWindowSelector')?.enabled};
  }
  function loginSession() {
    try {
      const snap = authService()?.getLoginSessionSnapshot?.();
      if (snap && typeof snap === 'object') {
        return {
          active: Boolean(snap.active),
          authUrl: typeof snap.authUrl === 'string' ? snap.authUrl : '',
          mode: typeof snap.mode === 'string' ? snap.mode : 'none'
        };
      }
    } catch {}
    return { active: false, authUrl: '', mode: 'none' };
  }
  function onLoginSessionChange(cb) {
    if (typeof cb !== 'function') return () => {};
    try {
      const auth = authService();
      if (typeof auth?.onDidChangeLoginSession === 'function') {
        const sub = auth.onDidChangeLoginSession(snap => {
          cb({
            active: Boolean(snap?.active),
            authUrl: typeof snap?.authUrl === 'string' ? snap.authUrl : '',
            mode: typeof snap?.mode === 'string' ? snap.mode : 'none'
          });
        });
        return () => { try { sub?.dispose?.(); } catch {} };
      }
    } catch {}
    return () => {};
  }
  async function cancelAccountLogin() {
    try { await authService()?.cancelLogin?.(); return true; } catch { return false; }
  }
  async function startAccountLogin() {
    const auth=authService();
    if(!auth||typeof auth.loginWithRedirect!=='function')throw new Error('当前客户端不支持发起登录');
    await auth.loginWithRedirect({});
    await auth.refreshUserStatus?.().catch(()=>{});
    await auth.checkCurrentAuthStatus?.().catch(()=>{});
    const cap=capabilities();
    return {ok:true,email:cap.email,name:cap.name};
  }
  function executionState(conversationId) {
    if(!conversationId)return null;
    const inputs=typeof document?.querySelectorAll==='function'?[...document.querySelectorAll('[aria-label="Message input"],[data-agy-original-aria-label="Message input"]')]:[];
    let state=null;
    for(const el of inputs){
      const candidate=providers(el).find(p=>p.value?.cascadeContext)?.value?.cascadeContext?.state?.agentStateProvider?.getState?.();
      if(candidate?.conversationId===conversationId){state=candidate;break;}
    }
    if(!state){
      const fallback=providers(pageSource()).find(p=>p.value?.cascadeContext)?.value?.cascadeContext?.state?.agentStateProvider?.getState?.();
      if(fallback?.conversationId===conversationId)state=fallback;
    }
    const turnStartStepIndex=state?.turns?.at(-1)?.startStepIndex;
    if(!state||!Number.isInteger(turnStartStepIndex))return null;
    let live=null,isSystemTurn=false,userTurnStartStepIndex=null;
    try{
      const slice=state?.trajectorySlice;
      const steps=Array.isArray(slice?.stepsInSlice)?slice.stepsInSlice:null;
      if(steps&&steps.length){
        const baseIdx=Number(slice?.stepsSlice?.startIndex||0);
        const startStep=steps[turnStartStepIndex-baseIdx]||null;
        const startCase=String(startStep?.step?.case||'');
        if(startCase&&startCase!=='userInput')isSystemTurn=true;
        if(startCase==='userInput'){
          userTurnStartStepIndex=turnStartStepIndex;
        }else if(Array.isArray(state?.turns)){
          for(let i=state.turns.length-1;i>=0;i--){
            const idx=state.turns[i]?.startStepIndex;
            if(!Number.isInteger(idx))continue;
            const st=steps[idx-baseIdx];
            if(!st)break;
            if(st?.step?.case==='userInput'){userTurnStartStepIndex=idx;break;}
          }
        }
        const turnTail=steps.filter((_,idx)=>baseIdx+idx>=turnStartStepIndex);
        const last=turnTail.at(-1)||null;
        if(last){
          const waiting=turnTail.some(s=>s?.status===9);
          const lastCase=String(last?.step?.case||'');
          const lastStatus=Number(last?.status||0);
          const val=last?.step?.value||{};
          const toolCalls=Array.isArray(val.toolCalls)?val.toolCalls:[];
          const toolName=String(last?.metadata?.toolCall?.name||toolCalls.at(-1)?.name||'').trim();
          const errObj=lastCase==='errorMessage'?(val.error||val):null;
          const errorText=errObj?String(errObj.userErrorMessage||errObj.shortError||errObj.message||'').trim().slice(0,180):'';
          const gens=Array.isArray(slice?.generatorMetadatasInSlice)?slice.generatorMetadatasInSlice:[];
          const lastGen=gens.at(-1);
          const genError=lastGen?.error?String(lastGen.error).trim().slice(0,180):'';
          live={
            waiting,
            lastCase,
            lastStatus,
            hasThinking:Boolean(typeof val.thinking==='string'&&val.thinking.trim()),
            hasResponse:Boolean(typeof val.response==='string'&&val.response.trim()),
            toolCallCount:toolCalls.length,
            toolName,
            errorText,
            genError
          };
        }
      }
    }catch{}
    const summary=store()?.getState?.()?.trajectorySummaries?.summaries?.[conversationId];
    const notFullyIdle=Boolean(summary?.notFullyIdle);
    const activeSubagents=subagents(conversationId)
      .filter(s=>s.status==='running'||s.status==='stopping')
      .map(s=>({title:s.title,status:s.status}));
    return {
      conversationId,status:state.status,turnStartStepIndex,terminationReason:state.executorMetadata?.terminationReason,
      ...(isSystemTurn?{isSystemTurn:true}:{}),
      ...(Number.isInteger(userTurnStartStepIndex)&&userTurnStartStepIndex!==turnStartStepIndex?{userTurnStartStepIndex}:{}),
      ...(notFullyIdle?{notFullyIdle:true}:{}),
      ...(activeSubagents.length?{activeSubagents}:{}),
      ...(live?{live}:{})
    };
  }
  function runningConversationIds() {
    const ids = new Set();
    const isTerminalReason = reason => reason === 2 || [1, 3, 6, 11].includes(reason);
    const isActiveSummary = summary => {
      if (!summary || summary.killed) return false;
      const st = summary.status;
      if (st === 2 || st === 4) return true;
      if (st === 1 && !isTerminalReason(summary.terminationReason) && Boolean(summary.notFullyIdle)) return true;
      return false;
    };
    const isActiveExec = exec => {
      if (!exec) return false;
      if (exec.status === 2 || exec.status === 4) return true;
      if (exec.status === 1 && !isTerminalReason(exec.terminationReason) && Boolean(exec.notFullyIdle || exec.activeSubagents?.length)) return true;
      return false;
    };
    try {
      const summaries = store()?.getState?.()?.trajectorySummaries?.summaries;
      if (summaries && typeof summaries === 'object') {
        for (const [cid, summary] of Object.entries(summaries)) {
          if (isActiveSummary(summary)) ids.add(cid);
        }
      }
    } catch {}
    try {
      const activeCid = location.pathname.match(/^\/c\/([^/]+)/)?.[1] || '';
      if (activeCid) {
        const exec = executionState(activeCid);
        if (isActiveExec(exec)) ids.add(activeCid);
      }
    } catch {}
    return [...ids];
  }
  function unreadCount(activeId='',focused=true) {
    const s=store()?.getState?.();
    const summaries=s?.trajectorySummaries?.summaries;
    if(!summaries||typeof summaries!=='object')return 0;
    const localViewed=s?.conversation?.localLastViewedTimes||{};
    let count=0;
    for(const [id,summary] of Object.entries(summaries)){
      if(!summary||summary.annotations?.archived||summary.notFullyIdle)continue;
      if(summary.parentConversationId||Number(summary.nestingDepth||0)>0)continue;
      if(summary.annotations?.markedAsUnread){count++;continue;}
      if(id===activeId&&focused)continue;
      const modified=Number(summary.lastModifiedTime?.seconds||0);
      const viewed=Math.max(Number(summary.annotations?.lastUserViewTime?.seconds||0),Number(localViewed[id]||0));
      if(modified>0&&viewed>0&&modified>viewed)count++;
    }
    return count;
  }
  function extractWorkspaceUriFromSummary(summary) {
    const meta=summary?.trajectoryMetadata||summary||{};
    const ws=Array.isArray(meta.workspaces)?meta.workspaces[0]:null;
    const candidates=[
      ws?.workspaceFolderAbsoluteUri,
      ws?.gitRootAbsoluteUri,
      ws?.absoluteUri,
      meta.workspaceFolderAbsoluteUri,
      meta.cwdUri,
      meta.workingDirectoryUri,
      summary?.workspaceFolderAbsoluteUri
    ];
    for(const item of candidates){
      if(typeof item==='string'&&item.trim().startsWith('file://'))return item.trim();
    }
    return '';
  }
  function workspaceNameFromUri(uri) {
    if(!uri)return '';
    try{
      const clean=decodeURIComponent(String(uri).split('#')[0].split('?')[0]).replace(/[\\/]+$/,'');
      return clean.split(/[\\/]/).filter(Boolean).pop()||'';
    }catch{return '';}
  }
  function conversationDirectory() {
    const s=store()?.getState?.();
    const summaries=s?.trajectorySummaries?.summaries;
    if(!summaries||typeof summaries!=='object')return {projects:[],byId:{},subagentIds:[]};
    const storeProjects=s?.projects?.projects||s?.workspaces?.workspaces||{};
    const byId={},subagentIds=[];
    const projectBuckets=new Map();
    for(const [id,summary] of Object.entries(summaries)){
      if(!summary)continue;
      const meta=summary.trajectoryMetadata||{};
      const isSubagent=Boolean(summary.parentConversationId||meta.parentConversationId||Number(summary.nestingDepth||meta.nestingDepth||0)>0);
      if(isSubagent){subagentIds.push(id);continue;}
      const archived=Boolean(summary.annotations?.archived);
      const title=String(summary.annotations?.title||summary.summary||'').trim();
      const wsUri=extractWorkspaceUriFromSummary(summary);
      const projectId=String(meta.projectId||summary.projectId||'').trim();
      const rawProj=projectId?storeProjects?.[projectId]:null;
      const projectName=String(rawProj?.name||rawProj?.title||workspaceNameFromUri(wsUri)||'').trim();
      const modifiedSec=Number(summary.lastModifiedTime?.seconds||meta.createdAt?.seconds||summary.createdTime?.seconds||0);
      const updatedAtMs=modifiedSec>0?modifiedSec*1000:0;
      byId[id]={id,title,projectId,projectName,archived,updatedAtMs};
      const pKey=projectId||(projectName?`name:${projectName}`:'');
      if(pKey&&projectName){
        let bucket=projectBuckets.get(pKey);
        if(!bucket){bucket={id:pKey,projectId,label:projectName,conversationIds:[],updatedAtMs:0};projectBuckets.set(pKey,bucket);}
        bucket.conversationIds.push(id);
        if(updatedAtMs>bucket.updatedAtMs)bucket.updatedAtMs=updatedAtMs;
      }
    }
    const projects=[...projectBuckets.values()].sort((a,b)=>(b.updatedAtMs-a.updatedAtMs)||a.label.localeCompare(b.label));
    return {projects,byId,subagentIds};
  }
  function subagents(conversationId='') {
    if(!conversationId)return [];
    const summaries=store()?.getState?.()?.trajectorySummaries?.summaries;
    if(!summaries||typeof summaries!=='object')return [];
    const byId=new Map(Object.entries(summaries));
    const belongs=id=>{
      let cur=id;
      for(let depth=0;depth<8&&cur;depth++){
        const item=byId.get(cur);
        const meta=item?.trajectoryMetadata;
        const parent=meta?.parentConversationId||item?.parentConversationId||'';
        const root=meta?.rootConversationId||'';
        if(parent===conversationId||root===conversationId)return true;
        if(!parent||parent===cur)break;
        cur=parent;
      }
      return false;
    };
    const out=[];
    for(const [id,entry] of byId){
      if(!entry||id===conversationId||!belongs(id))continue;
      const meta=entry.trajectoryMetadata||{};
      const spec=meta.subagentSpec||{};
      const createdSec=Number(meta.createdAt?.seconds||entry.createdTime?.seconds||0);
      const modifiedSec=Number(entry.lastModifiedTime?.seconds||0);
      const status=entry.killed?'killed':(entry.status===2||entry.status===4)?'running':entry.status===3?'stopping':'done';
      out.push({
        id,
        parentId:meta.parentConversationId||entry.parentConversationId||'',
        depth:Number(meta.nestingDepth||entry.nestingDepth||1),
        typeName:String(spec.typeName||'').trim(),
        role:String(spec.role||'').trim(),
        title:String(spec.role||entry.summary||spec.typeName||'Subagent').trim(),
        status,
        stepCount:Number(entry.stepCount||0),
        createdAtMs:createdSec>0?createdSec*1000:null,
        lastModifiedAtMs:modifiedSec>0?modifiedSec*1000:null
      });
    }
    return out.sort((a,b)=>(a.depth-b.depth)||((a.createdAtMs||0)-(b.createdAtMs||0))||a.id.localeCompare(b.id));
  }
  function openSubagent(id='') {
    if(!id||typeof document==='undefined')return false;
    for(const node of document.querySelectorAll('[data-testid="subagent-node"][data-cascade-id]')){
      if(node.dataset?.cascadeId===id){node.click();return true;}
    }
    const r=router();
    if(r?.navigate){void r.navigate({to:`/c/${id}`});return true;}
    return false;
  }
  function composerCascadeId(element) {
    for(let n=fiber(element);n;n=n.return){
      const p=n.memoizedProps;
      const id=p?.conversationId||p?.effectiveCascadeId||p?.cascadeId||p?.value?.cascadeId||p?.value?.cascadeContext?.cascadeId||p?.value?.cascadeContext?.state?.conversationId;
      if(typeof id==='string'&&id)return id;
    }
    return '';
  }
  function fileTreeEntry(element) {
    const row=element?.closest?.('[role="treeitem"]');
    if(!row)return null;
    for(let node=fiber(row),depth=0;node&&depth<6;node=node.return,depth++){
      const entry=node.memoizedProps?.entry;
      if(entry&&typeof entry.uri==='string'&&entry.uri.startsWith('file://')){
        return {uri:entry.uri,isDirectory:entry.fileType===2};
      }
    }
    const iconEl=row.querySelector?.('[data-testid="file-tree-node-icon"]');
    if(iconEl){
      for(let node=fiber(iconEl)?.child,depth=0;node&&depth<6;node=node.child,depth++){
        const p=node.memoizedProps;
        if(p&&typeof p.uri==='string'&&p.uri.startsWith('file://')){
          return {uri:p.uri,isDirectory:Boolean(p.isDirectory)};
        }
      }
    }
    return null;
  }
  function findComposer(sourceEl) {
    const anchors=[];
    const scopedView=sourceEl?.closest?.('[data-testid="conversation-view"]');
    const scopedInput=scopedView?.querySelector?.('[data-testid="agent-input-box"],[aria-label="Message input"],[data-agy-original-aria-label="Message input"]');
    if(scopedInput)anchors.push(scopedInput);
    if(sourceEl)anchors.push(sourceEl);
    const activeEl=typeof document!=='undefined'?document.activeElement:null;
    const activeInput=activeEl?.closest?.('[data-testid="agent-input-box"]');
    if(activeInput)anchors.push(activeInput);
    const mainInput=typeof document!=='undefined'
      ?(document.querySelector('[data-testid="conversation-view"] [data-testid="agent-input-box"]')
        ||document.querySelector('[data-testid="agent-input-box"]')
        ||pageSource())
      :null;
    if(mainInput)anchors.push(mainInput);
    for(const anchor of anchors){
      const list=providers(anchor);
      const ibCtx=list.find(p=>p.value?.inputBoxRef&&typeof p.value?.getLexicalEditor==='function')?.value;
      const chatCtx=list.find(p=>p.value?.inputBoxRef?.current)?.value;
      const box=ibCtx?.inputBoxRef?.current||chatCtx?.inputBoxRef?.current;
      const editor=box?.lexicalRef?.current||ibCtx?.getLexicalEditor?.();
      if(box||editor)return {box,editor};
    }
    return null;
  }
  async function attachFileToComposer(fileInfo, sourceEl) {
    if(!fileInfo||typeof fileInfo!=='object')throw new Error('文件信息无效');
    const target=findComposer(sourceEl);
    if(!target||(!target.box&&!target.editor))throw new Error('未找到可用的会话输入框');
    const {box,editor}=target;
    if(fileInfo.mode==='media'&&typeof box?.attachFiles==='function'&&typeof File==='function'){
      let file=fileInfo.file&&typeof fileInfo.file==='object'&&typeof fileInfo.file.size==='number'?fileInfo.file:null;
      if(!file&&fileInfo.base64){
        const raw=atob(fileInfo.base64);
        const bytes=new Uint8Array(raw.length);
        for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
        file=new File([bytes],fileInfo.name||'attachment',{type:fileInfo.mimeType||'application/octet-stream'});
      }
      if(file){
        await box.attachFiles([file]);
        editor?.focus?.();
        box.getInputCardElement?.()?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
        return {ok:true,mode:'media',name:fileInfo.name||file.name||''};
      }
    }
    const uri=String(fileInfo.uri||'').trim();
    const isDir=Boolean(fileInfo.isDirectory||fileInfo.kind==='directory');
    if(editor&&uri){
      if(isDir&&typeof Gy==='function'&&typeof Shd==='function'){
        Gy(editor,Shd('directory',uri));
        editor.focus?.();
        box?.getInputCardElement?.()?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
        return {ok:true,mode:'mention',kind:'directory',name:fileInfo.name||''};
      }
      if(!isDir&&typeof MUa==='function'){
        MUa(editor,uri);
        editor.focus?.();
        box?.getInputCardElement?.()?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
        return {ok:true,mode:'mention',kind:'file',name:fileInfo.name||''};
      }
      if(typeof Gy==='function'&&typeof Shd==='function'){
        Gy(editor,Shd(isDir?'directory':'file',uri));
        editor.focus?.();
        box?.getInputCardElement?.()?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
        return {ok:true,mode:'mention',kind:isDir?'directory':'file',name:fileInfo.name||''};
      }
    }
    throw new Error('当前输入框暂不支持直接引用该文件');
  }
  let originalSend,wrappedSend,sendService,originalResolve,originalSegmentRender,stageSegmentRender,originalSidebarItems,wrappedSidebarItems;
  let contextLimit=0,stageUpdatesEnabled=false,efficientIOEnabled=false,runtimeEnabled=true,sidebarProjectLimit=0;
  let pendingEdit=null;
  const editListeners=new Set(),notifyEdit=()=>{for(const listener of editListeners)listener(pendingEdit);};
  function onEditChange(listener){editListeners.add(listener);return()=>editListeners.delete(listener);}
  const stageUpdateRule='During this task, communicate brief visible progress updates in the user-facing response alongside tool calls. Before the first substantial tool action, write one concise sentence explaining the immediate next action and its purpose. After a meaningful finding, change of direction, or a few execution steps, write one or two concise sentences stating the result and next action. These are intermediate updates, not final answers: continue executing the task after each update. Do not narrate every command. Do not put updates only in private thinking, tool summaries, task artifacts, or notify_user. Use the user language. Never invent progress or expose private reasoning.';
  const efficientIORule='Reduce unnecessary model round trips while respecting the task and platform permissions. Locate relevant files and symbols with available purpose-built search tools first; otherwise prefer rg when available, respect ignore rules, and use commands appropriate to the operating system. Batch already-known, independent searches and file reads in the same tool round when supported. Keep dependent operations sequential and honor any user-requested sequence. Read sufficient surrounding code once; read small relevant files whole and bounded regions of large files. Reuse unchanged information. Prefer focused edits that preserve unrelated work. Run the checks appropriate to the change and avoid redundant checks after they pass. Report meaningful milestones rather than narrating every command. Lead the final response with the result; keep detail proportional to the task and honor explicit requests for detailed explanations. Do not assume any fixed command allowlist or promised performance gain.';
  function configureRequest(base) {
    const config=tc(I.CascadeConfigSchema,base);
    if(contextLimit>0)config.checkpointConfig=Wb(I.CheckpointConfigSchema,{...config.checkpointConfig,maxTokenLimit:contextLimit,tokenThreshold:contextLimit});
    if(stageUpdatesEnabled){
      config.plannerConfig ||= Wb(I.CascadePlannerConfigSchema,{});
      config.plannerConfig.noToolExplanation=false;
      config.plannerConfig.noToolSummary=false;
    }
    if(stageUpdatesEnabled||efficientIOEnabled){
      config.plannerConfig ||= Wb(I.CascadePlannerConfigSchema,{});
      const prompts=config.plannerConfig.promptSectionCustomizationConfig||Wb(I.PromptSectionCustomizationConfigSchema,{});
      const names=['powertools_stage_updates','powertools_efficient_io'];
      prompts.appendPromptSections=[...(prompts.appendPromptSections||[]).filter(p=>!names.includes(p.title)),
        ...(stageUpdatesEnabled?[Wb(I.PromptSectionSchema,{title:names[0],content:stageUpdateRule})]:[]),
        ...(efficientIOEnabled?[Wb(I.PromptSectionSchema,{title:names[1],content:efficientIORule})]:[])];
      config.plannerConfig.promptSectionCustomizationConfig=prompts;
    }
    return config;
  }
  function installRequestOverrides(source){
    if (!sendService) { sendService=service(source); originalSend=sendService.sendUserCascadeMessage; }
    const hasConfigOverride=contextLimit>0||stageUpdatesEnabled||efficientIOEnabled;
    if(typeof globalThis[hookNames.resolve]==='function'){
      originalResolve ||= globalThis[hookNames.resolve];
      globalThis[hookNames.resolve]=runtimeEnabled&&hasConfigOverride?function(...args){return configureRequest(originalResolve(...args));}:originalResolve;
    }
    if(originalSend){
      wrappedSend ||= async function(payload,...args){
        const edit=runtimeEnabled&&pendingEdit&&payload?.cascadeId===pendingEdit.cascadeId?pendingEdit:null;
        const activeConfigOverride=runtimeEnabled&&(contextLimit>0||stageUpdatesEnabled||efficientIOEnabled);
        if(edit){
          pendingEdit=null;suspendedEdits.delete(edit.cascadeId);restoreComposerHome(edit);installRequestOverrides();notifyEdit();
          const optimisticRevert=edit.optimistic?.applyOptimisticRevert?.(edit.cascadeId,edit.stepIndex-1);
          try{
            await (sendService||service()).cancelCascadeInvocation?.({cascadeId:edit.cascadeId}).catch(()=>{});
            await edit.stepHandler.revertToIndex(edit.cascadeId,edit.stepIndex-1,{conversationOnly:true});
            const nextPayload={
              ...payload,
              ...(payload.artifactComments?.length?{}:{artifactComments:edit.comments.artifactComments}),
              ...(payload.fileDiffComments?.length?{}:{fileDiffComments:edit.comments.fileDiffComments}),
              ...(payload.fileComments?.length?{}:{fileComments:edit.comments.fileComments}),
              cascadeConfig:activeConfigOverride?configureRequest(Wb(I.CascadeConfigSchema,payload.cascadeConfig||{})):payload.cascadeConfig
            };
            delete nextPayload.deliveryStrategy;
            return await originalSend.call(this,nextPayload,...args);
          }catch(error){
            throw error;
          }finally{optimisticRevert?.dispose?.();}
        }
        const configured=activeConfigOverride?{...payload,cascadeConfig:configureRequest(Wb(I.CascadeConfigSchema,payload.cascadeConfig||{}))}:payload;
        return originalSend.call(this,configured,...args);
      };
      sendService.sendUserCascadeMessage=runtimeEnabled?wrappedSend:originalSend;
    }
  }
  function ensureRequestHook(source){
    if(!runtimeEnabled)return;
    try{installRequestOverrides(source);}catch{}
  }
  function setContextLimit(limit) {
    if (![0,256000,500000,1000000].includes(limit)) throw new Error('不支持的上下文上限');
    contextLimit=limit;installRequestOverrides();
  }
  function setEfficientIO(enabled){efficientIOEnabled=enabled===true;installRequestOverrides();}
  function refreshSidebarList(){
    try{
      const nav=document.querySelector('[role="navigation"][aria-label="Sidebar"]');
      if(!nav)return;
      const root=fiber(nav);
      if(!root)return;
      const seen=new Set(),stack=[root];
      while(stack.length){
        const node=stack.pop();
        if(!node||seen.has(node))continue;
        seen.add(node);
        for(let h=node.memoizedState;h&&typeof h==='object';h=h.next){
          if(h.memoizedState&&typeof h.memoizedState==='object'&&'onlyShowFirstFewConvos' in h.memoizedState&&typeof h.queue?.dispatch==='function'){
            h.queue.dispatch(prev=>prev?{...prev}:{onlyShowFirstFewConvos:{}});
            return;
          }
        }
        if(node.child)stack.push(node.child);
        if(node.sibling)stack.push(node.sibling);
      }
    }catch{/* Best effort refresh. */}
  }
  function setSidebarProjectLimit(limit){
    const next=[0,1,2,3,4,5,10,-1].includes(limit)?limit:0;
    const changed=sidebarProjectLimit!==next;
    sidebarProjectLimit=next;
    const name=hookNames.sidebarItems;
    if(name&&typeof globalThis[name]==='function'){
      originalSidebarItems ||= globalThis[name];
      wrappedSidebarItems ||= function(args){
        if(!runtimeEnabled||sidebarProjectLimit===0||!args||args.groupBy==='none'||!Array.isArray(args.groups))return originalSidebarItems(args);
        const origFlags=args.onlyShowFirstFewConvos||{};
        const allExpanded={...origFlags};
        for(const g of args.groups)if(g?.id&&g.id!=='standalone')allExpanded[g.id]=false;
        const full=originalSidebarItems({...args,onlyShowFirstFewConvos:allExpanded});
        const totals=new Map();
        for(const g of args.groups)if(g?.id&&g.id!=='standalone')totals.set(g.id,Array.isArray(g.items)?g.items.length:0);
        if(!Array.isArray(full))return full;
        if(sidebarProjectLimit===-1)return full.filter(item=>!(item?.type==='show-more'&&totals.has(item.groupId)));
        const out=[],seen=new Map();
        for(let i=0;i<full.length;i++){
          const item=full[i];
          if(item?.type==='show-more'&&totals.has(item.groupId))continue;
          if(item?.type==='row'&&item.isIndented&&totals.has(item.groupId)){
            const gid=item.groupId,total=totals.get(gid),collapsed=origFlags[gid]??true;
            const idx=seen.get(gid)||0;seen.set(gid,idx+1);
            if(!collapsed||idx<sidebarProjectLimit)out.push(item);
            const nextItem=full[i+1];
            const isLastOfGroup=!nextItem||nextItem.type!=='row'||!nextItem.isIndented||nextItem.groupId!==gid;
            if(isLastOfGroup&&total>sidebarProjectLimit){
              out.push({type:'show-more',id:`show-more-${gid}`,label:collapsed?`See all (${total})`:'See less',groupId:gid,isIndented:true});
            }
            continue;
          }
          out.push(item);
        }
        return out;
      };
      globalThis[name]=runtimeEnabled&&sidebarProjectLimit!==0?wrappedSidebarItems:originalSidebarItems;
    }
    if(changed)refreshSidebarList();
  }
  function setEnabled(enabled){const prev=runtimeEnabled;runtimeEnabled=enabled!==false;if(!runtimeEnabled){cancelEdit();suspendedEdits.clear();}setStageUpdates(stageUpdatesEnabled);setSidebarProjectLimit(sidebarProjectLimit);if(prev!==runtimeEnabled)refreshSidebarList();}
  function setStageUpdates(enabled){
    stageUpdatesEnabled=enabled===true;installRequestOverrides();
    if(typeof globalThis[hookNames.segment]==='function'){
      originalSegmentRender ||= globalThis[hookNames.segment];
      stageSegmentRender ||= function(...args){
        const result=originalSegmentRender(...args);
        if(!runtimeEnabled||!stageUpdatesEnabled||result?.body?.type!=='collapsible')return result;
        const groups=result.body.content?.groups||[];
        const isUpdate=g=>g.type==='step'&&g.step?.step?.case==='plannerResponse'&&g.step.step.value?.response?.trim();
        const leading=result.leadingSteps||[],updates=leading.filter(isUpdate);
        if(!updates.length&&!groups.some(isUpdate))return result;
        // While running, retain native text/tool order without the outer fold.
        // On completion, move the leading updates into that fold as well.
        // The native tail contains the final answer and stays outside it.
        const active=result.body.isActive||args[0]?.isRunning&&args[0]?.isLastTurn&&args[0]?.segment?.isLatest;
        if(active)return{...result,body:{type:'inline',content:result.body.content}};
        return{...result,leadingSteps:leading.filter(g=>!isUpdate(g)),body:{...result.body,
          defaultExpanded:false,isActive:false,triggerVisible:true,
          content:{...result.body.content,groups:[...updates,...groups]}}};
      };
      globalThis[hookNames.segment]=runtimeEnabled&&stageUpdatesEnabled?stageSegmentRender:originalSegmentRender;
    }
  }
  function installPage(component) {
    const r=router(); if (!r || typeof VD!=='function') return false;
    const existing=r.routesById?.['/manager-layout/manager-landing-layout/powertools'];
    if (existing) {
      existing.update({component});
      if(location.pathname==='/powertools')void r.navigate({to:'/customizations',replace:true}).then(()=>r.navigate({to:'/powertools',replace:true}));
      return true;
    }
    const parent=r.routesById?.['/manager-layout/manager-landing-layout'];
    if (!parent) return false;
    const pending=parent.children.find(route=>route.options.path==='/powertools');
    if(pending)pending.update({component});else parent.addChildren([...parent.children,VD({getParentRoute:()=>parent,path:'/powertools',component})]);
    r.routeTree = null;
    r.update({routeTree:r.options.routeTree});
    if(location.pathname==='/powertools')void r.load();
    return true;
  }
  function extractFinalResponseFromSteps(steps) {
    if (!Array.isArray(steps) || !steps.length) return { finalText: '', hasIntermediate: false };
    let trailing = [];
    let lastPlannerText = '';
    let hasIntermediate = false;
    let seenAnswerCount = 0;
    for (const item of steps) {
      const c = item?.step?.case;
      const v = item?.step?.value;
      if (!c || c === 'userInput' || c === 'systemMessage' || c === 'checkpoint' || c === 'ephemeralMessage') continue;
      if (c === 'plannerResponse') {
        const text = String(v?.modifiedResponse || v?.response || '').trim();
        const hasTools = Array.isArray(v?.toolCalls) && v.toolCalls.length > 0;
        if (text) {
          lastPlannerText = text;
          seenAnswerCount++;
        }
        if (hasTools) {
          hasIntermediate = true;
          trailing = [];
        } else if (text) {
          if (seenAnswerCount > 1) hasIntermediate = true;
          trailing.push(text);
        }
      } else if (c === 'notifyUser') {
        const text = String(v?.message || '').trim();
        if (text) {
          lastPlannerText = text;
          seenAnswerCount++;
          trailing.push(text);
        }
      } else {
        hasIntermediate = true;
        trailing = [];
      }
    }
    const finalText = (trailing.length ? trailing.join('\n\n') : lastPlannerText).trim();
    return { finalText, hasIntermediate };
  }
  function finalResponseText(element) {
    for (let node = fiber(element); node; node = node.return) {
      const steps = node.memoizedProps?.steps;
      if (Array.isArray(steps) && steps.length) {
        return extractFinalResponseFromSteps(steps);
      }
    }
    return { finalText: '', hasIntermediate: false };
  }
  function userMessage(element) {
    for (let node = fiber(element); node; node = node.return) {
      const props = node.memoizedProps;
      if (props?.step?.items && props.metadata && props.cascadeId) return props;
    }
    return null;
  }
  function navigateTurn(turn) {
    const source=document.querySelector('[data-testid="user-input-step"],[data-testid="agent-response"]');
    const nav=providers(source).find(p=>typeof p.value?.jumpTo==='function'&&Array.isArray(p.value.turns))?.value;
    const index=nav?.turns.findIndex(item=>item.startStepIndex===turn.stepIndexStart)??-1;
    if(index>=0){nav.jumpTo(index);return true;}
    for(const element of document.querySelectorAll('[data-testid="user-input-step"]')){
      const message=userMessage(element);
      if(message&&HU(message.metadata)===turn.stepIndexStart){element.scrollIntoView({behavior:'smooth',block:'start'});return true;}
    }
    return false;
  }
  function replaceText(items, text) {
    let inserted = false;
    const result = items.flatMap(item => {
      if (item.chunk?.case !== 'text') return [item];
      if (inserted) return [];
      inserted = true;
      return [{ ...item, chunk: { case: 'text', value: text } }];
    });
    if (!inserted) result.unshift({ chunk: { case: 'text', value: text } });
    return result;
  }
  async function editAndResend(element, text) {
    if (!text.trim()) throw new Error('请输入消息');
    const message = userMessage(element);
    const context = providers(element).find(p => typeof p.value?.sendMessage === 'function' && p.value?.stepHandler)?.value;
    if (!message || !context?.stepHandler?.revertToIndex) throw new Error('当前消息不支持编辑');
    const stepIndex = HU(message.metadata);
    const items = replaceText(message.step.items, text);
    let reverted = false;
    try {
      // This option explicitly preserves workspace files.
      await context.stepHandler.revertToIndex(message.cascadeId, stepIndex - 1, { conversationOnly: true });
      reverted = true;
      await context.sendMessage({ type: 1, cascadeId: message.cascadeId, items, media: message.step.media || [], resend: 'edit',
        commentOverrides: { artifactComments: message.step.artifactComments || [], fileDiffComments: message.step.fileDiffComments || [], fileComments: message.step.fileComments || [] } });
      return { conversationId: message.cascadeId, replacedStepIndex: stepIndex };
    } catch (error) {
      if (reverted) {
        const box = context.inputBoxRef?.current;
        const editor = box?.lexicalRef?.current;
        if (editor && typeof IJ === 'function' && typeof LN === 'function') {
          editor.setEditorState(IJ(editor, LN(items)));
          box.setMediaAttachments?.(message.step.media || []);
        }
      }
      throw error;
    }
  }
  async function forkPoint(conversationId, stepIndex) {
    if (stepIndex === -1) return -1;
    const data = await service().getCascadeTrajectory({ cascadeId: conversationId });
    const steps = data.trajectory.steps;
    const next = steps.find(step => HU(step.metadata) > stepIndex && step.step?.case === 'userInput');
    return next ? HU(next.metadata) - 1 : -1;
  }
  function nextBranchTitle(sourceTitle, existingTitles = []) {
    const base = String(sourceTitle || '').trim().replace(/\s*\(\d+\)$/, '').trim() || '分支会话';
    const taken = new Set((existingTitles || []).map(item => String(item || '').trim()).filter(Boolean));
    let index = 1;
    while (taken.has(`${base} (${index})`)) index++;
    return `${base} (${index})`;
  }
  async function renameForkedConversation(sourceId, newId, fallbackTitle = '') {
    if (!sourceId || !newId || sourceId === newId) return null;
    const svc = service();
    if (typeof svc.updateConversationAnnotations !== 'function') return null;
    const map = store()?.getState()?.trajectorySummaries?.summaries || {};
    const sourceEntry = map[sourceId];
    const domSourceTitle = typeof document !== 'undefined'
      ? document.querySelector?.(`a[href="/c/${sourceId}"],a[href^="/c/${sourceId}?"]`)?.textContent?.trim()
      : '';
    const sourceTitle = (sourceEntry?.annotations?.title || sourceEntry?.summary || domSourceTitle || fallbackTitle || '').trim();
    const summaryTitles = Object.values(map).map(entry => (entry?.annotations?.title || entry?.summary || '').trim());
    const domTitles = typeof document !== 'undefined'
      ? [...(document.querySelectorAll?.('a[href^="/c/"]') || [])].map(el => el.textContent?.trim())
      : [];
    const title = nextBranchTitle(sourceTitle, [...summaryTitles, ...domTitles]);
    const annotations = typeof YF === 'object' && YF?.ConversationAnnotationsSchema && typeof Wb === 'function'
      ? Wb(YF.ConversationAnnotationsSchema, { title })
      : { title };
    const apply = () => svc.updateConversationAnnotations([newId], annotations, true);
    try { await apply(); } catch {}
    if (typeof setTimeout === 'function') setTimeout(() => { void Promise.resolve(apply()).catch(() => {}); }, 450);
    return title;
  }
  function isSubagentForkError(error) {
    return /invoked subagents/i.test(String(error?.message || error || ''));
  }
  async function forkViaSideQuestion(conversationId, targetStepIndex = -1) {
    const svc = service();
    if (typeof svc.startCascade !== 'function' || typeof svc.forkConversation !== 'function') {
      throw new Error('Side question fork promotion is unavailable');
    }
    const sqId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const baseTrajectoryIdentifier = typeof I === 'object' && I?.BaseTrajectoryIdentifierSchema && typeof Wb === 'function'
      ? Wb(I.BaseTrajectoryIdentifierSchema, { identifier: { case: 'cascadeId', value: conversationId } })
      : { identifier: { case: 'cascadeId', value: conversationId } };
    let started = false;
    try {
      await svc.startCascade({
        cascadeId: sqId,
        trajectoryType: 22,
        source: 1,
        baseTrajectoryIdentifier
      });
      started = true;
      return await svc.forkConversation({
        sourceCascadeId: sqId,
        forkAtStepIndex: targetStepIndex,
        targetForkWorkspace: 1
      });
    } finally {
      if (started && typeof svc.deleteCascadeTrajectory === 'function') {
        try { await svc.deleteCascadeTrajectory(sqId); } catch {}
      }
    }
  }
  async function fork(conversationId, stepIndex = -1, { exact = false, autoRename = true, allowSideQuestionFallback = true } = {}) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(conversationId || '') || !Number.isInteger(stepIndex) || stepIndex < -1) throw new Error('Invalid fork point');
    if (!exact) stepIndex = await forkPoint(conversationId, stepIndex);
    const svc = service();
    let response, promotedViaSideQuestion = false;
    try {
      response = await svc.forkConversation({ sourceCascadeId: conversationId, forkAtStepIndex: stepIndex, targetForkWorkspace: 1 });
    } catch (error) {
      if (!allowSideQuestionFallback || !isSubagentForkError(error) || typeof svc.startCascade !== 'function') throw error;
      response = await forkViaSideQuestion(conversationId, stepIndex);
      promotedViaSideQuestion = true;
    }
    if (!response?.newCascadeId) throw new Error('Antigravity returned no forked conversation');
    if (autoRename) await renameForkedConversation(conversationId, response.newCascadeId);
    return { conversationId: response.newCascadeId, projectId: response.newProjectId || '', forkedAtStepIndex: response.forkedAtStepIndex, warnings: response.warnings || [], promotedViaSideQuestion };
  }
  async function hydrateMedia(media,stepHandler){
    return (await Promise.all((media||[]).map(async item=>{
      if(item?.uri&&!(item.payload?.case==='inlineData'&&item.payload.value?.length>0)){
        const url=stepHandler?.resolveArtifactUrl?.(item.uri);
        if(url&&typeof fetch==='function'){
          try{const res=await fetch(url);if(res.ok){const bytes=new Uint8Array(await res.arrayBuffer());return{...item,uri:'',payload:{case:'inlineData',value:bytes}};}}catch{}
        }
      }
      return item;
    }))).filter(Boolean);
  }
  const suspendedEdits=new Map();
  function snapshotEditorState(editor){
    const state=editor?.getEditorState?.();
    let json=null;
    try{const raw=state?.toJSON?.();if(raw&&typeof raw==='object')json=JSON.stringify(raw);}catch{}
    return{state,json};
  }
  function applyEditorSnapshot(editor,snapshot){
    if(!editor?.setEditorState||!snapshot)return;
    try{
      if(snapshot.json&&typeof IJ==='function'){editor.setEditorState(IJ(editor,snapshot.json));return;}
    }catch{}
    try{if(snapshot.state)editor.setEditorState(snapshot.state);}catch{}
  }
  function restoreComposerHome(record){
    if(!record)return;
    try{
      if(record.inputBox&&record.homeParent&&record.homeParent.isConnected!==false){
        const refNode=record.homeNext?.parentNode===record.homeParent?record.homeNext:null;
        if(record.inputBox.parentNode!==record.homeParent||record.inputBox.nextSibling!==refNode){
          record.homeParent.insertBefore(record.inputBox,refNode);
        }
      }
      record.inlineHost?.remove?.();
      record.element?.removeAttribute?.('data-agy-editing-target');
    }catch{}
  }
  function extractInlineEditText(edit) {
    try {
      const editor = edit?.editor;
      const st = editor?.getEditorState?.();
      if (st && typeof st.toJSON === 'function') {
        const json = st.toJSON();
        const collect = node => {
          if (!node || typeof node !== 'object') return '';
          if (typeof node.text === 'string') return node.text;
          if (Array.isArray(node.children)) {
            const sep = node.type === 'root' ? '\n' : '';
            return node.children.map(collect).join(sep);
          }
          return '';
        };
        const t = collect(json?.root).trim();
        if (t) return t;
      }
    } catch {}
    try {
      const ce = edit?.inlineHost?.querySelector?.('[contenteditable="true"]') || edit?.inputBox?.querySelector?.('[contenteditable="true"]');
      const t = String(ce?.innerText ?? ce?.textContent ?? '').trim();
      if (t) return t;
    } catch {}
    return '';
  }
  async function submitPendingEditDirectly(edit) {
    if (!edit || edit.submitting || pendingEdit !== edit) return false;
    const text = extractInlineEditText(edit);
    const media = [...(edit.box?.getMediaAttachments?.() || [])];
    if (!text && !media.length) return false;
    edit.submitting = true;
    pendingEdit = null;
    suspendedEdits.delete(edit.cascadeId);
    const origItems = Array.isArray(edit.messageItems) ? edit.messageItems : [];
    const nextItems = replaceText(origItems, text);
    restoreComposerHome(edit);
    applyEditorSnapshot(edit.editor, edit.savedSnapshot);
    try { edit.box?.setMediaAttachments?.(edit.savedMedia || []); } catch {}
    installRequestOverrides();
    notifyEdit();
    const optimisticRevert = edit.optimistic?.applyOptimisticRevert?.(edit.cascadeId, edit.stepIndex - 1);
    let reverted = false;
    try {
      try { await (sendService || service(edit.element)).cancelCascadeInvocation?.({ cascadeId: edit.cascadeId }); } catch {}
      await edit.stepHandler.revertToIndex(edit.cascadeId, edit.stepIndex - 1, { conversationOnly: true });
      reverted = true;
      const sendFn = edit.sendMessage;
      if (typeof sendFn === 'function') {
        await sendFn({
          type: 1,
          cascadeId: edit.cascadeId,
          items: nextItems,
          media,
          resend: 'edit',
          commentOverrides: edit.comments
        });
      } else {
        throw new Error('当前会话发送控制器不可用');
      }
      return true;
    } catch (error) {
      if (reverted && edit.editor && typeof IJ === 'function' && typeof LN === 'function') {
        try {
          edit.editor.setEditorState(IJ(edit.editor, LN(nextItems)));
          edit.box?.setMediaAttachments?.(media);
        } catch {}
      }
      throw error;
    } finally {
      optimisticRevert?.dispose?.();
    }
  }
  function mountInlineEdit({element,cascadeId,stepIndex,messageItems,chatCtx,optCtx,box,editor,inputBox,homeParent,homeNext,savedSnapshot,savedMedia,comments,label,cancelLabel}){
    let inlineHost=null;
    if(inputBox&&homeParent&&typeof document.createElement==='function'){
      inlineHost=document.createElement('div');
      inlineHost.dataset.agyEditorSlot='';
      inlineHost.dataset.testid='agy-inline-edit-host';
      inlineHost.className='w-full flex flex-col gap-1.5';
      const header=document.createElement('div');
      header.dataset.testid='agy-edit-banner';
      header.className='flex items-center justify-between gap-2 px-1 text-sm text-muted-foreground select-none';
      const title=document.createElement('span');
      title.className='truncate';
      title.textContent=label;
      const cancelButton=document.createElement('button');
      cancelButton.type='button';
      cancelButton.dataset.testid='agy-edit-cancel';
      cancelButton.className='shrink-0 px-2 py-0.5 rounded-md border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer';
      cancelButton.textContent=cancelLabel;
      cancelButton.addEventListener('click',event=>{event.stopPropagation();cancelEdit();});
      header.append(title,cancelButton);
      inlineHost.append(header);
      const hasOpenPopup = () => Boolean(document.querySelector?.('[role="listbox"],[role="menu"],[data-select-popup],[data-testid="agy-context-popup"],[data-testid="agy-stats-popup"]'));
      inlineHost.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&!event.defaultPrevented&&!hasOpenPopup()){
          event.preventDefault();event.stopPropagation();cancelEdit();
          return;
        }
        // Issue #58 fallback: capture Enter directly while inline edit is active so pre-mounted conversations
        // whose React useMemo already captured the original sendUserCascadeMessage still revert and resend cleanly.
        if(event.key==='Enter'&&!event.shiftKey&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.isComposing&&event.keyCode!==229&&!hasOpenPopup()&&pendingEdit&&pendingEdit.inlineHost===inlineHost){
          const inEditor = Boolean(event.target?.closest?.('[contenteditable="true"]'));
          if(inEditor && typeof pendingEdit.sendMessage === 'function'){
            event.preventDefault();
            event.stopImmediatePropagation?.();
            event.stopPropagation();
            void submitPendingEditDirectly(pendingEdit).catch(()=>{});
          }
        }
      }, true);
      inlineHost.addEventListener('click',event=>{
        if(!pendingEdit||pendingEdit.inlineHost!==inlineHost||typeof pendingEdit.sendMessage!=='function')return;
        if(event.target?.closest?.('[data-testid="agy-edit-cancel"]'))return;
        const sendBtn=event.target?.closest?.('[data-testid="send-button"],button[aria-label="Send message"],button[aria-label="发送消息"],button[aria-label="傳送訊息"]');
        if(sendBtn&&!sendBtn.disabled){
          event.preventDefault();
          event.stopImmediatePropagation?.();
          event.stopPropagation();
          void submitPendingEditDirectly(pendingEdit).catch(()=>{});
        }
      }, true);
      element.setAttribute?.('data-agy-editing-target','');
      if(element.prepend)element.prepend(inlineHost);else element.insertBefore?.(inlineHost,element.firstChild||null);
      inlineHost.append(inputBox);
    }
    pendingEdit={cascadeId,stepIndex,messageItems:Array.isArray(messageItems)?messageItems:[],element,box,editor,inputBox,homeParent,homeNext,inlineHost,stepHandler:chatCtx.stepHandler,sendMessage:chatCtx.sendMessage,optimistic:optCtx,savedEditorState:savedSnapshot?.state,savedSnapshot,savedMedia,comments,label,cancelLabel};
    installRequestOverrides(element);notifyEdit();
    editor.focus?.();(inlineHost||box.getInputCardElement?.())?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    return pendingEdit;
  }
  function suspendEdit(){
    if(!pendingEdit)return null;
    const current=pendingEdit;pendingEdit=null;
    const editSnapshot=snapshotEditorState(current.editor);
    const editMedia=[...(current.box?.getMediaAttachments?.()||[])];
    const record={
      cascadeId:current.cascadeId,
      stepIndex:current.stepIndex,
      messageItems:current.messageItems,
      editSnapshot,
      editMedia,
      savedSnapshot:current.savedSnapshot,
      savedMedia:current.savedMedia,
      comments:current.comments,
      label:current.label,
      cancelLabel:current.cancelLabel
    };
    suspendedEdits.set(current.cascadeId,record);
    restoreComposerHome(current);
    applyEditorSnapshot(current.editor,current.savedSnapshot);
    try{current.box?.setMediaAttachments?.(current.savedMedia||[]);}catch{}
    installRequestOverrides();notifyEdit();
    return record;
  }
  function getSuspendedEdit(cascadeId){return cascadeId?suspendedEdits.get(cascadeId)||null:null;}
  function clearSuspendedEdits(cascadeId){if(cascadeId)suspendedEdits.delete(cascadeId);else suspendedEdits.clear();}
  function cancelEdit({restoreDraft=true}={}){
    if(!pendingEdit)return false;
    const current=pendingEdit;pendingEdit=null;suspendedEdits.delete(current.cascadeId);restoreComposerHome(current);installRequestOverrides();
    if(restoreDraft){
      applyEditorSnapshot(current.editor,current.savedSnapshot);
      try{current.box?.setMediaAttachments?.(current.savedMedia||[]);}catch{}
    }
    notifyEdit();return true;
  }
  async function beginEdit(element,{label='正在编辑此条消息（发送后将从此处重新生成）',cancelLabel='取消'}={}){
    const message=userMessage(element);
    const list=providers(element);
    const chatCtx=list.find(p=>p.value?.stepHandler?.revertToIndex)?.value;
    const ibCtx=list.find(p=>p.value?.inputBoxRef&&typeof p.value?.getLexicalEditor==='function')?.value;
    const optCtx=list.find(p=>typeof p.value?.applyOptimisticRevert==='function')?.value;
    const box=ibCtx?.inputBoxRef?.current||chatCtx?.inputBoxRef?.current;
    const editor=box?.lexicalRef?.current||ibCtx?.getLexicalEditor?.();
    if(!message||!chatCtx?.stepHandler?.revertToIndex||!box||!editor||typeof IJ!=='function'||typeof LN!=='function')throw new Error('当前消息不支持编辑');
    const stepIndex=HU(message.metadata);
    const view=element.closest?.('[data-testid="conversation-view"]');
    const inputBox=view?.querySelector?.('[data-testid="agent-input-box"]')||box.getInputCardElement?.()?.closest?.('[data-testid="agent-input-box"]')||null;
    const sameConvo=pendingEdit?.cascadeId===message.cascadeId;
    const priorSuspended=!sameConvo?suspendedEdits.get(message.cascadeId):null;
    suspendedEdits.delete(message.cascadeId);
    const savedSnapshot=sameConvo?pendingEdit.savedSnapshot:priorSuspended?priorSuspended.savedSnapshot:snapshotEditorState(editor);
    const savedMedia=sameConvo?pendingEdit.savedMedia:priorSuspended?priorSuspended.savedMedia:[...(box.getMediaAttachments?.()||[])];
    const homeParent=sameConvo&&pendingEdit.homeParent?pendingEdit.homeParent:inputBox?.parentElement||null;
    const homeNext=sameConvo&&pendingEdit.homeParent?pendingEdit.homeNext:inputBox?.nextSibling||null;
    if(pendingEdit){
      if(pendingEdit.cascadeId!==message.cascadeId)suspendEdit();
      else{pendingEdit.inlineHost?.remove?.();pendingEdit.element?.removeAttribute?.('data-agy-editing-target');}
    }
    editor.setEditorState(IJ(editor,LN(message.step.items||[])));
    const media=await hydrateMedia(message.step.media,chatCtx.stepHandler);
    box.setMediaAttachments?.(media);
    chatCtx.restoreReviewComments?.({cascadeId:message.cascadeId,comments:message.step});
    return mountInlineEdit({
      element,cascadeId:message.cascadeId,stepIndex,messageItems:message.step.items||[],chatCtx,optCtx,box,editor,inputBox,homeParent,homeNext,savedSnapshot,savedMedia,
      comments:{artifactComments:message.step.artifactComments||[],fileDiffComments:message.step.fileDiffComments||[],fileComments:message.step.fileComments||[]},
      label,cancelLabel
    });
  }
  function resumeEdit(element){
    if(pendingEdit||!element)return null;
    const message=userMessage(element);
    if(!message)return null;
    const suspended=suspendedEdits.get(message.cascadeId);
    if(!suspended||HU(message.metadata)!==suspended.stepIndex)return null;
    const list=providers(element);
    const chatCtx=list.find(p=>p.value?.stepHandler?.revertToIndex)?.value;
    const ibCtx=list.find(p=>p.value?.inputBoxRef&&typeof p.value?.getLexicalEditor==='function')?.value;
    const optCtx=list.find(p=>typeof p.value?.applyOptimisticRevert==='function')?.value;
    const box=ibCtx?.inputBoxRef?.current||chatCtx?.inputBoxRef?.current;
    const editor=box?.lexicalRef?.current||ibCtx?.getLexicalEditor?.();
    const view=element.closest?.('[data-testid="conversation-view"]');
    const inputBox=view?.querySelector?.('[data-testid="agent-input-box"]')||box?.getInputCardElement?.()?.closest?.('[data-testid="agent-input-box"]')||null;
    const homeParent=inputBox?.parentElement||null;
    const homeNext=inputBox?.nextSibling||null;
    if(!chatCtx?.stepHandler?.revertToIndex||!box||!editor||!inputBox||!homeParent)return null;
    suspendedEdits.delete(message.cascadeId);
    applyEditorSnapshot(editor,suspended.editSnapshot);
    try{box.setMediaAttachments?.(suspended.editMedia||[]);}catch{}
    return mountInlineEdit({
      element,cascadeId:suspended.cascadeId,stepIndex:suspended.stepIndex,messageItems:suspended.messageItems||message.step.items||[],chatCtx,optCtx,box,editor,inputBox,homeParent,homeNext,
      savedSnapshot:suspended.savedSnapshot,savedMedia:suspended.savedMedia,comments:suspended.comments,
      label:suspended.label,cancelLabel:suspended.cancelLabel
    });
  }
  globalThis.__agyNativeAdapter = { version,get active(){return !disposed;},get stageUpdates(){return runtimeEnabled&&stageUpdatesEnabled;},get pendingEdit(){return pendingEdit;},onEditChange,beginEdit,suspendEdit,resumeEdit,getSuspendedEdit,clearSuspendedEdits,cancelEdit,ensureRequestHook,fiber, providers, service, authService, loginSession, onLoginSessionChange, cancelAccountLogin, startAccountLogin, wrap, store, router, overview, capabilities, executionState, runningConversationIds, unreadCount, conversationDirectory, subagents, openSubagent, composerCascadeId, fileTreeEntry, findComposer, attachFileToComposer, setEnabled, setContextLimit, setStageUpdates, setEfficientIO, setSidebarProjectLimit, installPage, fork, forkViaSideQuestion, forkPoint, nextBranchTitle, renameForkedConversation, userMessage, extractFinalResponseFromSteps, finalResponseText, navigateTurn, replaceText, editAndResend,
    dispose(){disposed=true;suspendedEdits.clear();cancelEdit({restoreDraft:false});editListeners.clear();if(sendService&&originalSend)sendService.sendUserCascadeMessage=originalSend;if(originalResolve)globalThis[hookNames.resolve]=originalResolve;if(originalSegmentRender&&globalThis[hookNames.segment]===stageSegmentRender)globalThis[hookNames.segment]=originalSegmentRender;if(originalSidebarItems&&hookNames.sidebarItems&&globalThis[hookNames.sidebarItems]===wrappedSidebarItems){globalThis[hookNames.sidebarItems]=originalSidebarItems;refreshSidebarList();}} };
  try { if (pageSource()) installRequestOverrides(); } catch {}
})();
