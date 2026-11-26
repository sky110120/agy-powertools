import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  composerOversizedThresholdBytes,
  composerPathToFileUri,
  findComposerDropTarget,
  installComposerOversizedDrop,
  isComposerExternalFileDrag,
  isComposerSidebarTarget,
  partitionDroppedComposerFiles
} from '../lib/native-composer-drop.mjs';
import { installSidebarFolderDrop } from '../lib/native-sidebar-drop.mjs';
import { nativeSource } from '../lib/native-host.mjs';
import { getLocalePack, SUPPORTED_LANGUAGES } from '../lib/locales/index.mjs';
import { toZhTw } from '../lib/zh-tw.mjs';

const LIMIT = 20 * 1024 * 1024;

function makeTrappedFile({ name, size, mockPath, path, type = 'application/octet-stream' }) {
  const mustNotRead = () => {
    throw new Error(`Must not read oversized file bytes: ${name}`);
  };
  return {
    name,
    size,
    type,
    ...(mockPath !== undefined ? { mockPath } : {}),
    ...(path !== undefined ? { path } : {}),
    arrayBuffer: mustNotRead,
    text: mustNotRead,
    stream: mustNotRead,
    slice: mustNotRead,
    bytes: mustNotRead
  };
}

function makeMockEnv() {
  const docListeners = new Map();
  const winListeners = new Map();
  const dispatchedOnTarget = [];

  class MockDataTransfer {
    constructor() {
      this._files = [];
      this.types = [];
      this.items = {
        add: file => {
          this._files.push(file);
          if (!this.types.includes('Files')) this.types.push('Files');
        }
      };
    }
    get files() {
      return this._files;
    }
  }

  class MockDragEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = Boolean(init.bubbles);
      this.cancelable = Boolean(init.cancelable);
      this.relatedTarget = init.relatedTarget ?? null;
      this.dataTransfer = init.dataTransfer ?? null;
      this.defaultPrevented = false;
    }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() {}
  }

  const sidebar = {
    closest: sel => sel.includes('Sidebar') ? sidebar : null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 260, height: 800, right: 260, bottom: 800 })
  };
  const sidebarAside = {
    closest: sel => sel.includes('aside') ? sidebarAside : null
  };
  const composerBox = {
    closest: sel => sel.includes('agent-input-box') ? composerBox : null,
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 280, top: 620, width: 700, height: 140, right: 980, bottom: 760 }),
    dispatchEvent(evt) {
      dispatchedOnTarget.push(evt);
      if (evt.type === 'drop') {
        for (const fn of [...(docListeners.get('drop') || [])]) void fn({ ...evt, target: composerBox });
      }
      return true;
    }
  };
  const composerInput = {
    closest: sel => (sel.includes('Message input') || sel.includes('agent-input-box')) ? composerBox : null,
    dispatchEvent: evt => composerBox.dispatchEvent(evt)
  };
  const conversationView = {
    closest: sel => sel.includes('conversation-view') ? conversationView : null,
    querySelector: sel => sel.includes('agent-input-box') ? composerBox : null,
    getBoundingClientRect: () => ({ left: 260, top: 0, width: 800, height: 800 })
  };
  const landingMain = {
    closest: sel => sel === 'main' ? landingMain : null,
    querySelector: sel => sel.includes('agent-input-box') ? composerBox : null
  };
  const settingsMain = {
    closest: sel => sel === 'main' ? settingsMain : null,
    querySelector: () => null
  };
  const monacoEl = {
    closest: sel => sel.includes('.monaco-editor') ? monacoEl : null
  };
  const xtermEl = {
    closest: sel => sel.includes('.xterm') ? xtermEl : null
  };
  const dialogWithoutComposer = {
    closest: sel => sel.includes('[role="dialog"]') ? dialogWithoutComposer : null,
    querySelector: () => null
  };
  const fixedOverlayEl = {
    closest: () => null,
    dispatchEvent: evt => composerBox.dispatchEvent(evt)
  };

  const doc = {
    defaultView: {
      DragEvent: MockDragEvent,
      DataTransfer: MockDataTransfer,
      addEventListener(type, fn, opts) {
        if (!winListeners.has(type)) winListeners.set(type, []);
        winListeners.get(type).push(fn);
        opts?.signal?.addEventListener?.('abort', () => {
          const list = winListeners.get(type) || [];
          const i = list.indexOf(fn);
          if (i >= 0) list.splice(i, 1);
        }, { once: true });
      }
    },
    querySelector(sel) {
      if (sel.includes('Sidebar')) return sidebar;
      if (sel.includes('agent-input-box')) return composerBox;
      if (sel.includes('conversation-view')) return conversationView;
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      if (sel.includes('agent-input-box')) out.push(composerBox);
      if (sel.includes('conversation-view')) out.push(conversationView);
      return out;
    },
    addEventListener(type, fn, opts) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
      opts?.signal?.addEventListener?.('abort', () => {
        const list = docListeners.get(type) || [];
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      }, { once: true });
    }
  };

  const fire = async (type, event) => {
    for (const fn of [...(docListeners.get(type) || [])]) await fn(event);
  };
  const fireWin = async (type, event) => {
    for (const fn of [...(winListeners.get(type) || [])]) await fn(event);
  };

  return {
    doc,
    docListeners,
    winListeners,
    dispatchedOnTarget,
    sidebar,
    sidebarAside,
    composerBox,
    composerInput,
    conversationView,
    landingMain,
    settingsMain,
    monacoEl,
    xtermEl,
    dialogWithoutComposer,
    fixedOverlayEl,
    fire,
    fireWin
  };
}

function makeDropEvent({ target, files = [], items, types = ['Files'], clientX, clientY }) {
  let prevented = 0;
  let stopped = 0;
  const event = {
    target,
    ...(clientX !== undefined ? { clientX } : {}),
    ...(clientY !== undefined ? { clientY } : {}),
    dataTransfer: {
      types,
      files,
      ...(items ? { items } : {})
    },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
      prevented++;
    },
    stopPropagation() {
      stopped++;
    },
    get preventedCount() { return prevented; },
    get stoppedCount() { return stopped; }
  };
  return event;
}

test('composerPathToFileUri handles Windows, UNC, POSIX, spaces, hashes, quotes, and Unicode while rejecting invalid paths', () => {
  assert.equal(composerOversizedThresholdBytes(), LIMIT);

  const winUri = composerPathToFileUri('C:\\Users\\Alice\\Videos\\big video #1 "cut" \'v2\' 中文.mp4');
  assert.equal(
    winUri,
    'file:///c%3A/Users/Alice/Videos/big%20video%20%231%20%22cut%22%20\'v2\'%20%E4%B8%AD%E6%96%87.mp4'
  );
  assert.equal(
    fileURLToPath(new URL(winUri), { windows: true }),
    'c:\\Users\\Alice\\Videos\\big video #1 "cut" \'v2\' 中文.mp4'
  );

  const uncUri = composerPathToFileUri('\\\\nas-01\\Media Share\\4K #2 中文.mkv');
  assert.equal(uncUri, 'file://nas-01/Media%20Share/4K%20%232%20%E4%B8%AD%E6%96%87.mkv');
  assert.equal(
    fileURLToPath(new URL(uncUri), { windows: true }),
    '\\\\nas-01\\Media Share\\4K #2 中文.mkv'
  );

  const posixUri = composerPathToFileUri('/Users/alice/Movies/clip #3 (100%) "raw" 中文.mov');
  assert.equal(
    posixUri,
    'file:///Users/alice/Movies/clip%20%233%20(100%25)%20%22raw%22%20%E4%B8%AD%E6%96%87.mov'
  );
  assert.equal(
    fileURLToPath(new URL(posixUri), { windows: false }),
    '/Users/alice/Movies/clip #3 (100%) "raw" 中文.mov'
  );

  assert.equal(
    composerPathToFileUri('file:///C:/Users/Alice/big%20file%20%231.bin'),
    'file:///c%3A/Users/Alice/big%20file%20%231.bin'
  );
  assert.equal(
    composerPathToFileUri('file://localhost/Users/alice/big.bin'),
    'file:///Users/alice/big.bin'
  );

  for (const invalid of ['', '   ', 'relative/big.bin', 'C:', 'C:\\', '/', 'D:file.bin', '\\\\.\\pipe\\x', '\\\\?\\C:\\big.bin', '//host', '/tmp/bad\u0000.bin']) {
    assert.equal(composerPathToFileUri(invalid), '', `expected empty URI for ${JSON.stringify(invalid)}`);
  }
});

test('partitionDroppedComposerFiles enforces strict > 20 MB threshold, skips directories, avoids reading bytes, and separates unresolvable paths', () => {
  const exactLimit = makeTrappedFile({ name: 'exact-20mb.bin', size: LIMIT, mockPath: '/tmp/exact-20mb.bin' });
  const overByOne = makeTrappedFile({ name: 'over-20mb.bin', size: LIMIT + 1, mockPath: '/tmp/over 20mb #1.bin' });
  const duplicateOver = makeTrappedFile({ name: 'over-20mb-dup.bin', size: LIMIT + 100, mockPath: '/tmp/over 20mb #1.bin' });
  const fallbackPathFile = makeTrappedFile({ name: 'fallback.mp4', size: LIMIT + 5000, path: 'C:\\Media\\fallback.mp4' });
  const noPathBlob = makeTrappedFile({ name: 'blob.bin', size: LIMIT + 5000 });
  const bigDir = makeTrappedFile({ name: 'folder', size: LIMIT + 9999, mockPath: '/tmp/folder' });

  const result = partitionDroppedComposerFiles({
    files: [exactLimit, overByOne, duplicateOver, fallbackPathFile, noPathBlob, bigDir],
    items: [
      { kind: 'string' },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, isFile: true }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, isFile: true }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, isFile: true }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, isFile: true }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, isFile: true }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }) }
    ]
  }, {
    getPathForFile: f => f.mockPath || ''
  });

  assert.deepEqual(result.normalFiles, [exactLimit, bigDir]);
  assert.deepEqual(result.unresolvedOversized, [noPathBlob]);
  assert.equal(result.oversizedRefs.length, 2);
  assert.equal(result.oversizedRefs[0].uri, 'file:///tmp/over%2020mb%20%231.bin');
  assert.equal(result.oversizedRefs[0].path, '/tmp/over 20mb #1.bin');
  assert.equal(result.oversizedRefs[1].uri, 'file:///c%3A/Media/fallback.mp4');
  assert.equal(result.oversizedRefs[1].path, 'C:\\Media\\fallback.mp4');

  assert.equal(isComposerExternalFileDrag({ types: ['Files'] }, false), true);
  assert.equal(isComposerExternalFileDrag({ types: ['Files'] }, true), false);
  assert.equal(isComposerExternalFileDrag({ types: ['text/plain'], files: [] }, false), false);
});

test('installComposerOversizedDrop leaves <= 20 MB drops untouched and intercepts single/multiple > 20 MB drops without reading bytes', async () => {
  const env = makeMockEnv();
  const inserted = [];
  const forwarded = [];
  const notifications = [];
  const controller = new AbortController();

  installComposerOversizedDrop(env.doc, {
    enabled: () => true,
    isSupported: () => true,
    getPathForFile: f => f.mockPath || '',
    insertReferences: async (entries, target) => { inserted.push({ entries, target }); },
    forwardNormalFiles: async (files, target) => { forwarded.push({ files, target }); return { ok: true, count: files.length }; },
    text: (_zh, en) => en,
    notify: payload => notifications.push(payload),
    signal: controller.signal
  });

  // 1. Normal files (<= 20 MB, including exact 20 MB) are NOT intercepted
  const normalEv = makeDropEvent({
    target: env.composerInput,
    files: [
      makeTrappedFile({ name: 'photo.png', size: 2 * 1024 * 1024, mockPath: '/tmp/photo.png' }),
      makeTrappedFile({ name: 'exact.zip', size: LIMIT, mockPath: '/tmp/exact.zip' })
    ]
  });
  await env.fire('drop', normalEv);
  assert.equal(normalEv.preventedCount, 0);
  assert.equal(normalEv.stoppedCount, 0);
  assert.equal(inserted.length, 0);
  assert.equal(forwarded.length, 0);
  assert.equal(notifications.length, 0);

  // 2. Single oversized file (> 20 MB) with spaces, hash, Unicode
  const singleEv = makeDropEvent({
    target: env.composerInput,
    files: [
      makeTrappedFile({
        name: 'demo #1 中文.mp4',
        size: LIMIT + 1024,
        mockPath: 'C:\\Users\\Alice\\Videos\\demo #1 中文.mp4'
      })
    ]
  });
  await env.fire('drop', singleEv);
  assert.equal(singleEv.preventedCount, 1);
  assert.equal(singleEv.stoppedCount, 1);
  assert.equal(forwarded.length, 0);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].target, env.composerBox);
  assert.equal(inserted[0].entries.length, 1);
  assert.equal(
    inserted[0].entries[0].uri,
    'file:///c%3A/Users/Alice/Videos/demo%20%231%20%E4%B8%AD%E6%96%87.mp4'
  );
  assert.deepEqual(notifications.at(-1), {
    title: 'Large file inserted as reference',
    message: 'demo #1 中文.mp4',
    tag: 'agy-composer-oversized-drop'
  });
  // Native drag overlay dismissal events fired without re-triggering interception
  assert.ok(env.dispatchedOnTarget.some(e => e.type === 'dragleave'));
  assert.ok(env.dispatchedOnTarget.some(e => e.type === 'drop' && e.dataTransfer?.files?.length === 0));

  // 3. Multiple oversized files (> 20 MB) across UNC and POSIX paths
  const multiEv = makeDropEvent({
    target: env.conversationView,
    files: [
      makeTrappedFile({ name: 'dataset.parquet', size: 45 * 1024 * 1024, mockPath: '/data/team/dataset.parquet' }),
      makeTrappedFile({ name: 'raw #2.mkv', size: 120 * 1024 * 1024, mockPath: '\\\\nas\\share\\raw #2.mkv' })
    ]
  });
  await env.fire('drop', multiEv);
  assert.equal(multiEv.preventedCount, 1);
  assert.equal(inserted.length, 2);
  assert.deepEqual(
    inserted[1].entries.map(e => e.uri),
    ['file:///data/team/dataset.parquet', 'file://nas/share/raw%20%232.mkv']
  );
  assert.deepEqual(notifications.at(-1), {
    title: 'Large files inserted as references',
    message: 'dataset.parquet, raw #2.mkv',
    tag: 'agy-composer-oversized-drop'
  });

  controller.abort();
});

test('installComposerOversizedDrop handles mixed drops (normal + oversized), synthetic fallback, and unresolvable paths', async () => {
  const env = makeMockEnv();
  const inserted = [];
  const forwarded = [];
  let forwardShouldSucceed = true;
  const controller = new AbortController();

  installComposerOversizedDrop(env.doc, {
    enabled: () => true,
    isSupported: () => true,
    getPathForFile: f => f.mockPath || '',
    insertReferences: async (entries, target) => { inserted.push({ entries, target }); },
    forwardNormalFiles: async (files, target) => {
      forwarded.push({ files, target });
      return forwardShouldSucceed ? { ok: true, count: files.length } : { ok: false, count: 0 };
    },
    text: (_zh, en) => en,
    signal: controller.signal
  });

  // 1. Mixed drop: 1 normal file + 1 oversized file -> normal forwarded, oversized inserted as ref
  const smallImg = makeTrappedFile({ name: 'chart.png', size: 512 * 1024, mockPath: '/tmp/chart.png' });
  const bigVideo = makeTrappedFile({ name: 'recording.mp4', size: 35 * 1024 * 1024, mockPath: '/tmp/recording.mp4' });
  const mixedEv = makeDropEvent({ target: env.composerInput, files: [smallImg, bigVideo] });
  await env.fire('drop', mixedEv);
  assert.equal(mixedEv.preventedCount, 1);
  assert.equal(mixedEv.stoppedCount, 1);
  assert.equal(forwarded.length, 1);
  assert.deepEqual(forwarded[0].files, [smallImg]);
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0].entries.map(e => e.uri), ['file:///tmp/recording.mp4']);

  // 2. Unresolvable oversized file alone (no path) falls through untouched without swallowing
  const blobOnlyEv = makeDropEvent({
    target: env.composerInput,
    files: [makeTrappedFile({ name: 'blob.bin', size: 50 * 1024 * 1024 })]
  });
  await env.fire('drop', blobOnlyEv);
  assert.equal(blobOnlyEv.preventedCount, 0);
  assert.equal(blobOnlyEv.stoppedCount, 0);
  assert.equal(inserted.length, 1);
  assert.equal(forwarded.length, 1);

  // 3. Mixed drop when forwardNormalFiles returns { ok: false } -> falls back to guarded synthetic drop with only normal files
  forwardShouldSucceed = false;
  env.dispatchedOnTarget.length = 0;
  const smallDoc = makeTrappedFile({ name: 'spec.pdf', size: 1024 * 1024, mockPath: '/tmp/spec.pdf' });
  const bigArchive = makeTrappedFile({ name: 'dump.tar.gz', size: 80 * 1024 * 1024, mockPath: '/tmp/dump.tar.gz' });
  const fallbackEv = makeDropEvent({ target: env.composerInput, files: [smallDoc, bigArchive] });
  await env.fire('drop', fallbackEv);
  assert.equal(fallbackEv.preventedCount, 1);
  const syntheticDrop = env.dispatchedOnTarget.find(e => e.type === 'drop');
  assert.ok(syntheticDrop, 'expected synthetic drop fallback for normal files');
  assert.deepEqual(syntheticDrop.dataTransfer.files, [smallDoc]);
  assert.equal(inserted.length, 2);
  assert.deepEqual(inserted[1].entries.map(e => e.uri), ['file:///tmp/dump.tar.gz']);

  controller.abort();
});

test('installComposerOversizedDrop isolates sidebar, non-composer areas, disabled/SSH/internal states, and cleans up on AbortSignal', async () => {
  const env = makeMockEnv();
  const inserted = [];
  const sidebarCreated = [];
  let enabled = true;
  let supported = true;
  let canInsert = true;
  const controller = new AbortController();

  // Coexistence with installSidebarFolderDrop on the exact same document
  installSidebarFolderDrop(env.doc, {
    enabled: () => true,
    isSupported: () => true,
    pinProject: () => false,
    text: (_zh, en) => en,
    getPathForFile: f => f.mockPath || '',
    createProjects: async entries => {
      sidebarCreated.push(entries);
      return { created: [], existing: [], skippedFiles: entries.length, pinned: false };
    },
    signal: controller.signal
  });

  installComposerOversizedDrop(env.doc, {
    enabled: () => enabled,
    isSupported: () => supported,
    canInsertReference: () => canInsert,
    getPathForFile: f => f.mockPath || '',
    insertReferences: async entries => { inserted.push(entries); },
    text: (_zh, en) => en,
    signal: controller.signal
  });

  const bigFile = () => makeTrappedFile({ name: 'big.bin', size: 30 * 1024 * 1024, mockPath: '/tmp/big.bin' });

  // 1. Sidebar targets (Sidebar nav, aside, coordinates inside sidebar) are NOT intercepted by composer drop
  assert.equal(isComposerSidebarTarget(env.doc, env.sidebar, {}), true);
  assert.equal(isComposerSidebarTarget(env.doc, env.sidebarAside, {}), true);
  assert.equal(isComposerSidebarTarget(env.doc, env.fixedOverlayEl, { clientX: 100, clientY: 100 }), true);
  assert.equal(findComposerDropTarget(env.doc, env.sidebar, {}), null);
  assert.equal(findComposerDropTarget(env.doc, env.sidebarAside, {}), null);

  const sidebarDrop = makeDropEvent({ target: env.sidebar, files: [bigFile()], clientX: 120, clientY: 200 });
  await env.fire('drop', sidebarDrop);
  assert.equal(inserted.length, 0);
  assert.equal(sidebarCreated.length, 1);

  const asideDrop = makeDropEvent({ target: env.sidebarAside, files: [bigFile()] });
  await env.fire('drop', asideDrop);
  assert.equal(asideDrop.preventedCount, 0);
  assert.equal(inserted.length, 0);

  // 2. Non-composer surfaces (Monaco, terminal, non-composer dialog, settings main) are NOT intercepted
  for (const excludedTarget of [env.monacoEl, env.xtermEl, env.dialogWithoutComposer, env.settingsMain]) {
    const ev = makeDropEvent({ target: excludedTarget, files: [bigFile()] });
    await env.fire('drop', ev);
    assert.equal(ev.preventedCount, 0);
  }
  assert.equal(inserted.length, 0);

  // 3. Landing page main containing composer & fixed overlay over composer coordinates ARE accepted
  const landingEv = makeDropEvent({ target: env.landingMain, files: [bigFile()] });
  await env.fire('drop', landingEv);
  assert.equal(landingEv.preventedCount, 1);
  assert.equal(inserted.length, 1);

  const overlayEv = makeDropEvent({ target: env.fixedOverlayEl, files: [bigFile()], clientX: 400, clientY: 660 });
  await env.fire('drop', overlayEv);
  assert.equal(overlayEv.preventedCount, 1);
  assert.equal(inserted.length, 2);

  // 4. Disabled -> NOT intercepted
  enabled = false;
  const disabledEv = makeDropEvent({ target: env.composerInput, files: [bigFile()] });
  await env.fire('drop', disabledEv);
  assert.equal(disabledEv.preventedCount, 0);
  enabled = true;

  // 5. Unsupported (e.g. SSH remote window) -> NOT intercepted
  supported = false;
  const sshEv = makeDropEvent({ target: env.composerInput, files: [bigFile()] });
  await env.fire('drop', sshEv);
  assert.equal(sshEv.preventedCount, 0);
  supported = true;

  // 6. canInsertReference === false (native mention hook unavailable) -> fail-open
  canInsert = false;
  const noHookEv = makeDropEvent({ target: env.composerInput, files: [bigFile()] });
  await env.fire('drop', noHookEv);
  assert.equal(noHookEv.preventedCount, 0);
  canInsert = true;

  // 7. Internal dragstart suppresses interception until dragend/blur
  await env.fire('dragstart', {});
  const internalEv = makeDropEvent({ target: env.composerInput, files: [bigFile()] });
  await env.fire('drop', internalEv);
  assert.equal(internalEv.preventedCount, 0);
  await env.fireWin('blur', {});

  // 8. AbortSignal removes all listeners cleanly
  controller.abort();
  assert.equal(env.docListeners.get('drop')?.length, 0);
  assert.equal(env.docListeners.get('dragstart')?.length, 0);
  assert.equal(env.docListeners.get('dragend')?.length, 0);
  assert.equal(env.winListeners.get('blur')?.length, 0);
});

test('native-client exposes canAttachMention and attachFilesToComposer and nativeSource bundles native-composer-drop cleanly', async () => {
  // 1. Verify native-client.js helpers work with MUa, Gy+Shd fallback, and box.attachFiles
  const attachedBatches = [];
  const fileMentions = [];
  const scopeMentions = [];
  let focused = 0;
  const editor = { focus() { focused++; } };
  const box = {
    lexicalRef: { current: editor },
    async attachFiles(files) { attachedBatches.push(files); },
    getInputCardElement: () => ({ scrollIntoView() {} })
  };
  const inputBoxEl = {
    '__reactFiber$ib': {
      tag: 10,
      memoizedProps: { value: { inputBoxRef: { current: box }, getLexicalEditor: () => editor } },
      return: null
    }
  };
  const ctx = vm.createContext({
    document: {
      activeElement: null,
      querySelector: sel => sel.includes('agent-input-box') ? inputBoxEl : null
    },
    MUa: (ed, uri) => fileMentions.push({ ed, uri }),
    Shd: (kind, uri) => ({ kind, uri }),
    Gy: (ed, item) => scopeMentions.push({ ed, item })
  });
  vm.runInContext(readFileSync(new URL('../lib/native-client.js', import.meta.url), 'utf8'), ctx);
  const adapter = ctx.__agyNativeAdapter;

  assert.equal(adapter.canAttachMention(inputBoxEl), true);
  const f1 = { name: 'a.png', size: 100 };
  const f2 = { name: 'b.pdf', size: 200 };
  const batchRes = await adapter.attachFilesToComposer([f1, f2], inputBoxEl);
  assert.deepEqual({ ...batchRes }, { ok: true, count: 2 });
  assert.equal(attachedBatches.length, 1);
  assert.deepEqual(attachedBatches[0], [f1, f2]);

  await adapter.attachFileToComposer({
    mode: 'mention',
    kind: 'file',
    uri: 'file:///c%3A/Users/me/big%20video%20%231.mp4',
    name: 'big video #1.mp4',
    oversized: true
  }, inputBoxEl);
  assert.deepEqual(fileMentions, [{ ed: editor, uri: 'file:///c%3A/Users/me/big%20video%20%231.mp4' }]);
  assert.equal(focused, 2);

  // 2. Verify nativeSource() bundles native-composer-drop.mjs before native-ui.js with valid JS syntax (no collisions)
  const bundle = nativeSource('https://127.0.0.1:1234', []);
  assert.doesNotThrow(() => new vm.Script(bundle), 'nativeSource bundle must parse cleanly');
  const composerDropIdx = bundle.indexOf('function installComposerOversizedDrop(');
  const sidebarDropIdx = bundle.indexOf('function installSidebarFolderDrop(');
  const uiIdx = bundle.indexOf('installComposerOversizedDrop(document,');
  assert.ok(sidebarDropIdx > 0, 'native-sidebar-drop.mjs should be bundled');
  assert.ok(composerDropIdx > sidebarDropIdx, 'native-composer-drop.mjs should be bundled after sidebar drop');
  assert.ok(uiIdx > composerDropIdx, 'native-ui.js wiring should appear after native-composer-drop.mjs');

  // 3. Verify no forbidden middle dots or simplified-only glyphs after toZhTw and 9-language pack parity
  const src = readFileSync(new URL('../lib/native-composer-drop.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /[\u00b7\u2022\u2027\u30fb]/u);
  const simplifiedOnly = /[万与个为义于产仅从仓们价优会传体余侧关内写准减凑凭击划则刚创删务动区协单占却历压参发变号后听启周响唤围图圆场声处备头夹实审对导将尝尽层带帮并广库应开异强归当录径忆态总战执扩扬抢护报担拦择挂换据数断无旧时昵显暂机权条来栏树样档检汇没洁浅测浏滚满点热状独环现电监盘码确碍离积称稳筛签简类紧级线组细织终结给络绝统继续缓编缩网联脑范营补装观规视览触计订认让议记许设访证识诊试话询该详语误说请读调败账费资转轮软载较辅辑输边过运这进远违连迟适选遥邮采钟钥钮链销错键长闭问闲间阅队阶际险随隐静页顶项顺顿预频题额风馈驻验骤麦标彻]/;
  assert.equal(toZhTw(src).match(simplifiedOnly), null);

  for (const lang of SUPPORTED_LANGUAGES) {
    const pack = getLocalePack(lang);
    if (!pack) continue;
    for (const key of ['Large file inserted as reference', 'Large files inserted as references', 'Failed to attach file']) {
      assert.ok((pack.entries[key] || pack.uiEntries[key])?.trim(), `${lang} missing translation for ${key}`);
    }
  }
});

test('native-ui wires installComposerOversizedDrop respecting options.enabled, SSH isolation, getPathForFile fallback, and dispose abort', async () => {
  const uiCode = readFileSync(new URL('../lib/native-ui.js', import.meta.url), 'utf8');
  let capturedOpts = null;
  let installs = 0;
  const attachedMentions = [];
  const attachedBatches = [];
  const settings = { enabled: true };
  let changeSettings = null;

  const makeEl = () => ({
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    removeAttribute() {},
    toggleAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    append() {},
    appendChild() {},
    remove() {},
    querySelector: () => null,
    querySelectorAll: () => []
  });
  const doc = {
    readyState: 'complete',
    title: 'Antigravity',
    head: makeEl(),
    body: makeEl(),
    documentElement: makeEl(),
    createElement: makeEl,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {}
  };
  const ctx = vm.createContext({
    document: doc,
    window: { addEventListener() {}, removeEventListener() {}, innerWidth: 1280, innerHeight: 800 },
    location: { pathname: '/c/conv-1', search: '', origin: 'https://127.0.0.1:1234' },
    MutationObserver: class { observe() {} disconnect() {} },
    AbortController,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval() {},
    queueMicrotask,
    React: { createElement: () => null, useState: v => [v, () => {}], useEffect() {}, useRef: v => ({ current: v }) },
    ReactDOM: { createRoot: () => ({ render() {}, unmount() {} }) },
    HC() {},
    electronNative: { getPathForFile: f => f?.mockPath || '' },
    __agyInitialSettings: settings,
    __agyDefaultSettings: { enabled: true, language: 'en' },
    __agyLanguages: { en: 'English' },
    __agyNativeAdapter: {
      active: true,
      wrap: el => el,
      installPage: () => true,
      capabilities: () => ({}),
      onEditChange: () => () => {},
      onLoginSessionChange: () => () => {},
      subscribeStore: () => () => {},
      setEnabled() {},
      setContextLimit() {},
      setStageUpdates() {},
      setEfficientIO() {},
      setSidebarProjectLimit() {},
      ensureRequestHook() {},
      canAttachMention: () => true,
      attachFileToComposer: async (info, sourceEl) => { attachedMentions.push({ info, sourceEl }); return { ok: true }; },
      attachFilesToComposer: async (files, sourceEl) => { attachedBatches.push({ files, sourceEl }); return { ok: true, count: files.length }; }
    },
    __agyPanels: env => { changeSettings = env.change; return { Page: () => null, Sidebar: () => null, dispose() {} }; },
    __agyPowertoolsHost: raw => {
      const { id, method, settings: patch } = JSON.parse(raw);
      if (method === 'settings.set') Object.assign(settings, patch);
      queueMicrotask(() => ctx.__agyPowertoolsReceive?.(id, { ...settings }));
    },
    installComposerOversizedDrop: (_doc, opts) => { capturedOpts = opts; installs++; }
  });
  vm.runInContext(uiCode, ctx);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(installs, 1);
  assert.ok(capturedOpts);
  assert.equal(capturedOpts.enabled(), true);
  assert.equal(capturedOpts.isSupported(), true);
  assert.equal(capturedOpts.getPathForFile({ mockPath: 'C:\\big.mp4' }), 'C:\\big.mp4');
  assert.equal(capturedOpts.getPathForFile({ path: '/fallback/big.mp4' }), '/fallback/big.mp4');
  assert.equal(capturedOpts.canInsertReference({}), true);

  await capturedOpts.insertReferences([{ uri: 'file:///c%3A/big.mp4', path: 'C:\\big.mp4', name: 'big.mp4', size: LIMIT + 1 }], 'composer-anchor');
  assert.equal(attachedMentions.length, 1);
  assert.equal(attachedMentions[0].info.mode, 'mention');
  assert.equal(attachedMentions[0].info.uri, 'file:///c%3A/big.mp4');
  assert.equal(attachedMentions[0].sourceEl, 'composer-anchor');

  await capturedOpts.forwardNormalFiles([{ name: 'small.png', size: 100 }], 'composer-anchor');
  assert.equal(attachedBatches.length, 1);
  assert.equal(attachedBatches[0].files[0].name, 'small.png');

  ctx.sshRemote = { kind: 'ssh' };
  assert.equal(capturedOpts.isSupported(), false);
  ctx.sshRemote = { kind: 'local' };
  assert.equal(capturedOpts.isSupported(), true);

  await changeSettings({ enabled: false });
  assert.equal(capturedOpts.enabled(), false);
  await changeSettings({ enabled: true });
  assert.equal(capturedOpts.enabled(), true);

  assert.equal(capturedOpts.signal.aborted, false);
  ctx.__agyPowertools.dispose();
  assert.equal(capturedOpts.signal.aborted, true);
});
