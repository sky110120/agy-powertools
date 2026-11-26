// Local folder drag-and-drop -> auto-create project in Antigravity sidebar.

export function localPathToFileUri(rawPath) {
  const input = String(rawPath || '');
  if (!input || /[\x00-\x1f\x7f]/.test(input) || /^(?:\\\\|\/\/)[?.][\\/]/.test(input)) return '';
  if (/^file:\/\//i.test(input)) return normalizeFolderUri(input);

  // UNC path: \\server\share\dir or //server/share/dir
  if (/^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+/.test(input)) {
    const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '');
    const slash = normalized.indexOf('/');
    const host = slash === -1 ? normalized : normalized.slice(0, slash);
    const rest = slash === -1 ? '' : normalized.slice(slash + 1);
    const segs = rest.split('/').filter(Boolean).map(encodeURIComponent);
    return `file://${encodeURIComponent(host.toLowerCase())}/${segs.join('/')}`;
  }

  if (input.startsWith('//')) return '';

  // Windows drive path: C:\Users\name or C:/Users/name
  const winDrive = /^([A-Za-z]):[\\/](.*)$/.exec(input);
  if (winDrive) {
    const drive = winDrive[1].toLowerCase();
    const segs = String(winDrive[2] || '').replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent);
    return segs.length ? `file:///${drive}%3A/${segs.join('/')}` : `file:///${drive}%3A/`;
  }

  // POSIX absolute path: /Users/name/dir
  if (input.startsWith('/')) {
    const segs = input.split('/').filter(Boolean).map(encodeURIComponent);
    return segs.length ? `file:///${segs.join('/')}` : 'file:///';
  }

  return '';
}

function decodeSafe(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function parseFileUri(uri) {
  const clean = String(uri || '').trim().split('#')[0].split('?')[0];
  if (!/^file:\/\//i.test(clean)) return null;
  try {
    const u = new URL(clean);
    let host = (u.hostname || '').toLowerCase();
    if (host === 'localhost') host = '';
    const decodedPath = decodeSafe(u.pathname || '/').replace(/^\/([A-Za-z]):(?=\/|$)/, (_, d) => `/${d.toLowerCase()}:`);
    return { host, decodedPath };
  } catch {
    return null;
  }
}

export function normalizeFolderUri(uri) {
  const parsed = parseFileUri(uri);
  if (!parsed) return '';
  const rawSegs = parsed.decodedPath.split('/').filter(Boolean);
  if (!rawSegs.length) return parsed.host ? `file://${encodeURIComponent(parsed.host)}/` : 'file:///';
  if (/^[a-z]:$/i.test(rawSegs[0])) {
    const drive = rawSegs[0][0].toLowerCase();
    const rest = rawSegs.slice(1).map(encodeURIComponent);
    return rest.length ? `file:///${drive}%3A/${rest.join('/')}` : `file:///${drive}%3A/`;
  }
  const encodedSegs = rawSegs.map(encodeURIComponent);
  const hostPart = parsed.host ? encodeURIComponent(parsed.host) : '';
  return `file://${hostPart}/${encodedSegs.join('/')}`;
}

export function folderBaseName(uri) {
  const parsed = parseFileUri(normalizeFolderUri(uri) || uri);
  if (!parsed) return 'workspace';
  const segs = parsed.decodedPath.split('/').filter(Boolean);
  if (!segs.length) return 'workspace';
  const last = segs[segs.length - 1];
  if (segs.length === 1 && /^[a-z]:$/i.test(last)) return last[0].toUpperCase();
  return last || 'workspace';
}

export function uniqueProjectName(uri, existingProjects = []) {
  const taken = new Set(
    (existingProjects || [])
      .map(entry => String(entry?.project?.name || entry?.name || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const base = folderBaseName(uri) || 'workspace';
  if (!taken.has(base.toLowerCase())) return base;

  const parsed = parseFileUri(normalizeFolderUri(uri) || uri);
  const segs = parsed
    ? parsed.decodedPath.split('/').filter(Boolean).filter((s, idx) => !(idx === 0 && /^[a-z]:$/i.test(s)))
    : [];
  for (let i = segs.length - 2; i >= 0; i--) {
    const candidate = segs.slice(i).join('/');
    if (candidate && !taken.has(candidate.toLowerCase())) return candidate;
  }

  let n = 2;
  while (taken.has(`${base} (${n})`.toLowerCase())) n++;
  return `${base} (${n})`;
}

export function findExistingLocalProject(uri, existingProjects = []) {
  const target = normalizeFolderUri(uri);
  if (!target) return null;
  let archivedMatch = null;
  for (const entry of existingProjects || []) {
    const project = entry?.project;
    if (!project) continue;
    if (project.backendType === 2 || project.backendType === 3 || entry?.isCloud) continue;
    const resources = project.projectResources?.resources;
    if (!Array.isArray(resources) || resources.length !== 1) continue;
    const res = resources[0];
    const resUri = res?.type?.case === 'folderUri'
      ? res.type.value
      : res?.type?.case === 'gitFolder'
        ? res.type.value?.folderUri
        : (res?.folderUri || res?.uri || '');
    if (normalizeFolderUri(resUri) !== target) continue;
    if (!project.archived) return entry;
    if (!archivedMatch) archivedMatch = entry;
  }
  return archivedMatch;
}

export function isExternalFileDrag(dataTransfer, internalDragActive = false) {
  if (!dataTransfer || internalDragActive) return false;
  const types = dataTransfer.types;
  if (!types) return false;
  if (typeof types.contains === 'function') return types.contains('Files');
  try { return Array.from(types).includes('Files'); } catch { return false; }
}

export function extractDroppedEntries(dataTransfer, getPathForFile) {
  if (!dataTransfer) return [];
  const files = Array.from(dataTransfer.files || []);
  const fileItems = Array.from(dataTransfer.items || []).filter(item => !item?.kind || item.kind === 'file');
  const count = Math.max(files.length, fileItems.length);
  const out = [];
  const seen = new Set();

  for (let i = 0; i < count; i++) {
    const item = fileItems[i] || null;
    let file = files[i] || null;
    if (!file && typeof item?.getAsFile === 'function') {
      try { file = item.getAsFile() || null; } catch {}
    }
    let rawPath = '';
    if (file && typeof getPathForFile === 'function') {
      try { rawPath = String(getPathForFile(file) || ''); } catch {}
    }
    if (!rawPath && typeof file?.path === 'string') rawPath = file.path;
    const dedupKey = rawPath ? (normalizeFolderUri(localPathToFileUri(rawPath)) || rawPath) : '';
    if (dedupKey && seen.has(dedupKey)) continue;
    if (dedupKey) seen.add(dedupKey);

    let entry = null;
    if (typeof item?.webkitGetAsEntry === 'function') {
      try { entry = item.webkitGetAsEntry() || null; } catch {}
    }
    out.push({
      path: rawPath,
      name: String(file?.name || entry?.name || '').trim(),
      entryIsDir: entry ? Boolean(entry.isDirectory) : null,
      entryIsFile: entry ? Boolean(entry.isFile) : null
    });
  }
  return out;
}

const SIDEBAR_SELECTOR = '[role="navigation"][aria-label="Sidebar"], [role="navigation"][data-agy-original-aria-label="Sidebar"]';
const PROJECT_HEADER_CONTAINER_SELECTOR = '[data-testid="project-header-container"]';
const PROJECT_HEADER_SELECTOR = '[data-testid="project-header"]';

function querySidebarContainer(doc) {
  if (!doc) return null;
  return doc.querySelector?.(SIDEBAR_SELECTOR)
    || doc.querySelector?.('[data-testid="sidebar-navigation-items"], [data-testid="agy-management-trigger"]')?.closest?.('[role="navigation"], .bg-sidebar')
    || null;
}

export function findSidebarElement(doc, target, event) {
  if (!doc) return null;
  const direct = target?.closest?.(SIDEBAR_SELECTOR)
    || target?.closest?.('[data-testid="sidebar-navigation-items"], [data-testid="agy-management-trigger"]')?.closest?.('[role="navigation"], .bg-sidebar');
  if (direct) return direct;

  const sidebar = querySidebarContainer(doc);
  if (!sidebar) return null;
  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && typeof sidebar.getBoundingClientRect === 'function') {
    const rect = sidebar.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0 &&
      event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom) {
      return sidebar;
    }
  }
  return null;
}

export function mergePinnedProjectIds(existingRaw, projectIds = []) {
  let parsed = [];
  if (Array.isArray(existingRaw)) {
    parsed = existingRaw;
  } else if (typeof existingRaw === 'string' && existingRaw.trim()) {
    try {
      const value = JSON.parse(existingRaw);
      if (Array.isArray(value)) parsed = value;
    } catch {}
  }
  const current = [];
  const seen = new Set();
  for (const item of parsed) {
    if (typeof item !== 'string' || !item || seen.has(item)) continue;
    seen.add(item);
    current.push(item);
  }
  const toPrepend = [];
  for (const id of projectIds || []) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    toPrepend.push(id);
  }
  if (!toPrepend.length) return { next: current, changed: false };
  return { next: [...toPrepend, ...current], changed: true };
}

function resolveFiberProjectMatch(el, targetId, fiberOf) {
  if (!el || !targetId || typeof fiberOf !== 'function') return false;
  let node = null;
  try { node = fiberOf(el); } catch { return false; }
  for (let hop = 0; node && hop < 10; hop++, node = node.return) {
    const props = node.memoizedProps;
    if (!props || typeof props !== 'object') continue;
    if (props.projectId === targetId || props.brandedProjectId === targetId || props.project?.id === targetId || props.item?.id === targetId) {
      return true;
    }
  }
  return false;
}

function headerButtonFromMatch(el) {
  if (!el) return null;
  if (el.getAttribute?.('data-testid') === 'project-header-container' || el.dataset?.testid === 'project-header-container') {
    return el.querySelector?.(PROJECT_HEADER_SELECTOR) || el;
  }
  return el;
}

export function findProjectHeaderElement(doc, { id = '', name = '', fiberOf } = {}) {
  if (!doc) return null;
  const scope = querySidebarContainer(doc) || doc;
  const targetId = String(id || '').trim();
  const targetName = String(name || '').trim();

  if (targetId && typeof fiberOf === 'function' && typeof scope.querySelectorAll === 'function') {
    const candidates = scope.querySelectorAll(`${PROJECT_HEADER_CONTAINER_SELECTOR}, ${PROJECT_HEADER_SELECTOR}`) || [];
    for (const el of candidates) {
      if (resolveFiberProjectMatch(el, targetId, fiberOf)) {
        return headerButtonFromMatch(el);
      }
    }
  }

  if (targetName && typeof scope.querySelectorAll === 'function') {
    const buttons = scope.querySelectorAll(PROJECT_HEADER_SELECTOR) || [];
    for (const btn of buttons) {
      const label = btn.getAttribute?.('data-project-label') ?? btn.dataset?.projectLabel ?? '';
      if (label === targetName) return btn;
    }
  }
  return null;
}

function findVirtualizerAndItems(scrollContainer, fiberOf) {
  if (!scrollContainer || typeof fiberOf !== 'function') return null;
  let rootFiber = null;
  try { rootFiber = fiberOf(scrollContainer); } catch { return null; }
  if (!rootFiber) return null;

  const candidates = [];
  const queued = new Set();
  const addNode = node => {
    if (!node || queued.has(node)) return;
    queued.add(node);
    candidates.push(node);
  };

  // Walk upward toward A$c / Rrd and bounded BFS downward in case the virtualizer lives inside.
  let up = rootFiber;
  for (let hop = 0; up && hop < 14; hop++, up = up.return) addNode(up);

  const downQueue = [rootFiber.child];
  for (let i = 0; i < downQueue.length && candidates.length < 75; i++) {
    const cur = downQueue[i];
    if (!cur) continue;
    addNode(cur);
    if (cur.child) downQueue.push(cur.child);
    if (cur.sibling) downQueue.push(cur.sibling);
  }

  const looksLikeItemsArray = arr => Array.isArray(arr) && arr.length > 0 && arr.some(item =>
    item && typeof item === 'object' && ('id' in item || 'projectId' in item || 'type' in item || 'groupId' in item)
  );

  for (const node of candidates) {
    let virtualizer = null;
    const hookArrays = [];
    for (let h = node.memoizedState; h && typeof h === 'object'; h = h.next) {
      const st = h.memoizedState;
      const hookVals = [st, st?.current, Array.isArray(st) ? st[0] : null];
      for (const val of hookVals) {
        if (!virtualizer && val && typeof val.scrollToIndex === 'function' && typeof val.getVirtualItems === 'function') {
          virtualizer = val;
        }
        if (looksLikeItemsArray(val)) hookArrays.push(val);
      }
    }
    if (!virtualizer) continue;

    let items = looksLikeItemsArray(node.memoizedProps?.items) ? node.memoizedProps.items : null;
    if (!items) {
      let ancestor = node.return;
      for (let hop = 0; ancestor && hop < 4 && !items; hop++, ancestor = ancestor.return) {
        if (looksLikeItemsArray(ancestor.memoizedProps?.items)) items = ancestor.memoizedProps.items;
      }
    }
    if (!items && hookArrays.length) {
      const expectedCount = Number(virtualizer.options?.count);
      items = (Number.isFinite(expectedCount) ? hookArrays.find(arr => arr.length === expectedCount) : null) || hookArrays[0];
    }
    if (!items) {
      let ancestor = node.return;
      for (let hop = 0; ancestor && hop < 3 && !items; hop++, ancestor = ancestor.return) {
        for (let h = ancestor.memoizedState; h && typeof h === 'object'; h = h.next) {
          const val = Array.isArray(h.memoizedState) ? h.memoizedState[0] : h.memoizedState;
          if (looksLikeItemsArray(val)) { items = val; break; }
        }
      }
    }
    if (items) return { virtualizer, items };
  }
  return null;
}

export function scrollVirtualizedSidebarToProject(doc, { id = '', name = '', pinned = false, fiberOf } = {}) {
  if (!doc) return false;
  const scope = querySidebarContainer(doc) || doc;
  const scrollContainer = scope?.querySelector?.('[data-testid="conversation-list-sidebar"], [data-sidebar-scroll-container="true"], .overflow-y-auto') || null;
  const targetId = String(id || '').trim();
  const targetName = String(name || '').trim();

  if (scrollContainer && typeof fiberOf === 'function') {
    const found = findVirtualizerAndItems(scrollContainer, fiberOf);
    if (found) {
      const { virtualizer, items } = found;
      let idx = -1;
      if (targetId) {
        idx = items.findIndex(item => item && (item.id === targetId || item.projectId === targetId) && (item.type === 'header' || item.type === 'project-header' || !item.isIndented));
        if (idx < 0) idx = items.findIndex(item => item && (item.id === targetId || item.projectId === targetId || item.groupId === targetId));
      }
      if (idx < 0 && targetName) {
        idx = items.findIndex(item => item && !item.isIndented && (item.label === targetName || item.name === targetName));
      }
      if (idx >= 0) {
        try { virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' }); return true; }
        catch { try { virtualizer.scrollToIndex(idx, { align: 'center' }); return true; } catch {} }
      }
    }
  }

  if (pinned && scrollContainer) {
    let scrolled = false;
    if (typeof scrollContainer.scrollTop === 'number') {
      scrollContainer.scrollTop = 0;
      scrolled = true;
    }
    const scroller = scrollContainer.closest?.('[data-sidebar-scroll-container="true"], .overflow-y-auto');
    if (scroller && scroller !== scrollContainer && typeof scroller.scrollTop === 'number') {
      scroller.scrollTop = 0;
      scrolled = true;
    }
    if (scrolled) return true;
  }
  return false;
}

export function highlightProjectInSidebar(doc, targets = [], { pinned = false, primary = null, fiberOf, signal, durationMs = 2400, maxWaitMs = 3000, pollMs = 90 } = {}) {
  const validTargets = (Array.isArray(targets) ? targets : []).filter(t => t && (t.id || t.name));
  if (signal?.aborted || !doc || !validTargets.length) return () => {};
  const primaryTarget = primary && (primary.id || primary.name) ? primary : validTargets[validTargets.length - 1];

  let stopped = false;
  let pollTimer = null;
  let clearTimer = null;
  let scrolledVirtual = false;
  let highlighted = [];
  const startedAt = Date.now();

  const clearHighlight = () => {
    for (const el of highlighted) {
      el?.removeAttribute?.('data-agy-project-highlight');
    }
    highlighted = [];
  };

  const cancel = () => {
    signal?.removeEventListener?.('abort', cancel);
    stopped = true;
    if (pollTimer !== null) { clearTimeout(pollTimer); pollTimer = null; }
    if (clearTimer !== null) { clearTimeout(clearTimer); clearTimer = null; }
    clearHighlight();
  };

  signal?.addEventListener?.('abort', cancel, { once: true });

  const applyHighlight = el => {
    if (!el || highlighted.includes(el)) return;
    if (el.getAttribute?.('data-agy-project-highlight') === 'true') {
      el.removeAttribute?.('data-agy-project-highlight');
      void el.offsetWidth;
    }
    el.setAttribute?.('data-agy-project-highlight', 'true');
    highlighted.push(el);
  };

  const attempt = () => {
    pollTimer = null;
    if (stopped) return;

    const primaryEl = findProjectHeaderElement(doc, { id: primaryTarget.id, name: primaryTarget.name, fiberOf });
    if (primaryEl) {
      try { primaryEl.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); }
      catch { try { primaryEl.scrollIntoView?.(); } catch {} }
      applyHighlight(primaryEl);
      for (const item of validTargets) {
        const matchEl = findProjectHeaderElement(doc, { id: item.id, name: item.name, fiberOf });
        if (matchEl) applyHighlight(matchEl);
      }
      clearTimer = setTimeout(cancel, durationMs);
      return;
    }

    if (!scrolledVirtual) {
      scrolledVirtual = scrollVirtualizedSidebarToProject(doc, {
        id: primaryTarget.id,
        name: primaryTarget.name,
        pinned,
        fiberOf
      });
    }

    if (Date.now() - startedAt < maxWaitMs) {
      pollTimer = setTimeout(attempt, pollMs);
    } else cancel();
  };

  attempt();
  return cancel;
}

export function installSidebarFolderDrop(document, { enabled, isSupported, pinProject, text, createProjects, highlightProjects, notify, signal, getPathForFile }) {
  if (!document?.addEventListener) return;
  let internalDragActive = false;
  let activeSidebar = null;
  let overlay = null;
  let badge = null;
  let dropping = false;
  let cancelHighlight = null;

  const hideOverlay = () => {
    activeSidebar = null;
    if (overlay) {
      overlay.remove?.();
      overlay = null;
      badge = null;
    }
  };

  const showOverlay = sidebar => {
    activeSidebar = sidebar;
    const rect = typeof sidebar.getBoundingClientRect === 'function' ? sidebar.getBoundingClientRect() : null;
    if (!rect || rect.width <= 0 || rect.height <= 0 || !document.body) return;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.dataset.testid = 'agy-sidebar-drop-overlay';
      overlay.dataset.agyPowertoolsRoot = 'sidebar-drop-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '9500',
        boxSizing: 'border-box',
        border: '2px dashed var(--primary, #3b82f6)',
        borderRadius: '10px',
        background: 'color-mix(in srgb, var(--primary, #3b82f6) 10%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      });
      badge = document.createElement('div');
      Object.assign(badge.style, {
        padding: '8px 14px',
        borderRadius: '9999px',
        border: '1px solid color-mix(in srgb, var(--primary, #3b82f6) 45%, var(--border, rgba(128,128,128,.25)))',
        background: 'var(--card, var(--background, #1e1e1e))',
        color: 'var(--foreground, #ffffff)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, .18)',
        fontSize: '12.5px',
        fontWeight: '500',
        lineHeight: '1.3',
        textAlign: 'center',
        maxWidth: '100%'
      });
      overlay.append(badge);
      document.body.append(overlay);
    }
    if (badge) {
      badge.textContent = pinProject?.()
        ? text('松开以创建并置顶项目', 'Drop folder to create and pin project')
        : text('松开以创建项目', 'Drop folder to create project');
    }
    Object.assign(overlay.style, {
      left: `${Math.round(rect.left)}px`,
      top: `${Math.round(rect.top)}px`,
      width: `${Math.round(rect.width)}px`,
      height: `${Math.round(rect.height)}px`
    });
  };

  const canHandleDrag = event => Boolean(enabled?.() && isSupported?.() && isExternalFileDrag(event?.dataTransfer, internalDragActive));

  const onDragStart = () => {
    internalDragActive = true;
    hideOverlay();
  };
  const onDragEnd = () => {
    internalDragActive = false;
    hideOverlay();
  };
  const onDragOver = event => {
    if (!canHandleDrag(event)) {
      if (overlay) hideOverlay();
      return;
    }
    const sidebar = findSidebarElement(document, event.target, event);
    if (!sidebar) {
      if (overlay) hideOverlay();
      return;
    }
    event.preventDefault?.();
    event.stopPropagation?.();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    showOverlay(sidebar);
  };
  const onDragLeave = event => {
    if (!activeSidebar) return;
    if (event.relatedTarget == null) {
      hideOverlay();
      return;
    }
    if (typeof activeSidebar.contains === 'function' && activeSidebar.contains(event.relatedTarget)) return;
    hideOverlay();
  };
  const onDrop = async event => {
    const wasInternal = internalDragActive;
    internalDragActive = false;
    hideOverlay();
    if (!enabled?.() || !isSupported?.() || !isExternalFileDrag(event?.dataTransfer, wasInternal)) return;
    const sidebar = findSidebarElement(document, event.target, event);
    if (!sidebar) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    if (dropping) return;

    // Must read DataTransfer entries synchronously before any await.
    const entries = extractDroppedEntries(event.dataTransfer, getPathForFile);
    const shouldPin = Boolean(pinProject?.());
    dropping = true;
    try {
      const result = await createProjects(entries, { pin: shouldPin });
      if (signal?.aborted || !enabled?.() || !isSupported?.()) return;
      const created = Array.isArray(result?.created) ? result.created : [];
      const existing = Array.isArray(result?.existing) ? result.existing : [];
      const pinned = Boolean(result?.pinned);
      const targets = [...created, ...existing];
      if (targets.length > 0) {
        cancelHighlight?.();
        cancelHighlight = highlightProjects?.(targets, {
          pinned,
          primary: result?.target || targets[targets.length - 1]
        }) || null;
      }
      if (created.length === 1) {
        notify?.({
          title: pinned ? text('已创建并置顶项目', 'Project created and pinned') : text('已创建项目', 'Project created'),
          message: created[0].name,
          tag: 'agy-sidebar-drop-project'
        });
      } else if (created.length > 1) {
        notify?.({
          title: pinned ? text(`已创建并置顶 ${created.length} 个项目`, `Created and pinned ${created.length} projects`) : text(`已创建 ${created.length} 个项目`, `Created ${created.length} projects`),
          message: created.map(item => item.name).join(', '),
          tag: 'agy-sidebar-drop-project'
        });
      } else if (existing.length >= 1) {
        notify?.({
          title: pinned ? text('项目已存在，已置顶并定位', 'Project already exists; pinned and located') : text('项目已存在，已为你定位', 'Project already exists; located it'),
          message: existing.map(item => item.name).join(', '),
          tag: 'agy-sidebar-drop-project'
        });
      } else {
        notify?.({
          title: text('仅支持拖入文件夹创建项目', 'Drop a folder to create a project'),
          message: text('请从访达或文件管理器拖入文件夹到侧边栏。', 'Drag and drop a folder from your file manager onto the sidebar.'),
          tag: 'agy-sidebar-drop-project'
        });
      }
    } catch (error) {
      if (signal?.aborted) return;
      notify?.({
        title: text('创建项目失败', 'Failed to create project'),
        message: String(error?.message || ''),
        tag: 'agy-sidebar-drop-project'
      });
    } finally {
      dropping = false;
    }
  };
  const onKeyDown = event => {
    if (event?.key === 'Escape') hideOverlay();
  };

  document.addEventListener('dragstart', onDragStart, { capture: true, signal });
  document.addEventListener('dragenter', onDragOver, { capture: true, signal });
  document.addEventListener('dragover', onDragOver, { capture: true, signal });
  document.addEventListener('dragleave', onDragLeave, { capture: true, signal });
  document.addEventListener('drop', onDrop, { capture: true, signal });
  document.addEventListener('dragend', onDragEnd, { capture: true, signal });
  document.addEventListener('keydown', onKeyDown, { capture: true, signal });
  const win = document.defaultView || (typeof window !== 'undefined' ? window : null);
  win?.addEventListener?.('blur', onDragEnd, { signal });
  signal?.addEventListener?.('abort', () => {
    hideOverlay();
    cancelHighlight?.();
    cancelHighlight = null;
  }, { once: true });
}
