// Oversized (> 20 MB) local file drag-and-drop -> insert native file reference/mention in chat composer.

const COMPOSER_OVERSIZED_THRESHOLD_BYTES = 20 * 1024 * 1024;
const COMPOSER_SIDEBAR_SELECTOR = 'aside, [role="navigation"][aria-label="Sidebar"], [role="navigation"][data-agy-original-aria-label="Sidebar"], [data-testid="sidebar-navigation-items"], [data-testid="agy-management-trigger"], .bg-sidebar';
const COMPOSER_DIRECT_SELECTOR = '[data-testid="agent-input-box"], [aria-label="Message input"], [data-agy-original-aria-label="Message input"], [data-testid="agy-inline-edit-host"]';
const COMPOSER_VIEW_SELECTOR = '[data-testid="conversation-view"]';
const COMPOSER_EXCLUDED_SELECTOR = '.xterm, .monaco-editor, .monaco-diff-editor, [role="tree"], [role="treeitem"], [data-testid="overview-panel-host"], [data-testid="agy-powertools-page"], [data-agy-powertools-root]';
const COMPOSER_DIALOG_SELECTOR = '[role="dialog"], [aria-modal="true"]';

export function composerOversizedThresholdBytes() {
  return COMPOSER_OVERSIZED_THRESHOLD_BYTES;
}

function composerDecodeSafe(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function composerBasename(rawPath) {
  const clean = String(rawPath || '').replace(/[\\/]+$/, '');
  if (!clean) return '';
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

export function composerPathToFileUri(rawPath) {
  const input = String(rawPath || '').trim();
  if (!input || /[\x00-\x1f\x7f]/.test(input) || /^(?:\\\\|\/\/)[?.][\\/]/.test(input)) return '';

  if (/^file:\/\//i.test(input)) {
    const clean = input.split('#')[0].split('?')[0];
    try {
      const u = new URL(clean);
      let host = (u.hostname || '').toLowerCase();
      if (host === 'localhost') host = '';
      const decodedPath = composerDecodeSafe(u.pathname || '/').replace(/^\/([A-Za-z]):(?=\/|$)/, (_, d) => `/${d.toLowerCase()}:`);
      const rawSegs = decodedPath.split('/').filter(Boolean);
      if (!rawSegs.length) return '';
      if (/^[a-z]:$/i.test(rawSegs[0])) {
        const drive = rawSegs[0][0].toLowerCase();
        const rest = rawSegs.slice(1).map(encodeURIComponent);
        return rest.length ? `file:///${drive}%3A/${rest.join('/')}` : '';
      }
      const encodedSegs = rawSegs.map(encodeURIComponent);
      const hostPart = host ? encodeURIComponent(host) : '';
      return `file://${hostPart}/${encodedSegs.join('/')}`;
    } catch {
      return '';
    }
  }

  // UNC path: \\server\share\file.bin or //server/share/file.bin
  if (/^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+/.test(input)) {
    const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '');
    const slash = normalized.indexOf('/');
    const host = slash === -1 ? normalized : normalized.slice(0, slash);
    const rest = slash === -1 ? '' : normalized.slice(slash + 1);
    const segs = rest.split('/').filter(Boolean).map(encodeURIComponent);
    if (!host || !segs.length) return '';
    return `file://${encodeURIComponent(host.toLowerCase())}/${segs.join('/')}`;
  }

  if (input.startsWith('//')) return '';

  // Windows drive path: C:\Users\name\big file #1.mp4 or C:/Users/name/big.mp4
  const winDrive = /^([A-Za-z]):[\\/](.*)$/.exec(input);
  if (winDrive) {
    const drive = winDrive[1].toLowerCase();
    const segs = String(winDrive[2] || '').replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent);
    return segs.length ? `file:///${drive}%3A/${segs.join('/')}` : '';
  }

  // POSIX absolute path: /Users/name/big file #1.mp4
  if (input.startsWith('/')) {
    const segs = input.split('/').filter(Boolean).map(encodeURIComponent);
    return segs.length ? `file:///${segs.join('/')}` : '';
  }

  return '';
}

export function isComposerExternalFileDrag(dataTransfer, internalDragActive = false) {
  if (!dataTransfer || internalDragActive) return false;
  const types = dataTransfer.types;
  if (types) {
    if (typeof types.contains === 'function' && types.contains('Files')) return true;
    try {
      if (Array.from(types).includes('Files')) return true;
    } catch {}
  }
  return Boolean(dataTransfer.files?.length);
}

function composerPointInElement(el, event) {
  if (!el || !event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false;
  if (typeof el.getBoundingClientRect !== 'function') return false;
  const rect = el.getBoundingClientRect();
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return false;
  const right = Number.isFinite(rect.right) ? rect.right : (rect.left + rect.width);
  const bottom = Number.isFinite(rect.bottom) ? rect.bottom : (rect.top + rect.height);
  return (
    event.clientX >= rect.left && event.clientX <= right &&
    event.clientY >= rect.top && event.clientY <= bottom
  );
}

export function isComposerSidebarTarget(doc, target, event) {
  if (target?.closest?.(COMPOSER_SIDEBAR_SELECTOR)) return true;
  if (!doc) return false;
  const sidebar = doc.querySelector?.('[role="navigation"][aria-label="Sidebar"], [role="navigation"][data-agy-original-aria-label="Sidebar"], aside')
    || doc.querySelector?.('[data-testid="sidebar-navigation-items"], [data-testid="agy-management-trigger"]')?.closest?.('[role="navigation"], .bg-sidebar, aside')
    || null;
  if (sidebar && composerPointInElement(sidebar, event)) return true;
  return false;
}

export function findComposerDropTarget(doc, target, event) {
  if (!doc) return null;
  if (isComposerSidebarTarget(doc, target, event)) return null;

  const direct = target?.closest?.(COMPOSER_DIRECT_SELECTOR);
  if (direct) return direct;

  if (target?.closest?.(COMPOSER_EXCLUDED_SELECTOR)) return null;

  const dialog = target?.closest?.(COMPOSER_DIALOG_SELECTOR);
  if (dialog) {
    return dialog.querySelector?.(COMPOSER_DIRECT_SELECTOR) || null;
  }

  const view = target?.closest?.(COMPOSER_VIEW_SELECTOR);
  if (view) {
    return view.querySelector?.(COMPOSER_DIRECT_SELECTOR) || view;
  }

  const main = target?.closest?.('main');
  if (main) {
    const input = main.querySelector?.(COMPOSER_DIRECT_SELECTOR);
    if (input) return input;
  }

  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    const candidates = typeof doc.querySelectorAll === 'function'
      ? [...doc.querySelectorAll(`${COMPOSER_DIRECT_SELECTOR}, ${COMPOSER_VIEW_SELECTOR}`)]
      : [doc.querySelector?.(COMPOSER_DIRECT_SELECTOR), doc.querySelector?.(COMPOSER_VIEW_SELECTOR)].filter(Boolean);
    for (const el of candidates) {
      if (composerPointInElement(el, event)) {
        return el.querySelector?.(COMPOSER_DIRECT_SELECTOR) || el;
      }
    }
  }

  return null;
}

export function partitionDroppedComposerFiles(dataTransfer, { getPathForFile, maxBytes = COMPOSER_OVERSIZED_THRESHOLD_BYTES } = {}) {
  const oversizedRefs = [];
  const normalFiles = [];
  const unresolvedOversized = [];
  if (!dataTransfer) return { oversizedRefs, normalFiles, unresolvedOversized };

  const threshold = Number.isFinite(Number(maxBytes)) && Number(maxBytes) > 0
    ? Number(maxBytes)
    : COMPOSER_OVERSIZED_THRESHOLD_BYTES;
  const files = Array.from(dataTransfer.files || []);
  const fileItems = Array.from(dataTransfer.items || []).filter(item => !item?.kind || item.kind === 'file');
  const count = Math.max(files.length, fileItems.length);
  const seenUris = new Set();

  for (let i = 0; i < count; i++) {
    const item = fileItems[i] || null;
    let file = files[i] || null;
    if (!file && typeof item?.getAsFile === 'function') {
      try { file = item.getAsFile() || null; } catch {}
    }
    if (!file) continue;

    let entry = null;
    if (typeof item?.webkitGetAsEntry === 'function') {
      try { entry = item.webkitGetAsEntry() || null; } catch {}
    }
    const isDir = Boolean(entry?.isDirectory);
    const size = Number(file.size);
    const isOversized = !isDir && Number.isFinite(size) && size > threshold;

    if (!isOversized) {
      normalFiles.push(file);
      continue;
    }

    let rawPath = '';
    if (typeof getPathForFile === 'function') {
      try { rawPath = String(getPathForFile(file) || ''); } catch {}
    }
    if (!rawPath && typeof file.path === 'string') rawPath = file.path;
    rawPath = rawPath.trim();

    const uri = rawPath ? composerPathToFileUri(rawPath) : '';
    if (!uri) {
      unresolvedOversized.push(file);
      continue;
    }

    if (seenUris.has(uri)) continue;
    seenUris.add(uri);
    oversizedRefs.push({
      file,
      path: rawPath,
      uri,
      name: String(file.name || composerBasename(rawPath) || '').trim(),
      size
    });
  }

  return { oversizedRefs, normalFiles, unresolvedOversized };
}

function composerDismissNativeOverlay(target, doc) {
  if (!target || typeof target.dispatchEvent !== 'function') return;
  const view = doc?.defaultView || (typeof window !== 'undefined' ? window : null);
  const DragEvt = view?.DragEvent || (typeof DragEvent === 'function' ? DragEvent : null);
  const Evt = view?.Event || (typeof Event === 'function' ? Event : null);
  const DT = view?.DataTransfer || (typeof DataTransfer === 'function' ? DataTransfer : null);
  try {
    if (DragEvt) {
      const emptyDt = DT ? new DT() : undefined;
      target.dispatchEvent(new DragEvt('dragleave', { bubbles: true, cancelable: true, relatedTarget: null, ...(emptyDt ? { dataTransfer: emptyDt } : {}) }));
      target.dispatchEvent(new DragEvt('dragend', { bubbles: true, cancelable: false, ...(emptyDt ? { dataTransfer: emptyDt } : {}) }));
      if (emptyDt) {
        target.dispatchEvent(new DragEvt('drop', { bubbles: true, cancelable: true, dataTransfer: emptyDt }));
      }
    } else if (Evt) {
      target.dispatchEvent(new Evt('dragleave', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new Evt('dragend', { bubbles: true }));
    }
  } catch {}
}

function composerForwardViaSyntheticDrop(target, doc, files) {
  if (!target || typeof target.dispatchEvent !== 'function' || !files?.length) return false;
  const view = doc?.defaultView || (typeof window !== 'undefined' ? window : null);
  const DragEvt = view?.DragEvent || (typeof DragEvent === 'function' ? DragEvent : null);
  const DT = view?.DataTransfer || (typeof DataTransfer === 'function' ? DataTransfer : null);
  if (!DragEvt || !DT) return false;
  try {
    const dt = new DT();
    for (const file of files) dt.items.add(file);
    target.dispatchEvent(new DragEvt('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return true;
  } catch {
    return false;
  }
}

export function installComposerOversizedDrop(document, {
  enabled,
  isSupported,
  maxBytes = COMPOSER_OVERSIZED_THRESHOLD_BYTES,
  getPathForFile,
  canInsertReference,
  insertReferences,
  forwardNormalFiles,
  text,
  notify,
  signal
} = {}) {
  if (!document?.addEventListener) return;
  let internalDragActive = false;
  let bypassingSyntheticDrop = false;

  const label = (zh, en) => typeof text === 'function' ? text(zh, en) : en;

  const runBypassing = fn => {
    bypassingSyntheticDrop = true;
    try { return fn(); }
    finally { bypassingSyntheticDrop = false; }
  };

  const onDragStart = () => {
    internalDragActive = true;
  };
  const onDragEnd = () => {
    internalDragActive = false;
  };

  const onDrop = async event => {
    if (bypassingSyntheticDrop) return;
    const wasInternal = internalDragActive;
    internalDragActive = false;
    if (event?.defaultPrevented) return;
    if (typeof enabled === 'function' && !enabled()) return;
    if (typeof isSupported === 'function' && !isSupported()) return;
    if (!isComposerExternalFileDrag(event?.dataTransfer, wasInternal)) return;

    const composerTarget = findComposerDropTarget(document, event.target, event);
    if (!composerTarget) return;

    // Must read DataTransfer files and paths synchronously before any await.
    const { oversizedRefs, normalFiles, unresolvedOversized } = partitionDroppedComposerFiles(event.dataTransfer, {
      getPathForFile,
      maxBytes
    });
    if (!oversizedRefs.length) return;
    if (typeof canInsertReference === 'function' && !canInsertReference(composerTarget)) return;

    event.preventDefault?.();
    event.stopPropagation?.();

    const passthroughFiles = [...normalFiles, ...unresolvedOversized];
    const overlayTarget = event.target || composerTarget;
    let forwardedError = null;

    if (!passthroughFiles.length) {
      runBypassing(() => composerDismissNativeOverlay(overlayTarget, document));
    } else {
      let forwarded = false;
      if (typeof forwardNormalFiles === 'function') {
        try {
          const res = await forwardNormalFiles(passthroughFiles, composerTarget);
          forwarded = res !== false && res?.ok !== false;
        } catch (error) {
          forwardedError = error;
        }
      }
      if (!forwarded && !forwardedError) {
        const syntheticSent = runBypassing(() => composerForwardViaSyntheticDrop(overlayTarget, document, passthroughFiles));
        if (!syntheticSent) runBypassing(() => composerDismissNativeOverlay(overlayTarget, document));
      } else {
        runBypassing(() => composerDismissNativeOverlay(overlayTarget, document));
      }
    }

    if (signal?.aborted) return;

    try {
      await insertReferences?.(oversizedRefs, composerTarget);
      if (signal?.aborted) return;
      const names = oversizedRefs.map(item => item.name || item.path).filter(Boolean).join(', ');
      notify?.({
        title: oversizedRefs.length === 1
          ? label('大文件已作为引用插入', 'Large file inserted as reference')
          : label('已作为引用插入大文件', 'Large files inserted as references'),
        message: names,
        tag: 'agy-composer-oversized-drop'
      });
      if (forwardedError) {
        notify?.({
          title: label('引用到输入框失败', 'Failed to attach file'),
          message: String(forwardedError?.message || ''),
          tag: 'agy-composer-oversized-drop-error'
        });
      }
    } catch (error) {
      if (signal?.aborted) return;
      notify?.({
        title: label('引用到输入框失败', 'Failed to attach file'),
        message: String(error?.message || ''),
        tag: 'agy-composer-oversized-drop-error'
      });
    }
  };

  document.addEventListener('dragstart', onDragStart, { capture: true, signal });
  document.addEventListener('dragend', onDragEnd, { capture: true, signal });
  document.addEventListener('drop', onDrop, { capture: true, signal });
  const win = document.defaultView || (typeof window !== 'undefined' ? window : null);
  win?.addEventListener?.('blur', onDragEnd, { signal });
}
