import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,writeFileSync,mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import vm from'node:vm';
import{toZhTw}from'../lib/zh-tw.mjs';
import{renderAuxPaneHtml}from'../lib/sidecar-ui.mjs';
import{formatRelativeTime,formatResetCountdown}from'../lib/account-helpers.mjs';
import{createSettingsStore}from'../lib/settings.mjs';
import{loadCustomI18n}from'../lib/native-host.mjs';
test('native settings translations preserve product names and English input terminology',()=>{
 const document={nodeType:9,createTreeWalker:()=>({nextNode:()=>null}),querySelectorAll:()=>[]};
 const context=vm.createContext({document,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){} disconnect(){}}});
 vm.runInContext(readFileSync('lib/native-i18n.js','utf8'),context);const t=context.__agyI18n.t;
 assert.equal(t('Interface Layout','zh-CN'),'界面布局');assert.equal(t('Queued Messages','zh-CN'),'后续消息');assert.equal(t('输入','en'),'Input');
 assert.equal(t('Google AI Ultra','zh-CN'),'Google AI Ultra');assert.equal(t('Google Sans','zh-CN'),'Google Sans');assert.equal(t('Ctrl','zh-CN'),'Ctrl');
 assert.equal(t('Your Plan: Google AI Ultra','zh-CN'),'当前套餐：Google AI Ultra');
 assert.equal(t('You have used some of your weekly limit, it will fully refresh in 3 days, 11 hours.','zh-CN'),'周额度将在 3 天 11 小时后重置。');
 assert.equal(t('Quote','zh-CN'),'引用');assert.equal(t('Ask /btw','zh-CN'),'顺便问 /btw');
 assert.equal(t('Local Permissions','zh-CN'),'本地权限');assert.equal(t('Every command requires approval.','zh-CN'),'每条命令均需批准。');
 assert.equal(t('Ask before sensitive operations.','zh-CN'),'执行敏感操作前询问。');assert.equal(t('Run all commands without restrictions.','zh-CN'),'无限制运行所有命令。');
 assert.equal(t('Background Tasks','zh-CN'),'后台任务');assert.equal(t('See all (6)','zh-CN'),'查看全部 (6)');
 assert.equal(t('See all','zh-CN'),'查看全部');assert.equal(t('Conversation Name','zh-CN'),'会话名称');assert.equal(t('Conversation ID','zh-CN'),'会话 ID');assert.equal(t('Project Name','zh-CN'),'项目名称');
 assert.equal(t('Split Right','zh-CN'),'向右拆分');assert.equal(t('Split Down','zh-CN'),'向下拆分');assert.equal(t('Replace with New','zh-CN'),'替换为新会话');
 assert.equal(t('Search or enter a URL','zh-CN'),'搜索或输入网址');assert.equal(t('Open File','zh-CN'),'打开文件');
 assert.equal(t('Side Question','zh-CN'),'侧边对话');assert.equal(t('New Side Question','zh-CN'),'新建侧边对话');
 assert.equal(t('Ask a side question without interrupting the main conversation','zh-CN'),'发起侧边对话，不打断主对话');
 assert.equal(t('12 files changed','zh-CN'),'12 个文件已更改');assert.equal(t('1 file changed','zh-CN'),'1 个文件已更改');
 assert.equal(t('5h limit','zh-CN'),'5 小时限额');assert.equal(t('55% left','zh-CN'),'剩余 55%');assert.equal(t('100% left','zh-CN'),'剩余 100%');
 assert.equal(t('Resets in 5d 1h','zh-CN'),'5 天 1 小时后重置');assert.equal(t('Resets in 3h 33m','zh-CN'),'3 小时 33 分钟后重置');
 assert.equal(t('Pull Requests','zh-CN'),'Pull Requests');assert.equal(t('14m ago','zh-CN'),'14m ago');
 assert.equal(t('Turbo','zh-CN'),'Turbo');assert.equal(t('当前会话','en'),'Current conversation');
});

test('Traditional Chinese (zh-TW) uses Taiwan IT terminology, converts UI strings cleanly, and persists in settings',()=>{
  const document={nodeType:9,createTreeWalker:()=>({nextNode:()=>null}),querySelectorAll:()=>[]};
  const context=vm.createContext({document,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){} disconnect(){}},__agyToZhTw:toZhTw});
  vm.runInContext(readFileSync('lib/native-i18n.js','utf8'),context);
  const t=context.__agyI18n.t;
  assert.equal(t('Settings','zh-TW'),'設定');
  assert.equal(t('概览','zh-TW'),'概覽');
  assert.equal(t('请求事件','zh-TW'),'請求事件');
  assert.equal(t('错误事件','zh-TW'),'錯誤事件');
  assert.equal(t('价格','zh-TW'),'價格');
  assert.equal(t('设置','zh-TW'),'設定');
  assert.equal(t('Context window','zh-TW'),'上下文視窗');
  assert.equal(t('Cache hit','zh-TW'),'快取命中');
  assert.equal(t('Open File','zh-TW'),'開啟檔案');
  assert.equal(t('Restore defaults','zh-TW'),'恢復預設設定');
  assert.equal(t('Every command requires approval.','zh-TW'),'每條命令均需批准。');
  assert.equal(t('Background Tasks','zh-TW'),'背景任務');
  assert.equal(t('Your Plan: Google AI Ultra','zh-TW'),'目前方案：Google AI Ultra');
  assert.equal(t('Resets in 3h 33m','zh-TW'),'3 小時 33 分鐘後重置');
  assert.equal(t('Thinking effort','zh-CN'),'思考深度');
  assert.equal(t('Thinking effort','zh-TW'),'思考深度');
  assert.equal(t('View Usage','zh-CN'),'查看用量');
  assert.equal(t('Promote to Conversation','zh-CN'),'提升为正式会话');
  assert.equal(t('Promote to Conversation','zh-TW'),'提升為正式會話');
  assert.equal(t('Carries out the plan: searches, edits, builds, and tests. Pick a faster, cheaper model.','zh-TW'),'負責執行計畫，包括檢索、編輯、構建與測試，建議選擇更快、更省的模型。');
  assert.equal(t('Delete Conversation','zh-CN'),'删除会话');
  assert.equal(t('Delete Conversation','zh-TW'),'刪除會話');
  assert.equal(t('Are you sure you want to delete this conversation? This action cannot be undone.','zh-TW'),'確定要刪除此會話嗎？此操作無法撤銷。');
  assert.equal(t('Minimize','zh-TW'),'最小化');
  assert.equal(t('Maximize','zh-TW'),'最大化');
  assert.equal(t('Create Project','zh-TW'),'建立專案');
  assert.equal(t('Command Palette','zh-TW'),'命令面板');
  assert.equal(t('This computer','zh-TW'),'本機');
  assert.equal(t('Input Box','zh-TW'),'輸入框');
  assert.equal(t('Queued messages','zh-TW'),'後續訊息');
  assert.equal(t('Choose which key sends a message in the chat composer.','zh-TW'),'選擇在聊天輸入框中傳送訊息的按鍵。');
  assert.equal(t('Controls how much time and quota the model spends reasoning before responding. Higher effort improves accuracy on hard problems, at the cost of slower responses and higher quota use.','zh-CN'),'控制模型在回复前投入多少时间与额度进行推理。更高的思考深度可提升复杂问题的准确度，但会增加响应耗时与额度消耗。');
  assert.equal(toZhTw('复制文件并恢复默认设置，助手回复缓存异常'), '複製檔案並恢復預設設定，助手回覆快取異常');
  assert.equal(toZhTw('按实际规划 / 执行模型计价'), '按實際規劃 / 執行模型計價');
  assert.equal(formatRelativeTime(0, 30000, 'zh-TW'), '剛剛');
  assert.equal(formatRelativeTime(0, 120000, 'zh-TW'), '2 分鐘前');
  assert.equal(formatResetCountdown(7200000, 0, 'zh-TW'), '2 小時後重置');
  const html=renderAuxPaneHtml({version:'2.13.1',language:'zh-TW'});
  assert.match(html,/<html lang="zh-TW">/);
  assert.ok(html.includes('需要重啟 Antigravity 以啟用 Powertools 外掛'));
  assert.ok(html.includes('檢查外掛更新'));
  // Ensure settings store accepts zh-TW
  const dir=mkdtempSync(join(tmpdir(),'agy-lang-tw-'));
  try{
    const store=createSettingsStore(dir);
    assert.equal(store.set({language:'zh-TW'}).language,'zh-TW');
    assert.equal(store.get().language,'zh-TW');
  }finally{rmSync(dir,{recursive:true,force:true});}
  // Ensure no common simplified-only glyphs remain across UI source files after toZhTw
  const simplifiedOnly=/[万与个为义于产仅从仓们价优会传体余侧关内写准减凑凭击划则刚创删务动区协单占却历压参发变号后听启周响唤围图圆场声处备头夹实审对导将尝尽层带帮并广库应开异强归当录径忆态总战执扩扬抢护报担拦择挂换据数断无旧时昵显暂机权条来栏树样档检汇没洁浅测浏滚满点热状独环现电监盘码确碍离积称稳筛签简类紧级线组细织终结给络绝统继续缓编缩网联脑范营补装观规视览触计订认让议记许设访证识诊试话询该详语误说请读调败账费资转轮软载较辅辑输边过运这进远违连迟适选遥邮采钟钥钮链销错键长闭问闲间阅队阶际险随隐静页顶项顺顿预频题额风馈驻验骤麦标彻]/;
  for(const file of ['lib/native-i18n.js','lib/native-panels.js','lib/native-sidebar-monitor.js','lib/native-sidebar-drop.mjs','lib/native-ui.js','lib/sidecar-ui.mjs']){
    const converted=toZhTw(readFileSync(file,'utf8')).replace(/简体中文|批准/g,'');
    const leftover=converted.match(simplifiedOnly);
    assert.equal(leftover,null,`Unexpected simplified glyph ${leftover?.[0]} in ${file}`);
  }
});

test('Swarm UI strings translate cleanly in zh-CN and zh-TW without middle dots and protect post bodies', () => {
  const document = { nodeType: 9, createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [] };
  const context = vm.createContext({ document, NodeFilter: { SHOW_TEXT: 4 }, MutationObserver: class { observe() {} disconnect() {} }, __agyToZhTw: toZhTw });
  vm.runInContext(readFileSync('lib/native-i18n.js', 'utf8'), context);
  const t = context.__agyI18n.t;
  assert.equal(t('Board', 'zh-CN'), '讨论板');
  assert.equal(t('Board', 'zh-TW'), '討論板');
  assert.equal(t('Members', 'zh-CN'), '成员');
  assert.equal(t('Members', 'zh-TW'), '成員');
  assert.equal(t('Graph', 'zh-CN'), '关系图');
  assert.equal(t('Graph', 'zh-TW'), '關係圖');
  assert.equal(t('From anyone', 'zh-CN'), '来自任意成员');
  assert.equal(t('To anyone', 'zh-TW'), '提及任意成員');
  assert.equal(t('Hide inactive', 'zh-CN'), '隐藏非活跃');
  assert.equal(t('Export GIF', 'zh-TW'), '匯出 GIF'.replace('匯', '導'));
  assert.equal(t('No swarm in this conversation', 'zh-CN'), '当前会话暂无蜂群');
  assert.equal(t('Copy to clipboard', 'zh-TW'), '複製到剪貼簿');
  assert.equal(t('Attach to chat', 'zh-CN'), '引用到输入框');
  assert.equal(t('Attach to chat', 'zh-TW'), '引用到輸入框');
  assert.equal(t('Pinned Conversations', 'zh-CN'), '置顶会话');
  assert.equal(t('Pinned Conversations', 'zh-TW'), '置頂會話');
  assert.equal(t('Copy Image', 'zh-CN'), '复制图片');
  assert.equal(t('Save Image', 'zh-CN'), '保存图片');
  assert.equal(t('Save Image', 'zh-TW'), '儲存圖片');
  const ovLabel = t(`overview \u00b7 from the narrator\u2019s notes`, 'zh-CN');
  assert.equal(ovLabel, '概览 - 来自旁白笔记');
  assert.equal(ovLabel.includes('\u00b7'), false);
  assert.equal(t(`overview \u00b7 from the narrator's notes`, 'zh-TW'), '概覽 - 來自旁白筆記');
  assert.equal(t('For most deep reasoning and complex problems', 'zh-CN'), '适用于深度推理与复杂问题');
  assert.equal(t('For most deep reasoning and complex problems', 'zh-TW'), '適用於深度推理與複雜問題');
  assert.equal(t('Notice', 'zh-CN'), '提示');
  assert.equal(t('Offloads routine steps to a faster executor. Same quality, fewer tokens used.', 'zh-CN'), '将常规步骤分流给更快的执行模型，保持同等质量同时减少 Token 消耗。');
  assert.equal(t('Copy Project Name', 'zh-CN'), '复制项目名称');
  assert.equal(t('Project Settings', 'zh-TW'), '專案設定');
  assert.equal(t('Reveal in Finder', 'zh-CN'), '在访达中显示');
  assert.equal(t('Reveal in Finder', 'zh-TW'), '在Finder中顯示');
  assert.equal(t('Show in File Explorer', 'zh-TW'), '在檔案總管中顯示');
  assert.equal(t('Delete Project', 'zh-CN'), '删除项目');
  assert.equal(t('Yes, allow this time', 'zh-CN'), '是，仅本次允许');
  assert.equal(t('Yes, and always allow in this conversation', 'zh-TW'), '是，並在本會話中始終允許');
  assert.equal(t('Yes, save rule globally', 'zh-CN'), '是，全局保存此规则');
  assert.equal(t('(tell the agent what to do instead)', 'zh-CN'), '（告诉智能体改用什么方式处理）');
  assert.equal(t('Yes, always allow downloads from github.com', 'zh-CN'), '是，始终允许从 github.com 下载');
  assert.equal(t('Yes, and always allow \'npm test\' in this conversation', 'zh-CN'), '是，并在本会话中始终允许 \'npm test\'');
  assert.equal(t('Thought for 14s', 'zh-CN'), '思考了 14 秒');
  assert.equal(t('Thought for 14s', 'zh-TW'), '思考了 14 秒');
  assert.equal(t('Step 2 of 5', 'zh-CN'), '第 2 / 5 步');
  assert.equal(t('Chat Layout', 'zh-TW'), '聊天佈局'.replace('佈', '布'));
  assert.equal(t('Tool Permissions', 'zh-TW'), '工具權限');
  assert.equal(t('Confirm Undo', 'zh-CN'), '确认撤回');
  assert.equal(t('Available AI Credits: 250', 'zh-CN'), '可用 AI 积分：250');
  assert.equal(t('12 tools', 'zh-TW'), '12 個工具');
  assert.equal(t('Show more (4)', 'zh-CN'), '显示更多 (4)');
  assert.equal(t('Swarm', 'zh-CN'), 'Swarm');
  assert.equal(t('Open this pane from a conversation to see its swarm. Swarms started there appear here automatically; start one with', 'zh-CN'), '请在具体会话中打开此面板以查看蜂群。该会话中启动的蜂群会自动显示在这里；输入');
  assert.equal(t('12 posts', 'zh-CN'), '12 条动态');
  assert.equal(t('4 members', 'zh-TW'), '4 名成員');
  assert.equal(t('3 of 5 tasks done', 'zh-CN'), '已完成 3 / 5 项任务');
  assert.equal(t('Waiting on @coordinator', 'zh-CN'), '等待 @coordinator');
  assert.equal(t('Working for @lead', 'zh-CN'), '正为 @lead 处理');
  assert.equal(t('@worker-1 ran out of quota', 'zh-CN'), '@worker-1 额度已耗尽');
  assert.equal(t('@worker-2 looks stuck', 'zh-TW'), '@worker-2 疑似卡住');
  assert.equal(t('Go to #14 on the Board', 'zh-CN'), '在讨论板查看 #14');
  assert.equal(t('Exporting 45%', 'zh-CN'), '正在导出 45%');
  const coordSummary = t(`Coordinator \u00b7 3 of 5 done \u00b7 Needs you`, 'zh-CN');
  assert.equal(coordSummary, '协调者 3 / 5 已完成 需要你处理');
  assert.equal(coordSummary.includes('\u00b7'), false);
  const readSummary = t(`read #12 \u00b7 updated 2m ago`, 'zh-CN');
  assert.equal(readSummary, '已读至 #12 更新于 2m ago');
  assert.equal(readSummary.includes('\u00b7'), false);
  assert.equal(t('Load older messages', 'zh-CN'), '加载更早的消息');
  assert.equal(t('Prevent sleep', 'zh-CN'), '防止休眠');
  assert.equal(t('Context and quota indicator', 'zh-TW'), '上下文與額度指示器');
  assert.equal(t('Delete Permanently', 'zh-TW'), '永久刪除');
  const workedSingle = t('Worked for 5m', 'zh-CN');
  assert.equal(workedSingle, '用时 5分');
  const workedUpdates = t(`Worked for 8m 28s \u00b7 4 updates`, 'zh-CN');
  assert.equal(workedUpdates, '用时 8分28秒 4 条进度');
  assert.equal(workedUpdates.includes('\u00b7'), false);
  assert.equal(t(`Worked for 8m 28s \u00b7 4 updates`, 'zh-TW'), '用時 8分28秒 4 條進度');
  assert.equal(t(`\u00b7 3 updates`, 'zh-CN'), '3 条进度');
  const i18nSrc = readFileSync('lib/native-i18n.js', 'utf8');
  assert.ok(i18nSrc.includes('.post-body') && i18nSrc.includes('#ov-frame'));
});

test('localizer skips English text inside code editors, diff viewers, and monospace code surfaces (Issue #55)', () => {
  const makeNode = (value, matchedSelectors = []) => ({
    nodeValue: value,
    parentElement: {
      closest: sel => matchedSelectors.some(m => sel.includes(m)) ? {} : null
    }
  });
  const nodes = [
    makeNode('Settings', ['.monaco-editor']),
    makeNode('Delete', ['.monaco-diff-editor']),
    makeNode('Copy', ['[data-testid*="diff"]']),
    makeNode('Review', ['.code-block']),
    makeNode('Open File', ['.view-lines']),
    makeNode('Settings', [])
  ];
  let idx = 0;
  const document = {
    nodeType: 9,
    body: { nodeType: 1, getAttribute: () => null, closest: () => null, querySelectorAll: () => [] },
    createTreeWalker: () => {
      let i = 0;
      return { nextNode: () => nodes[i++] || null };
    },
    querySelectorAll: () => []
  };
  const context = vm.createContext({
    document,
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: class { observe() {} disconnect() {} },
    __agyToZhTw: toZhTw
  });
  vm.runInContext(readFileSync('lib/native-i18n.js', 'utf8'), context);
  const loc = context.__agyI18n.localizer();
  loc.apply('zh-CN', true);
  assert.equal(nodes[0].nodeValue, 'Settings');
  assert.equal(nodes[1].nodeValue, 'Delete');
  assert.equal(nodes[2].nodeValue, 'Copy');
  assert.equal(nodes[3].nodeValue, 'Review');
  assert.equal(nodes[4].nodeValue, 'Open File');
  assert.equal(nodes[5].nodeValue, '设置');
  loc.dispose();
});

test('Skills and Customizations UI strings translate accurately in zh-CN and zh-TW (Issue #60)', () => {
  const document = { nodeType: 9, createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [] };
  const context = vm.createContext({ document, NodeFilter: { SHOW_TEXT: 4 }, MutationObserver: class { observe() {} disconnect() {} }, __agyToZhTw: toZhTw });
  vm.runInContext(readFileSync('lib/native-i18n.js', 'utf8'), context);
  const t = context.__agyI18n.t;
  assert.equal(t('Skills & Rules', 'zh-CN'), '技能与规则');
  assert.equal(t('Skills & Rules', 'zh-TW'), '技能與規則');
  assert.equal(t('Active Skills', 'zh-CN'), '已启用技能');
  assert.equal(t('Enable Recommended Skills', 'zh-TW'), '啟用推薦技能');
  assert.equal(t('Browse the Marketplace', 'zh-CN'), '浏览插件市场');
  assert.equal(t('No skills or rules yet.', 'zh-TW'), '暫無技能或規則。');
  assert.equal(t('Delete Skill', 'zh-CN'), '删除技能');
  assert.equal(t('Copy Config File Path', 'zh-TW'), '複製設定檔路徑');
});

test('custom-i18n.json loads additive user translations safely and slash command descriptions translate cleanly (Issue #68)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-custom-i18n-'));
  try {
    assert.deepEqual(loadCustomI18n(dir), []);
    writeFileSync(join(dir, 'custom-i18n.json'), '{bad json');
    assert.deepEqual(loadCustomI18n(dir), []);

    writeFileSync(join(dir, 'custom-i18n.json'), JSON.stringify({
      'Settings': '不应覆盖官方词条',
      'My Custom Skill Description': '我的自定义技能说明'
    }));
    const pairs = loadCustomI18n(dir);
    assert.equal(pairs.length, 2);

    const document = { nodeType: 9, createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [] };
    const context = vm.createContext({
      document,
      NodeFilter: { SHOW_TEXT: 4 },
      MutationObserver: class { observe() {} disconnect() {} },
      __agyToZhTw: toZhTw,
      __agyCustomI18n: pairs
    });
    vm.runInContext(readFileSync('lib/native-i18n.js', 'utf8'), context);
    const t = context.__agyI18n.t;
    // Built-in translation wins over custom override; custom entry fills missing strings and auto-converts to zh-TW
    assert.equal(t('Settings', 'zh-CN'), '设置');
    assert.equal(t('My Custom Skill Description', 'zh-CN'), '我的自定义技能说明');
    assert.equal(t('My Custom Skill Description', 'zh-TW'), '我的自訂技能說明');
    // Built-in slash command descriptions from Issue #68
    assert.equal(t('Ask a quick question without interrupting the main conversation.', 'zh-CN'), '发起侧边对话，不打断主对话。');
    assert.equal(t('Run until the specified goal is completely finished.', 'zh-CN'), '持续执行，直到指定目标完全达成。');
    assert.equal(t('Invoke the Boost multi-agent orchestrator for complex tasks.', 'zh-TW'), '呼叫 Boost 多智能體編排器處理複雜任務。'.replace('呼叫', '調用'));

    // Array-of-pairs format is also supported
    writeFileSync(join(dir, 'custom-i18n.json'), JSON.stringify([['Array Custom Text', '数组词条']]));
    assert.deepEqual(loadCustomI18n(dir), [['Array Custom Text', '数组词条']]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Settings translations and editable placeholders follow language changes and disposal', () => {
  const fields = ['INPUT', 'TEXTAREA'].map(tagName => {
    const attrs = new Map([['placeholder', 'Search shortcuts...']]);
    return { tagName, isConnected: true, getAttribute: key => attrs.get(key) ?? null,
      setAttribute: (key, value) => attrs.set(key, value), hasAttribute: key => attrs.has(key), removeAttribute: key => attrs.delete(key) };
  });
  const document = { nodeType: 9, createTreeWalker: () => ({ nextNode: () => null }),
    querySelectorAll: selector => selector.includes('[placeholder]') ? fields : [] };
  const context = vm.createContext({ document, NodeFilter: { SHOW_TEXT: 4 }, MutationObserver: class { observe() {} disconnect() {} }, __agyToZhTw: toZhTw });
  vm.runInContext(readFileSync('lib/native-i18n.js', 'utf8'), context);
  for (const [english, simplified, traditional] of [
    ['Search shortcuts...', '搜索快捷键...', '搜尋快速鍵...'],
    ['Settings for conversations outside of projects', '未关联项目的会话设置', '未關聯專案的會話設定'],
    ['Hide breakdown', '隐藏明细', '隱藏明細'],
    ['Notification settings', '通知设置', '通知設定'],
    ['Automatic check for updates', '自动检查更新', '自動檢查更新']
  ]) {
    assert.equal(context.__agyI18n.t(english, 'zh-CN'), simplified);
    assert.equal(context.__agyI18n.t(english, 'zh-TW'), traditional);
  }
  for (const [language, expected] of [['zh-CN', '搜索快捷键...'], ['zh-TW', '搜尋快速鍵...'], ['en', 'Search shortcuts...']]) {
    context.__agyLocalization.apply(language, false);
    for (const field of fields) assert.equal(field.getAttribute('placeholder'), expected);
  }
  context.__agyLocalization.apply('zh-TW', false);
  context.__agyLocalization.dispose();
  for (const field of fields) {
    assert.equal(field.getAttribute('placeholder'), 'Search shortcuts...');
    assert.equal(field.hasAttribute('data-agy-original-placeholder'), false);
  }
});

import { getLocalePack, SUPPORTED_LANGUAGES } from '../lib/locales/index.mjs';
import { nativeSource, swarmI18nSource } from '../lib/native-host.mjs';

const packLanguages = SUPPORTED_LANGUAGES.filter(language => getLocalePack(language));
const menuLabels = ['Sort Conversations','Sort Projects','Auto Pin','Archived Only','Subtitles','Decorations','Project'];

test('every pack covers the native catalog, static UI calls, and sidebar menus', () => {
  const source = readFileSync('lib/native-i18n.js','utf8');
  const native = vm.runInNewContext(source.slice(source.indexOf('const pairs'),source.indexOf('const zh=new Map'))+'pairs');
  const keys = new Set([...native.map(([key])=>key),...menuLabels]);
  for (const file of ['native-panels.js','native-ui.js','native-sidebar-monitor.js','native-sidebar-drop.mjs','native-ssh-paste.mjs','launcher.mjs']) {
    const script = readFileSync('lib/'+file,'utf8');
    for (const match of script.matchAll(/(?:uiText|text)\(\s*(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*,\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*\)/g)) keys.add(vm.runInNewContext(match[1]));
  }
  const WORKED_RE = /^(?:Worked for\b|用时(?:\s|$)|用時(?:\s|$)|Durée\s*:|作業時間(?:\s|$)|작업 시간(?:\s|$)|Bearbeitungszeit(?:\s|$)|Tiempo de trabajo(?:\s|$)|Время работы(?:\s|$))/;
  const UPDATES_RE = /(?:[\u00b7\u2022\-]\s*)?(\d+)\s+(?:updates?\b|条进度|條進度|étapes?\b|件の更新|개 업데이트|Aktualisierung(?:en)?\b|actualizaci[oó]n(?:es)?\b|обновлени\S*)/i;
  for (const lang of packLanguages) {
    const pack = getLocalePack(lang);
    for (const key of keys) if (key && !/[\u3400-\u9fff]/u.test(key)) assert.ok((pack.entries[key] || pack.uiEntries[key])?.trim(), `${lang}: ${key}`);
    for (const [pattern] of pack.patterns) assert.doesNotThrow(()=>new RegExp(pattern));
    assert.deepEqual(JSON.parse(JSON.stringify(pack)),pack);
    if (lang !== 'ja') assert.doesNotMatch(readFileSync(`lib/locales/${lang}.mjs`,'utf8'), /[\u4e00-\u9fff]/, `${lang}.mjs should not contain literal CJK`);
    const doc = { nodeType: 9, createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [] };
    const ctx = vm.createContext({ document: doc, NodeFilter: { SHOW_TEXT: 4 }, MutationObserver: class { observe(){} disconnect(){} }, __agyLocalePack: pack });
    vm.runInContext(source, ctx);
    const t = ctx.__agyI18n.t;
    for (const sample of ['Subagent running', 'Waiting for approval', 'Retrying', 'Thinking', 'Waiting for model', 'Context just compacted; exact provider tokens will update on your next message.', 'Just compacted; exact usage updates on next message', `Coordinator \u00b7 3 of 5 done`, 'read #12']) {
      assert.doesNotMatch(t(sample, lang), /(?::\s*$|\(\s*\)|#\s*\)|\$[0-9])/, `${lang} dangling template on ${sample}`);
    }
    for (const worked of [`Worked for 8m 28s \u00b7 1 update`, `Worked for 8m 28s \u00b7 4 updates`]) {
      const rendered = t(worked, lang);
      assert.match(rendered, WORKED_RE, `${lang}: ${rendered}`);
      assert.match(rendered, UPDATES_RE, `${lang}: ${rendered}`);
    }
    assert.match(t('Worked for 5m', lang), WORKED_RE);
  }
});

test('only the selected language payload appears in desktop and Swarm boot sources', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const settingsObj = {enabled:true,language};
    for (const source of [nativeSource('https://localhost',[],{settingsObj}),swarmI18nSource(settingsObj)]) {
      for (const lang of packLanguages) assert.equal(source.includes(JSON.stringify(getLocalePack(lang))), lang === language);
    }
  }
});

test('switching all languages restores text and leaves project names and code unchanged', () => {
  const node = (text, area) => ({nodeValue:text,isConnected:true,parentElement:{closest:s=>area && s.includes(area)}});
  const nodes=[node('Sort Projects',''),node('Project','[role="menu"]'),node('Project',''),node('Sort Projects','code')];
  const document={nodeType:9,createTreeWalker(){let i=0;return {nextNode:()=>nodes[i++]};},querySelectorAll:()=>[]};
  const context=vm.createContext({document,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}disconnect(){}},__agyToZhTw:toZhTw});
  vm.runInContext(readFileSync('lib/native-i18n.js','utf8'),context);
  for (const lang of [...SUPPORTED_LANGUAGES,'en']) {
    context.__agyLocalePack=getLocalePack(lang);
    context.__agyLocalization.apply(lang,false);
    const t=context.__agyI18n.t;
    assert.deepEqual(nodes.map(n=>n.nodeValue),[t('Sort Projects',lang),t('Project',lang),'Project','Sort Projects']);
    if (context.__agyLocalePack) assert.match(t('Your Plan: Gemini',lang),/Gemini/);
  }
  context.__agyLocalization.dispose();
  assert.equal(nodes[0].nodeValue,'Sort Projects');
});

test('locale data and the nine guides exclude forbidden separators', () => {
  const files=['README.md','README_EN.md',...['ZH_TW','FR','JA','KO','DE','ES','RU'].map(x=>`docs/README_${x}.md`),...['index',...packLanguages].map(x=>`lib/locales/${x}.mjs`)];
  for (const file of files) assert.doesNotMatch(readFileSync(file,'utf8'),/[\u00b7\u2022\u2027\u30fb]/u,file);
});

import {startNativeIntegration} from '../lib/native-host.mjs';

test('disabled integration serves the selected pack and scoped overrides through the host binding',async()=>{
  const dataDir=mkdtempSync(join(tmpdir(),'agy-pack-rpc-'));
  const portFile=join(dataDir,'port'), origin='https://127.0.0.1:5000';
  const fetchBefore=globalThis.fetch;
  let stop, receiveEvent, reply;
  try {
    writeFileSync(portFile,'12345\n');
    writeFileSync(join(dataDir,'settings.json'),JSON.stringify({enabled:false,language:'fr'}));
    writeFileSync(join(dataDir,'custom-i18n.json'),JSON.stringify({fr:{Example:'Exemple'},ja:{Example:'例'}}));
    globalThis.fetch=async()=>({json:async()=>[{id:'window',type:'page',title:'Antigravity',url:origin+'/c/a',webSocketDebuggerUrl:'ws://127.0.0.1:12345/devtools/page/a'}]});
    stop=startNativeIntegration({portFile,dataDir,parseSessionData:()=>({}),onStatus:()=>{},discover:async()=>[],connect:async()=>({
      socket:{addEventListener(){},close(){}},onEvent(callback){receiveEvent=callback;},async send(method,params){
        if(method==='Page.getFrameTree')return {frameTree:{frame:{id:'frame'}}};
        if(method==='Page.addScriptToEvaluateOnNewDocument')return {identifier:'script'};
        if(params?.expression?.startsWith('globalThis.__agyPowertoolsReceive?.('))vm.runInNewContext(params.expression,{__agyPowertoolsReceive:(id,data)=>{reply=JSON.parse(JSON.stringify(data));}});
        return {result:{value:false}};
      }
    })});
    await stop.ready;
    await receiveEvent({method:'Runtime.executionContextCreated',params:{context:{id:42,origin,auxData:{isDefault:true,frameId:'frame'}}}});
    for(const [language,expected] of [['fr','Exemple'],['ja','例']]){
      await receiveEvent({method:'Runtime.bindingCalled',params:{name:'__agyPowertoolsHost',executionContextId:42,payload:JSON.stringify({id:1,method:'i18n.pack',language})}});
      assert.equal(reply.pack.lang,language);
      assert.deepEqual(reply.custom,[['Example',expected]]);
    }
  } finally {await stop?.();globalThis.fetch=fetchBefore;rmSync(dataDir,{recursive:true,force:true});}
});
