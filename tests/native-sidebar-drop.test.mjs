import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDroppedEntries,
  findExistingLocalProject,
  findProjectHeaderElement,
  folderBaseName,
  highlightProjectInSidebar,
  installSidebarFolderDrop,
  isExternalFileDrag,
  localPathToFileUri,
  mergePinnedProjectIds,
  normalizeFolderUri,
  scrollVirtualizedSidebarToProject,
  uniqueProjectName
} from '../lib/native-sidebar-drop.mjs';

test('localPathToFileUri and normalizeFolderUri handle POSIX, spaces/hashes, Windows drives, and UNC paths', () => {
  assert.equal(localPathToFileUri('/fixtures/team/my dir#1/'), 'file:///fixtures/team/my%20dir%231');
  assert.equal(localPathToFileUri('/fixtures/team/中文项目'), 'file:///fixtures/team/%E4%B8%AD%E6%96%87%E9%A1%B9%E7%9B%AE');
  for (const path of ['C:', 'D:folder', '\\\\.\\pipe\\fixture', '\\\\?\\C:\\fixture', '//host']) {
    assert.equal(localPathToFileUri(path), '');
  }
  assert.equal(localPathToFileUri('/'), 'file:///');
  assert.equal(localPathToFileUri('relative/dir'), '');
  assert.equal(localPathToFileUri('C:\\Fixtures\\Team\\My App\\'), 'file:///c%3A/Fixtures/Team/My%20App');
  assert.equal(localPathToFileUri('D:\\'), 'file:///d%3A/');
  assert.equal(localPathToFileUri('\\\\fileserver\\Team Share\\proj'), 'file://fileserver/Team%20Share/proj');

  assert.equal(
    normalizeFolderUri('file:///C:/Fixtures/Team/My App/'),
    normalizeFolderUri('file:///c%3A/Fixtures/Team/My%20App')
  );
  assert.equal(
    normalizeFolderUri('file://localhost/fixtures/team/app/'),
    'file:///fixtures/team/app'
  );
});

test('folderBaseName and uniqueProjectName disambiguate duplicate names with parent path then numeric suffix', () => {
  assert.equal(folderBaseName('file:///fixtures/team/work/my%20app'), 'my app');
  assert.equal(folderBaseName('file:///'), 'workspace');
  assert.equal(folderBaseName('file:///d%3A/'), 'D');

  const existing = [
    { project: { id: 'p1', name: 'app' } },
    { project: { id: 'p2', name: 'work/app' } }
  ];
  assert.equal(uniqueProjectName('file:///fixtures/team/other/app', existing), 'other/app');
  assert.equal(uniqueProjectName('file:///fixtures/team/work/app', existing), 'team/work/app');

  const completelyTaken = [
    { project: { id: 'p1', name: 'app' } },
    { project: { id: 'p2', name: 'work/app' } },
    { project: { id: 'p3', name: 'app (2)' } }
  ];
  assert.equal(uniqueProjectName('file:///work/app', completelyTaken), 'app (3)');
});

test('findExistingLocalProject matches normalized local folderUri and gitFolder while skipping cloud projects', () => {
  const projects = [
    { project: { id: 'cloud-1', backendType: 2, projectResources: { resources: [{ type: { case: 'folderUri', value: 'file:///fixtures/team/repo' } }] } } },
    { project: { id: 'multi-1', backendType: 1, projectResources: { resources: [{ type: { case: 'folderUri', value: 'file:///fixtures/team/repo' } }, { type: { case: 'folderUri', value: 'file:///fixtures/team/other' } }] } } },
    { project: { id: 'archived-1', archived: true, backendType: 1, projectResources: { resources: [{ type: { case: 'gitFolder', value: { folderUri: 'file:///fixtures/team/old-repo/' } } }] } } },
    { project: { id: 'active-1', archived: false, backendType: 1, projectResources: { resources: [{ type: { case: 'gitFolder', value: { folderUri: 'file:///fixtures/team/repo/' } } }] } } }
  ];
  assert.equal(findExistingLocalProject('file:///fixtures/team/repo', projects)?.project?.id, 'active-1');
  assert.equal(findExistingLocalProject('file:///fixtures/team/old-repo', projects)?.project?.id, 'archived-1');
  assert.equal(findExistingLocalProject('file:///fixtures/team/new-repo', projects), null);
});

test('isExternalFileDrag and extractDroppedEntries filter internal drags and extract entries synchronously', () => {
  assert.equal(isExternalFileDrag({ types: ['Files'] }, false), true);
  assert.equal(isExternalFileDrag({ types: { contains: t => t === 'Files' } }, false), true);
  assert.equal(isExternalFileDrag({ types: ['Files'] }, true), false);
  assert.equal(isExternalFileDrag({ types: ['text/plain'] }, false), false);

  const entries = extractDroppedEntries({
    files: [
      { name: 'proj-a' },
      { name: 'proj-a-dup' },
      { name: 'notes.txt' }
    ],
    items: [
      { kind: 'string' },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, isFile: true }) }
    ]
  }, file => file.name.startsWith('proj-a') ? '/fixtures/team/proj-a' : '/fixtures/team/notes.txt');

  assert.deepEqual(entries, [
    { path: '/fixtures/team/proj-a', name: 'proj-a', entryIsDir: true, entryIsFile: false },
    { path: '/fixtures/team/notes.txt', name: 'notes.txt', entryIsDir: false, entryIsFile: true }
  ]);
});

test('installSidebarFolderDrop manages overlay lifecycle, ignores non-sidebar/internal/SSH drags, and notifies drop results', async () => {
  const docListeners = new Map();
  const winListeners = new Map();
  const makeEl = tag => {
    const el = {
      tagName: String(tag).toUpperCase(),
      dataset: {},
      style: {},
      children: [],
      textContent: '',
      isConnected: false,
      append(...nodes) { for (const n of nodes) { n.isConnected = true; this.children.push(n); } },
      remove() {
        this.isConnected = false;
        const idx = body.children.indexOf(this);
        if (idx >= 0) body.children.splice(idx, 1);
      }
    };
    return el;
  };
  const body = makeEl('body');
  body.isConnected = true;
  const sidebarChild = { closest: sel => sel.includes('Sidebar') ? sidebar : null };
  const sidebar = {
    contains: node => node === sidebar || node === sidebarChild,
    closest: sel => sel.includes('Sidebar') ? sidebar : null,
    getBoundingClientRect: () => ({ left: 0, top: 38, width: 256, height: 640 })
  };
  const composerEl = { closest: () => null };
  const doc = {
    body,
    defaultView: {
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
    createElement: makeEl,
    querySelector: sel => sel.includes('Sidebar') ? sidebar : null,
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

  let enabled = true;
  let supported = true;
  let pin = false;
  let createImpl = async entries => ({ created: [{ id: 'p1', name: entries[0]?.name || 'demo' }], existing: [], skippedFiles: 0, pinned: pin });
  const createdBatches = [];
  const highlightCalls = [];
  let highlightCancelled = 0;
  const notifications = [];
  const controller = new AbortController();

  installSidebarFolderDrop(doc, {
    enabled: () => enabled,
    isSupported: () => supported,
    pinProject: () => pin,
    text: (zh, en) => en,
    getPathForFile: f => f.mockPath || '',
    createProjects: async (entries, opts) => {
      createdBatches.push({ entries, opts });
      return createImpl(entries, opts);
    },
    highlightProjects: (targets, opts) => {
      highlightCalls.push({ targets, opts });
      return () => { highlightCancelled++; };
    },
    notify: msg => notifications.push(msg),
    signal: controller.signal
  });

  // 1. Drag over composer (outside sidebar) is NOT intercepted and shows NO overlay
  let prevented = 0;
  await fire('dragover', {
    target: composerEl,
    clientX: 400,
    clientY: 400,
    dataTransfer: { types: ['Files'], dropEffect: 'none' },
    preventDefault: () => prevented++,
    stopPropagation: () => {}
  });
  assert.equal(prevented, 0);
  assert.equal(body.children.length, 0);

  // 2. Drag over sidebar shows overlay and sets dropEffect = 'copy'
  const dtOver = { types: ['Files'], dropEffect: 'none' };
  await fire('dragover', {
    target: sidebarChild,
    clientX: 120,
    clientY: 200,
    dataTransfer: dtOver,
    preventDefault: () => prevented++,
    stopPropagation: () => {}
  });
  assert.equal(prevented, 1);
  assert.equal(dtOver.dropEffect, 'copy');
  assert.equal(body.children.length, 1);
  assert.equal(body.children[0].dataset.testid, 'agy-sidebar-drop-overlay');
  assert.equal(body.children[0].children[0].textContent, 'Drop folder to create project');

  // When pinProject is enabled, overlay badge reflects pinning
  pin = true;
  await fire('dragover', {
    target: sidebarChild,
    clientX: 120,
    clientY: 200,
    dataTransfer: dtOver,
    preventDefault: () => prevented++,
    stopPropagation: () => {}
  });
  assert.equal(body.children[0].children[0].textContent, 'Drop folder to create and pin project');
  pin = false;

  // 3. Dragleave to outside sidebar hides overlay
  await fire('dragleave', { target: sidebar, relatedTarget: composerEl });
  assert.equal(body.children.length, 0);

  // 4. Internal dragstart suppresses external drop interception until dragend
  await fire('dragstart', { target: sidebarChild });
  await fire('dragover', {
    target: sidebarChild,
    clientX: 100,
    clientY: 100,
    dataTransfer: { types: ['Files'], dropEffect: 'none' },
    preventDefault: () => prevented++,
    stopPropagation: () => {}
  });
  assert.equal(prevented, 2);
  assert.equal(body.children.length, 0);
  await fire('dragend', {});

  // 5. Dropping a folder on sidebar creates project, highlights it, and sends success toast
  await fire('drop', {
    target: sidebarChild,
    clientX: 100,
    clientY: 100,
    dataTransfer: {
      types: ['Files'],
      files: [{ name: 'my-app', mockPath: '/fixtures/team/my-app' }],
      items: [{ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }) }]
    },
    preventDefault: () => prevented++,
    stopPropagation: () => {}
  });
  assert.equal(prevented, 3);
  assert.equal(createdBatches.length, 1);
  assert.equal(createdBatches[0].entries[0].path, '/fixtures/team/my-app');
  assert.deepEqual(createdBatches[0].opts, { pin: false });
  assert.equal(highlightCalls.length, 1);
  assert.deepEqual(highlightCalls[0].targets, [{ id: 'p1', name: 'my-app' }]);
  assert.equal(highlightCalls[0].opts.pinned, false);
  assert.deepEqual(notifications.at(-1), { title: 'Project created', message: 'my-app', tag: 'agy-sidebar-drop-project' });

  // 6. Dropping multiple folders with auto-pin -> pinned summary notification & pinned highlight
  pin = true;
  createImpl = async () => ({ created: [{ id: '1', name: 'a' }, { id: '2', name: 'b' }], existing: [], skippedFiles: 0, pinned: true, target: { id: '2', name: 'b' } });
  await fire('drop', {
    target: sidebarChild,
    dataTransfer: {
      types: ['Files'],
      files: [{ name: 'a', mockPath: '/fixtures/team/a' }, { name: 'b', mockPath: '/fixtures/team/b' }],
      items: [
        { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }) },
        { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, isFile: false }) }
      ]
    },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.deepEqual(createdBatches.at(-1).opts, { pin: true });
  assert.equal(highlightCancelled, 1);
  assert.equal(highlightCalls.at(-1).opts.pinned, true);
  assert.deepEqual(highlightCalls.at(-1).opts.primary, { id: '2', name: 'b' });
  assert.equal(notifications.at(-1).title, 'Created and pinned 2 projects');
  assert.equal(notifications.at(-1).message, 'a, b');

  // 7. Dropping existing folder -> located / pinned notifications
  pin = false;
  createImpl = async () => ({ created: [], existing: [{ id: '1', name: 'a' }], skippedFiles: 0, pinned: false });
  await fire('drop', {
    target: sidebarChild,
    dataTransfer: { types: ['Files'], files: [{ name: 'a', mockPath: '/fixtures/team/a' }], items: [] },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(notifications.at(-1).title, 'Project already exists; located it');

  pin = true;
  createImpl = async () => ({ created: [], existing: [{ id: '1', name: 'a' }], skippedFiles: 0, pinned: true });
  await fire('drop', {
    target: sidebarChild,
    dataTransfer: { types: ['Files'], files: [{ name: 'a', mockPath: '/fixtures/team/a' }], items: [] },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(notifications.at(-1).title, 'Project already exists; pinned and located');

  // 8. Dropping regular file only -> folder-only hint (does not cancel prior highlight needlessly)
  createImpl = async () => ({ created: [], existing: [], skippedFiles: 1, pinned: false });
  await fire('drop', {
    target: sidebarChild,
    dataTransfer: { types: ['Files'], files: [{ name: 'a.txt', mockPath: '/fixtures/team/a.txt' }], items: [] },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(notifications.at(-1).title, 'Drop a folder to create a project');

  // 9. Error from createProjects -> error toast
  createImpl = async () => { throw new Error('boom'); };
  await fire('drop', {
    target: sidebarChild,
    dataTransfer: { types: ['Files'], files: [{ name: 'a', mockPath: '/fixtures/team/a' }], items: [] },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.deepEqual(notifications.at(-1), { title: 'Failed to create project', message: 'boom', tag: 'agy-sidebar-drop-project' });

  // 10. Unsupported (SSH) or disabled ignores drop
  supported = false;
  await fire('drop', {
    target: sidebarChild,
    dataTransfer: { types: ['Files'], files: [{ name: 'x', mockPath: '/x' }], items: [] },
    preventDefault: () => prevented++,
    stopPropagation: () => {}
  });
  assert.equal(prevented, 3);

  controller.abort();
  assert.equal(highlightCancelled, 4);
  assert.equal(docListeners.get('drop')?.length, 0);
  assert.equal(winListeners.get('blur')?.length, 0);
});

test('mergePinnedProjectIds prepends new project IDs while preserving already-pinned order and handling invalid JSON', () => {
  assert.deepEqual(mergePinnedProjectIds(undefined, ['p1', 'p2']), { next: ['p1', 'p2'], changed: true });
  assert.deepEqual(mergePinnedProjectIds('{bad-json', ['p1']), { next: ['p1'], changed: true });
  assert.deepEqual(
    mergePinnedProjectIds('["keep-1","keep-2"]', ['new-1', 'keep-2', 'new-2', 'new-1']),
    { next: ['new-1', 'new-2', 'keep-1', 'keep-2'], changed: true }
  );
  assert.deepEqual(
    mergePinnedProjectIds(['keep-1', 'keep-2'], ['keep-2']),
    { next: ['keep-1', 'keep-2'], changed: false }
  );
});

test('findProjectHeaderElement, scrollVirtualizedSidebarToProject, and highlightProjectInSidebar locate, scroll, pulse, and clean up', async () => {
  const scrollCalls = [];
  const makeBtn = (id, label) => {
    const attrs = new Map([['data-testid', 'project-header'], ['data-project-label', label]]);
    return {
      scrolledIntoView: [],
      attrs,
      getAttribute: k => attrs.get(k) ?? null,
      setAttribute: (k, v) => attrs.set(k, v),
      removeAttribute: k => attrs.delete(k),
      scrollIntoView: opts => { makeBtn.last = opts; scrollCalls.push({ label, opts }); },
      __fiber: { tag: 5, memoizedProps: {}, return: { tag: 0, memoizedProps: { projectId: id } } }
    };
  };
  const makeContainer = (id, btn) => ({
    getAttribute: k => k === 'data-testid' ? 'project-header-container' : null,
    querySelector: sel => sel === '[data-testid="project-header"]' ? btn : null,
    __fiber: { tag: 5, memoizedProps: {}, return: { tag: 0, memoizedProps: { projectId: id } } }
  });

  let mounted = false;
  const targetBtn = makeBtn('proj-new', 'new-folder');
  const targetContainer = makeContainer('proj-new', targetBtn);
  const otherBtn = makeBtn('proj-other', 'other');
  const items = [
    { type: 'header', id: 'proj-other', label: 'other' },
    { type: 'row', id: 'conv-1', groupId: 'proj-other', isIndented: true },
    { type: 'header', id: 'proj-new', label: 'new-folder' }
  ];
  const virtualScrolled = [];
  const virtualizer = {
    options: { count: items.length },
    getVirtualItems: () => [],
    scrollToIndex: (index, opts) => {
      virtualScrolled.push({ index, opts });
      mounted = true;
    }
  };
  const listEl = {
    scrollTop: 420,
    __fiber: {
      tag: 5,
      memoizedProps: {},
      return: {
        tag: 0,
        memoizedProps: { items },
        memoizedState: { memoizedState: { current: virtualizer }, next: null }
      }
    }
  };
  const sidebar = {
    querySelector: sel => sel.includes('conversation-list-sidebar') ? listEl : null,
    querySelectorAll: sel => {
      const list = [];
      if (sel.includes('project-header-container')) {
        if (mounted) list.push(targetContainer);
        return list;
      }
      if (sel.includes('project-header')) {
        list.push(otherBtn);
        if (mounted) list.push(targetBtn);
      }
      return list;
    }
  };
  const doc = {
    querySelector: sel => sel.includes('Sidebar') ? sidebar : null,
    querySelectorAll: sel => sidebar.querySelectorAll(sel)
  };
  const fiberOf = el => el?.__fiber || null;

  // Fallback label match works even without fiberOf
  assert.equal(findProjectHeaderElement(doc, { name: 'other' }), otherBtn);

  // Pinned fallback resets scrollTop when no virtualizer exists
  const plainList = { scrollTop: 300 };
  const plainSidebar = { querySelector: () => plainList, querySelectorAll: () => [] };
  const plainDoc = { querySelector: () => plainSidebar, querySelectorAll: () => [] };
  assert.equal(scrollVirtualizedSidebarToProject(plainDoc, { id: 'p', pinned: true }), true);
  assert.equal(plainList.scrollTop, 0);

  // Highlight polls once, triggers virtualizer scrollToIndex(2), mounts header, scrollsIntoView, highlights, then auto-clears
  const cancel = highlightProjectInSidebar(doc, [{ id: 'proj-new', name: 'new-folder' }], {
    pinned: false,
    fiberOf,
    pollMs: 15,
    durationMs: 45,
    maxWaitMs: 500
  });
  assert.deepEqual(virtualScrolled, [{ index: 2, opts: { align: 'center', behavior: 'smooth' } }]);
  await new Promise(r => setTimeout(r, 35));
  assert.equal(targetBtn.getAttribute('data-agy-project-highlight'), 'true');
  assert.deepEqual(scrollCalls[0], { label: 'new-folder', opts: { behavior: 'smooth', block: 'center' } });

  await new Promise(r => setTimeout(r, 70));
  assert.equal(targetBtn.getAttribute('data-agy-project-highlight'), null);
  cancel();

  // Abort clears active highlight immediately
  const controller = new AbortController();
  highlightProjectInSidebar(doc, [{ id: 'proj-new', name: 'new-folder' }], {
    fiberOf,
    signal: controller.signal,
    durationMs: 5000
  });
  assert.equal(targetBtn.getAttribute('data-agy-project-highlight'), 'true');
  controller.abort();
  assert.equal(targetBtn.getAttribute('data-agy-project-highlight'), null);
});
