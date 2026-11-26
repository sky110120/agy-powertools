import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { nativeSource } from '../lib/native-host.mjs';

const clientSrc = readFileSync(new URL('../lib/native-client.js', import.meta.url), 'utf8');
const monitorSrc = readFileSync(new URL('../lib/native-sidebar-monitor.js', import.meta.url), 'utf8');
const uiSrc = readFileSync(new URL('../lib/native-ui.js', import.meta.url), 'utf8');

function createMiniDom() {
  const makeEl = (tagName = 'DIV', props = {}) => {
    const attrs = new Map();
    const children = [];
    const el = {
      tagName: tagName.toUpperCase(),
      className: props.className || '',
      textContent: props.textContent || '',
      dataset: {},
      children,
      parentElement: null,
      isConnected: true,
      get firstChild() { return children[0] || null; },
      get nextSibling() {
        if (!this.parentElement) return null;
        const idx = this.parentElement.children.indexOf(this);
        return idx >= 0 ? (this.parentElement.children[idx + 1] || null) : null;
      },
      setAttribute(name, value) {
        attrs.set(name, String(value));
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          this.dataset[key] = String(value);
        }
      },
      getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
      removeAttribute(name) {
        attrs.delete(name);
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          delete this.dataset[key];
        }
      },
      hasAttribute(name) { return attrs.has(name); },
      toggleAttribute(name, force) {
        const next = force === undefined ? !attrs.has(name) : Boolean(force);
        if (next) this.setAttribute(name, '');
        else this.removeAttribute(name);
        return next;
      },
      append(child) {
        if (!child) return;
        child.parentElement = this;
        child.isConnected = true;
        children.push(child);
      },
      insertBefore(child, before) {
        if (!child) return;
        if (child.parentElement) child.remove();
        child.parentElement = this;
        child.isConnected = true;
        const idx = before ? children.indexOf(before) : -1;
        if (idx >= 0) children.splice(idx, 0, child);
        else children.push(child);
      },
      remove() {
        if (this.parentElement) {
          const idx = this.parentElement.children.indexOf(this);
          if (idx >= 0) this.parentElement.children.splice(idx, 1);
          this.parentElement = null;
        }
        this.isConnected = false;
      },
      getBoundingClientRect() { return props.rect || { width: 16, height: 16 }; },
      matches(sel) {
        return sel.split(',').some(part => {
          const s = part.trim();
          if (!s) return false;
          if (s === '*') return true;
          if (s === '.agy-sidebar-row') return this.className.split(/\s+/).includes('agy-sidebar-row');
          if (s === 'button') return this.tagName === 'BUTTON';
          if (s === '[role="button"]') return this.getAttribute('role') === 'button';
          if (s === 'a[href]' || s === 'a[href^="/c/"]' || s === 'a[href="/customizations"]') {
            const href = this.getAttribute('href') || '';
            if (s === 'a[href="/customizations"]') return this.tagName === 'A' && href === '/customizations';
            return this.tagName === 'A' && (s === 'a[href]' ? Boolean(href) : href.startsWith('/c/'));
          }
          if (s === '[data-agy-powertools-root]') return Boolean(this.dataset.agyPowertoolsRoot || this.hasAttribute('data-agy-powertools-root'));
          if (s === '[data-agy-powertools-root="sidebar-beam"]') return this.dataset.agyPowertoolsRoot === 'sidebar-beam' || this.getAttribute('data-agy-powertools-root') === 'sidebar-beam';
          if (s === '[data-agy-sb-native-spinner]' || s === '[data-agy-sb-native-spinner="true"]') return this.dataset.agySbNativeSpinner === 'true' || this.getAttribute('data-agy-sb-native-spinner') === 'true';
          if (s === 'circle' || s === 'rect' || s === 'ellipse') return this.tagName === s.toUpperCase();
          return false;
        });
      },
      closest(sel) {
        for (let cur = this; cur; cur = cur.parentElement) {
          if (cur.matches(sel)) return cur;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = node => {
          for (const child of node.children) {
            if (child.matches(sel)) out.push(child);
            walk(child);
          }
        };
        walk(this);
        return out;
      },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    };
    if (props.attrs) {
      for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
    }
    return el;
  };

  const head = makeEl('HEAD');
  const body = makeEl('BODY');
  const documentElement = makeEl('HTML');
  documentElement.append(head);
  documentElement.append(body);
  const document = {
    readyState: 'complete',
    head,
    body,
    documentElement,
    createElementNS: (_,tag) => makeEl(tag),
    createElement: tag => makeEl(tag),
    querySelectorAll: sel => documentElement.querySelectorAll(sel),
    querySelector: sel => documentElement.querySelector(sel),
    addEventListener() {}
  };
  return { document, makeEl, head, body, documentElement };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectNodes(item, out);
    return out;
  }
  out.push(node);
  if (Array.isArray(node.children)) collectNodes(node.children, out);
  if (node.props?.children) collectNodes(node.props.children, out);
  return out;
}

function collectText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) return node.map(collectText).join('');
  return collectText(node.children || node.props?.children || '');
}

test('native-client runningConversations aggregates active top-level chats, subagent counts, waiting priority, and store subscriptions', () => {
  const summaries = {
    'chat-run': {
      status: 4, // CASCADE_RUN_STATUS_BUSY (must stay 'running', not misclassified as 'waiting')
      summary: 'IO监控页面菜单调整',
      stepCount: 14,
      lastModifiedTime: { seconds: 200 },
      trajectoryMetadata: { projectId: 'proj-a', workspaces: [{ absoluteUri: 'file:///F:/Work/PLCApp' }] }
    },
    'chat-wait': {
      status: 2,
      waitingSteps: [{ stepIndex: 7 }],
      annotations: { title: 'Excel Alarm Code Data Processing' },
      stepCount: 8,
      lastModifiedTime: { seconds: 150 },
      trajectoryMetadata: { projectId: 'proj-b' }
    },
    'chat-sub-host': {
      status: 1,
      notFullyIdle: true,
      summary: '后台多子任务汇总',
      stepCount: 5,
      lastModifiedTime: { seconds: 180 },
      trajectoryMetadata: { projectId: 'proj-a' }
    },
    'sub-1': {
      status: 2,
      parentConversationId: 'chat-sub-host',
      nestingDepth: 1,
      trajectoryMetadata: { subagentSpec: { role: 'Verifier' } }
    },
    'sub-2': {
      status: 4,
      parentConversationId: 'sub-1',
      nestingDepth: 2,
      trajectoryMetadata: { rootConversationId: 'chat-sub-host', subagentSpec: { role: 'Nested' } }
    },
    'chat-idle': {
      status: 1,
      notFullyIdle: false,
      summary: '已完成会话',
      lastModifiedTime: { seconds: 300 }
    },
    'chat-archived': {
      status: 2,
      annotations: { archived: true, title: '已归档' }
    },
    'chat-killed': {
      status: 2,
      killed: true,
      summary: '已终止'
    }
  };
  let listener = null;
  let unsubscribed = false;
  const reduxStore = {
    getState: () => ({
      trajectorySummaries: { summaries },
      projects: { projects: { 'proj-a': { name: 'PLC-HMI' }, 'proj-b': { name: 'AlarmTools' } } }
    }),
    dispatch() {},
    subscribe(fn) {
      listener = fn;
      return () => { unsubscribed = true; listener = null; };
    }
  };
  const element = { '__reactFiber$fixture': { tag: 10, type: {}, memoizedProps: { value: { store: reduxStore } }, return: null } };
  const context = vm.createContext({
    document: { querySelector: () => element, querySelectorAll: () => [] },
    location: { pathname: '/c/chat-run' }
  });
  vm.runInContext(clientSrc, context);

  const items = JSON.parse(JSON.stringify(context.__agyNativeAdapter.runningConversations()));
  assert.equal(items.length, 3);
  // Waiting conversations are prioritized first
  assert.equal(items[0].id, 'chat-wait');
  assert.equal(items[0].status, 'waiting');
  assert.equal(items[0].projectName, 'AlarmTools');
  // Then sorted by updatedAtMs descending
  assert.equal(items[1].id, 'chat-run');
  assert.equal(items[1].status, 'running');
  assert.equal(items[1].projectName, 'PLC-HMI');
  assert.equal(items[1].isCurrent, true);
  assert.equal(items[1].stepCount, 14);
  assert.equal(items[2].id, 'chat-sub-host');
  assert.equal(items[2].activeSubagents, 2);

  let notified = 0;
  const unsub = context.__agyNativeAdapter.subscribeStore(() => { notified++; });
  assert.equal(typeof listener, 'function');
  listener();
  assert.equal(notified, 1);
  unsub();
  assert.equal(unsubscribed, true);
});

test('sidebar monitor decorates running rows with flowing beam, hides only 4-dot spinner without touching More options, and cleans up on dispose', () => {
  const { document, makeEl, body, documentElement } = createMiniDom();
  const makeSidebarRow = (cid, title, spinnerType) => {
    const row = makeEl('DIV', { className: 'agy-sidebar-row flex items-center' });
    const link = makeEl('A', { attrs: { href: `/c/${cid}` } });
    const titleSpan = makeEl('SPAN', { textContent: title });
    link.append(titleSpan);
    if (spinnerType === 'svg') {
      const svg = makeEl('SVG', { rect: { width: 16, height: 16 } });
      for (let i = 0; i < 4; i++) svg.append(makeEl('CIRCLE'));
      link.append(svg);
    } else if (spinnerType === 'grid') {
      const grid = makeEl('SPAN', { rect: { width: 14, height: 14 } });
      for (let i = 0; i < 4; i++) grid.append(makeEl('SPAN'));
      link.append(grid);
    }
    const moreBtn = makeEl('BUTTON', { attrs: { 'aria-label': 'More options' } });
    const moreIcon = makeEl('SVG', { rect: { width: 16, height: 16 } });
    for (let i = 0; i < 4; i++) moreIcon.append(makeEl('CIRCLE'));
    moreBtn.append(moreIcon);
    row.append(link);
    row.append(moreBtn);
    body.append(row);
    return { row, moreBtn, moreIcon };
  };

  const rowRun = makeSidebarRow('c-run', 'IO监控页面菜单调整', 'svg');
  const rowWait = makeSidebarRow('c-wait', 'Excel Alarm Code', 'grid');
  const rowIdle = makeSidebarRow('c-idle', '已完成会话', 'svg');

  let runningList = [
    { id: 'c-wait', title: 'Excel Alarm Code', projectId: 'p2', projectName: 'Alarm', status: 'waiting', activeSubagents: 0, stepCount: 6 },
    { id: 'c-run', title: 'IO监控页面菜单调整', projectId: 'p1', projectName: 'PLC', status: 'running', activeSubagents: 1, stepCount: 12 }
  ];
  let opts = {
    enabled: true,
    language: 'zh-CN',
    sidebarRunningBeam: true,
    sidebarRunningBeamPalette: 'aurora',
    sidebarHideNativeSpinner: true,
    sidebarRunningGroup: true
  };
  let preview = false;
  const navigated = [];

  let stateSlot = false;
  const context = vm.createContext({
    document,
    setTimeout,
    clearTimeout,
    React: {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
      useSyncExternalStore: (_, getSnap) => getSnap(),
      useState: init => [stateSlot, next => { stateSlot = typeof next === 'function' ? next(stateSlot) : next; }]
    }
  });
  vm.runInContext(monitorSrc, context);

  const css = context.__agySidebarMonitorHelpers.buildStylesheet();
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
  assert.match(css, /@keyframes agy-sb-sweep/);
  assert.match(css, /translate3d\(104%,0,0\)/);
  assert.match(css, /\.agy-sb-fade\{/);
  assert.match(css, /mask-image:linear-gradient\(90deg,transparent 0%/);
  assert.match(css, /\.agy-sb-beam-layer\{[^}]*pointer-events:none;[^}]*z-index:20/);
  assert.match(css, /agy-sb-plume/);
  assert.match(css, /agy-sb-edge/);
  // Must NEVER override position on native sidebar children (breaks Antigravity's absolute inset-0 row link)
  assert.doesNotMatch(css, /:not\(\.agy-sb-beam-layer\)\{[^}]*position:relative/);
  assert.doesNotMatch(css, /conic-gradient|offset-path|pt-run-head-dot|pt-run-pause-btn/);
  assert.match(css, /data-agy-sb-palette="aurora"/);
  assert.match(css, /data-agy-sb-palette="quota"/);
  assert.equal(context.__agySidebarMonitorHelpers.resolveEffectivePalette({ sidebarRunningBeamPalette: 'sync', composerWorkingBeamPalette: 'aurora' }), 'aurora');
  assert.equal(context.__agySidebarMonitorHelpers.resolveEffectivePalette({ sidebarRunningBeamPalette: 'sync', composerWorkingBeamPalette: 'quota' }), 'quota');
  assert.equal(context.__agySidebarMonitorHelpers.resolveEffectivePalette({ sidebarRunningBeamPalette: 'neon', composerWorkingBeamPalette: 'aurora' }), 'neon');

  const monitor = context.__agySidebarMonitor({
    document,
    adapter: { runningConversations: () => runningList, conversationDirectory: () => ({ byId: {} }) },
    options: () => opts,
    currentId: () => 'c-run',
    sidebarBeamPreview: () => preview,
    navigateToConversation: (id, proj) => navigated.push({ id, proj })
  });

  // Verify sync palette tracks composerWorkingBeamPalette live
  opts = { ...opts, sidebarRunningBeamPalette: 'sync', composerWorkingBeamPalette: 'aurora' };
  monitor.sync(true);
  assert.equal(documentElement.getAttribute('data-agy-sb-palette'), 'aurora');
  opts = { ...opts, composerWorkingBeamPalette: 'neon' };
  monitor.sync();
  assert.equal(documentElement.getAttribute('data-agy-sb-palette'), 'neon');
  opts = { ...opts, sidebarRunningBeamPalette: 'aurora' };
  monitor.sync(true);
  assert.equal(documentElement.getAttribute('data-agy-sb-palette'), 'aurora');
  assert.equal(documentElement.getAttribute('data-agy-sb-hide-spinner'), 'true');
  assert.equal(rowRun.row.dataset.agySbRunning, 'true');
  assert.equal(rowRun.row.dataset.agySbState, 'running');
  assert.equal(rowRun.row.querySelectorAll('[data-agy-powertools-root="sidebar-beam"]').length, 1);
  assert.equal(rowRun.row.querySelectorAll('[data-agy-sb-native-spinner="true"]').length, 1);
  const beamLayer = rowRun.row.querySelector('[data-agy-powertools-root="sidebar-beam"]');
  assert.deepEqual(beamLayer.children.map(el => el.className), ['agy-sb-beam-glow', 'agy-sb-beam-border']);
  assert.equal(beamLayer.children[0].children[0].className, 'agy-sb-fade');
  assert.equal(beamLayer.children[0].children[0].children[0].className, 'agy-sb-slide');
  assert.equal(beamLayer.children[0].children[0].children[0].children[0].className, 'agy-sb-plume');
  assert.equal(beamLayer.children[1].children[0].className, 'agy-sb-fade');
  assert.equal(beamLayer.children[1].children[0].children[0].className, 'agy-sb-slide');
  assert.equal(beamLayer.children[1].children[0].children[0].children[0].className, 'agy-sb-edge');
  // Button "More options" and its inner SVG must NEVER be marked hidden
  assert.equal(rowRun.moreBtn.getAttribute('data-agy-sb-native-spinner'), null);
  assert.equal(rowRun.moreIcon.getAttribute('data-agy-sb-native-spinner'), null);

  assert.equal(rowWait.row.dataset.agySbRunning, 'true');
  assert.equal(rowWait.row.dataset.agySbState, 'waiting');
  assert.equal(rowWait.row.querySelectorAll('[data-agy-sb-native-spinner="true"]').length, 1);

  assert.equal(rowIdle.row.dataset.agySbRunning, undefined);
  assert.equal(rowIdle.row.querySelectorAll('[data-agy-powertools-root="sidebar-beam"]').length, 0);

  // Render RunningGroup and check badges, no pause button, collapse, click navigation, and zero middle dots
  const tree = monitor.RunningGroup();
  const nodes = collectNodes(tree);
  assert.equal(collectText(tree).includes('\u00b7'), false);
  const countNode = nodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-running-count');
  assert.equal(collectText(countNode), '2');
  assert.equal(nodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-beam-pause'), undefined);

  const items = nodes.filter(n => n.props?.['data-testid'] === 'agy-sidebar-running-item');
  assert.equal(items.length, 2);
  assert.equal(items[0].props['data-conversation-id'], 'c-wait');
  assert.equal(items[1].props['aria-current'], 'page');
  items[0].props.onClick({ button: 0, preventDefault() {} });
  assert.deepEqual(navigated, [{ id: 'c-wait', proj: 'p2' }]);

  // Collapse hides the list while keeping header & count
  const toggleBtn = nodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-running-toggle');
  toggleBtn.props.onClick();
  const collapsedTree = monitor.RunningGroup();
  const collapsedNodes = collectNodes(collapsedTree);
  assert.equal(collapsedNodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-running-list'), undefined);
  collapsedNodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-running-toggle').props.onClick();

  // When idle: group hides (returns null), rows lose beam; preview restores both cleanly
  runningList = [];
  monitor.sync(true);
  assert.equal(monitor.RunningGroup(), null);
  assert.equal(rowRun.row.dataset.agySbRunning, undefined);
  assert.equal(rowRun.row.querySelectorAll('[data-agy-powertools-root="sidebar-beam"]').length, 0);

  preview = true;
  monitor.sync(true);
  assert.equal(rowRun.row.dataset.agySbRunning, 'true');
  const previewTree = monitor.RunningGroup();
  assert.ok(collectNodes(previewTree).find(n => n.props?.['data-testid'] === 'agy-run-badge-preview'));

  // Dispose removes everything cleanly
  monitor.dispose();
  assert.equal(documentElement.getAttribute('data-agy-sb-palette'), null);
  assert.equal(documentElement.getAttribute('data-agy-sb-hide-spinner'), null);
  assert.equal(documentElement.getAttribute('data-agy-sb-paused'), null);
  assert.equal(rowRun.row.dataset.agySbRunning, undefined);
  assert.equal(document.head.children.length, 0);
});

test('nativeSource bundles native-sidebar-monitor.js before native-ui.js and native-ui mounts RunningGroup after management nav', () => {
  const bundle = nativeSource('https://127.0.0.1:1234', []);
  const monitorIdx = bundle.indexOf('globalThis.__agySidebarMonitor = createSidebarMonitor');
  const uiIdx = bundle.indexOf('globalThis.__agyPowertools = {');
  assert.ok(monitorIdx > 0, 'native-sidebar-monitor.js should be bundled in nativeSource');
  assert.ok(uiIdx > monitorIdx, 'native-sidebar-monitor.js should load before native-ui.js');

  const { document, makeEl, body } = createMiniDom();
  const nav = makeEl('DIV');
  const customizations = makeEl('A', { attrs: { href: '/customizations' } });
  nav.append(customizations);
  body.append(nav);

  const mountedKinds = [];
  const context = vm.createContext({
    document,
    location: { pathname: '/' },
    AbortController,
    __agyInitialSettings: { enabled: true, sidebarRunningGroup: true, sidebarRunningBeam: true },
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useSyncExternalStore: (_, g) => g(), useState: v => [typeof v === 'function' ? v() : v, () => {}] },
    ReactDOM: {
      createRoot(mount) {
        mountedKinds.push(mount.dataset.agyPowertoolsRoot);
        return { render() {}, unmount() {} };
      }
    },
    HC() {},
    __agyNativeAdapter: { wrap: el => el, installPage: () => true, runningConversations: () => [], conversationDirectory: () => ({ byId: {} }) },
    __agyPanels: () => ({ Page: () => null, Sidebar: () => null, dispose() {} }),
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}
  });
  vm.runInContext(monitorSrc, context);
  vm.runInContext(uiSrc, context);

  assert.ok(mountedKinds.includes('management'));
  assert.ok(mountedKinds.includes('sidebar-running-group'));
  context.__agyPowertools.dispose();
});

test('Settings panel renders sidebar running beam palette, hide-spinner toggle, preview button, and running group toggle without middle dots', () => {
  const panelsSrc = readFileSync(new URL('../lib/native-panels.js', import.meta.url), 'utf8');
  const { document } = createMiniDom();
  const changes = [];
  let previewOn = false;
  const ctx = vm.createContext({
    document,
    URL,
    window: { addEventListener() {}, removeEventListener() {} },
    location: { pathname: '/powertools' },
    React: {
      Fragment: Symbol('Fragment'),
      createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
      useId: () => 'id-1',
      useState: init => [typeof init === 'function' ? init() : init, () => {}],
      useEffect() {},
      useRef: v => ({ current: v }),
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useSyncExternalStore: (_, g) => g()
    },
    B: { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }) },
    HC: ({ children }) => children,
    IC: ({ children }) => children,
    JC: ({ children }) => children,
    KC: ({ children }) => children,
    GC: ({ children }) => children,
    kT: ({ children }) => children,
    lT: ({ children }) => children,
    mT: ({ children }) => children,
    nT: ({ children }) => children,
    Uy: props => ({ type: 'button', props, children: [] }),
    XP: props => ({ type: 'switch', props, children: [] }),
    UP: props => ({ type: 'row', props, children: [props.rightElement, props.extraContent] }),
    TP: ({ children }) => ({ type: 'card', props: {}, children }),
    VP: ({ children }) => ({ type: 'section', props: {}, children }),
    dq: props => ({ type: 'icon', props, children: [] }),
    Sy: ({ children }) => children,
    Wz: ({ children }) => children
  });
  vm.runInContext(panelsSrc, ctx);
  const renderWith = opts => {
    const panels = ctx.__agyPanels({
      adapter: { router: () => ({ navigate() {} }) },
      t: s => s,
      version: '2.16.3',
      defaults: opts,
      project: { name: 'Agy Powertools', githubUrl: 'https://github.com/whitzard0421/agy-powertools', subscriptionUrl: '' },
      options: () => opts,
      settingsError: () => '',
      state: () => ({ contextWindow: { maxTokens: 200000 } }),
      account: () => null,
      dashboard: () => null,
      estimates: () => [],
      capabilities: () => ({ contextSelectionEnabled: false }),
      proxyStatus: () => null,
      accounts: () => null,
      updateNotice: () => null,
      updateInstallState: () => ({ status: 'idle' }),
      consumeExpandUpdateNotes: () => false,
      consumeScrollToAbout: () => false,
      beamPreview: () => false,
      setBeamPreview() {},
      request: async () => ({ status: 'idle' }),
      change: patch => { changes.push(patch); },
      sidebarBeamPreview: () => previewOn,
      setSidebarBeamPreview: v => { previewOn = Boolean(v); },
      subscribe: () => () => {},
      revision: () => 0,
      platform: 'win32'
    });
    const expand = node => {
      if (!node || typeof node !== 'object') return node;
      if (Array.isArray(node)) return node.map(expand);
      if (typeof node.type === 'function') return expand(node.type({ ...(node.props || {}), children: node.children }));
      return { ...node, children: Array.isArray(node.children) ? node.children.map(expand) : node.children };
    };
    return expand(panels.Settings());
  };

  const onTree = renderWith({ enabled: true, language: 'zh-CN', composerWorkingBeamPalette: 'aurora', sidebarRunningBeam: true, sidebarRunningBeamPalette: 'sync', sidebarHideNativeSpinner: true, sidebarRunningGroup: true, sidebarProjectLimit: 0 });
  const onNodes = collectNodes(onTree);
  assert.ok(onNodes.find(n => n.props?.['data-testid'] === 'agy-setting-sidebarRunningBeam'));
  assert.ok(onNodes.find(n => n.props?.['data-testid'] === 'agy-setting-row-sidebarRunningBeamPalette'));
  assert.ok(onNodes.find(n => n.props?.['data-testid'] === 'agy-setting-sidebarHideNativeSpinner'));
  assert.ok(onNodes.find(n => n.props?.['data-testid'] === 'agy-setting-sidebarRunningGroup'));
  assert.equal(onNodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-beam-palette-sync')?.props?.['aria-pressed'], true);
  onNodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-beam-palette-neon').props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(changes)), [{ sidebarRunningBeamPalette: 'neon' }]);
  const prevBtn = onNodes.find(n => n.props?.['data-testid'] === 'agy-sidebar-beam-preview-toggle');
  assert.ok(prevBtn);
  prevBtn.props.onClick();
  assert.equal(previewOn, true);
  assert.equal(collectText(onTree).includes('\u00b7'), false);

  const offTree = renderWith({ enabled: true, language: 'zh-CN', sidebarRunningBeam: false, sidebarRunningBeamPalette: 'gemini', sidebarHideNativeSpinner: true, sidebarRunningGroup: true, sidebarProjectLimit: 0 });
  const offNodes = collectNodes(offTree);
  assert.equal(offNodes.find(n => n.props?.['data-testid'] === 'agy-setting-row-sidebarRunningBeamPalette'), undefined);
  assert.equal(offNodes.find(n => n.props?.['data-testid'] === 'agy-setting-sidebarHideNativeSpinner'), undefined);
  assert.ok(offNodes.find(n => n.props?.['data-testid'] === 'agy-setting-sidebarRunningGroup'));
});

