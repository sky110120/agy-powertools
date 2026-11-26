import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { DEFAULT_SETTINGS } from '../lib/settings.mjs';

function picker(loadLocalFonts, fontError = '', language = 'zh-CN', initialOptions = {}) {
  let states = [], index = 0, options = { ...DEFAULT_SETTINGS, language, ...initialOptions };
  const calls = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }), Fragment: 'fragment',
    useState(initial) { const n = index++; if (!(n in states)) states[n] = initial; return [states[n], value => { states[n] = value; }]; },
    useEffect() {}, useSyncExternalStore: (_, snapshot) => snapshot()
  };
  const context = vm.createContext({ React, window: {},
    document: { createElement: () => ({ dataset: {} }), head: { append() {} } },
    HC: 'popover', IC: 'trigger', JC: 'content', kT: 'select', lT: 'select-trigger', mT: 'select-menu', nT: 'select-item',
    Uy: 'button', UP: 'row', TP: 'card', VP: 'section', XP: 'switch', dq: 'icon'
  });
  vm.runInContext(readFileSync(new URL('../lib/native-panels.js', import.meta.url), 'utf8'), context);
  const panels = context.__agyPanels({
    options: () => options, t: value => value, settingsError: () => '', customFontError: () => fontError, loadLocalFonts,
    fontInfo: name => name === 'Test Family' ? { cn: '测试字体', tw: '測試字體', weights: [400, 600, 700] }
      : name === 'Single Weight' ? { cn: '单字重字体', weights: [400] } : {},
    state: () => null,
    async change(patch) { calls.push(JSON.parse(JSON.stringify(patch))); options = { ...options, ...patch }; }
  });
  function all(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(value => all(value, predicate));
    const extras = [node.props?.rightElement, node.props?.extraContent].filter(Boolean);
    return [...predicate(node) ? [node] : [], ...all(node.children, predicate), ...all(extras, predicate)];
  }
  const expand = node => {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(expand);
    if (typeof node.type === 'function') return expand(node.type({ ...(node.props || {}), children: node.children }));
    return {
      ...node,
      props: {
        ...(node.props || {}),
        ...(node.props?.rightElement ? { rightElement: expand(node.props.rightElement) } : {}),
        ...(node.props?.extraContent ? { extraContent: expand(node.props.extraContent) } : {})
      },
      children: Array.isArray(node.children) ? node.children.map(expand) : node.children
    };
  };
  const component = all(panels.Settings(), node => node.type?.name === 'CustomFontSetting')[0].type;
  states = [];
  const render = () => { index = 0; return expand(component()); };
  const byId = (tree, id) => all(tree, node => node.props?.['data-testid'] === id);
  const open = tree => all(tree, node => node.type === 'popover')[0].props.onOpenChange(true);
  return { render, all, byId, open, calls };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('已安装字体搜索和选择，选择后立即保存', async () => {
  let queries = 0;
  const ui = picker(async () => { queries++; return ['Arial', 'Maple Mono NF CN', 'Menlo']; });
  ui.open(ui.render());
  await tick();
  let tree = ui.render();
  assert.equal(ui.byId(tree, 'agy-font-picker-option').length, 3);
  ui.byId(tree, 'agy-font-picker-search')[0].props.onChange({ target: { value: 'mApLe' } });
  tree = ui.render();
  const matches = ui.byId(tree, 'agy-font-picker-option');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].props['data-font-family'], 'Maple Mono NF CN');
  matches[0].props.onClick();
  tree = ui.render();
  assert.equal(ui.byId(tree, 'agy-custom-font-input').length, 0);
  await tick();
  assert.deepEqual(ui.calls, [{ customFont: 'Maple Mono NF CN', customFontWeight: 0 }]);
  ui.open(ui.render());
  await tick();
  assert.equal(queries, 1);
});

test('读取失败、权限拒绝及 API 不可用均明确显示错误，允许主动重试', async () => {
  for (const query of [async () => { throw new Error('此客户端不支持读取已安装字体列表'); }, async () => { throw new Error('用户拒绝字体读取权限'); }, async () => { throw '字体枚举异常'; }]) {
    const ui = picker(query);
    ui.open(ui.render());
    await tick();
    const tree = ui.render();
    assert.equal(ui.byId(tree, 'agy-font-picker-error').length, 1);
    assert.match(ui.byId(tree, 'agy-font-picker-error')[0].children[0], /读取字体失败/);
    assert.equal(ui.byId(tree, 'agy-font-picker-option').length, 0);
  }
  let allowed = false;
  const ui = picker(async () => { if (!allowed) throw new Error('权限被拒绝'); return ['Menlo']; });
  ui.open(ui.render());
  await tick();
  allowed = true;
  ui.byId(ui.render(), 'agy-font-picker-refresh')[0].props.onClick();
  await tick();
  const tree = ui.render();
  assert.equal(ui.byId(tree, 'agy-font-picker-error').length, 0);
  assert.equal(ui.byId(tree, 'agy-font-picker-option').length, 1);
});

test('单排原生控件：仅显示已安装字重且无“已安装”后缀，单字重或默认字体时字重选择器灰显禁用', async () => {
  // 1. Default (no customFont): weight selector is disabled & grayed out
  const uiDefault = picker(async () => ['Test Family', 'Single Weight']);
  let tree = uiDefault.render();
  assert.equal(tree.type, 'row');
  assert.equal(uiDefault.all(tree, n => n.type === 'select' && !n.props?.['data-testid']).length, 0);
  const disabledWeight = uiDefault.byId(tree, 'agy-custom-font-weight')[0];
  assert.equal(disabledWeight.props.disabled, true);

  // 2. Single-weight font: weight selector stays disabled
  const uiSingle = picker(async () => ['Single Weight'], '', 'zh-CN', { customFont: 'Single Weight' });
  tree = uiSingle.render();
  assert.equal(uiSingle.byId(tree, 'agy-custom-font-weight')[0].props.disabled, true);

  // 3. Multi-weight font: native Select shows only Default + available weights (no "已安装" text)
  const uiMulti = picker(async () => ['Test Family'], '字体尚未安装', 'zh-CN', { customFont: 'Test Family' });
  tree = uiMulti.render();
  assert.equal(uiMulti.byId(tree, 'agy-custom-font-error')[0].children[0], '字体尚未安装');
  assert.equal(uiMulti.byId(tree, 'agy-custom-font-save').length, 0);
  assert.equal(uiMulti.byId(tree, 'agy-custom-font-weight')[0].props.disabled, undefined);
  const weightItems = uiMulti.all(tree, n => n.type === 'select-item');
  assert.deepEqual(weightItems.map(n => n.children[0]), ['默认字重', '常规 (400)', '半粗 (600)', '粗体 (700)']);
  assert.equal(weightItems.some(n => String(n.children[0]).includes('已安装')), false);
  await uiMulti.byId(tree, 'agy-custom-font-weight-600')[0].props.onClick();
  uiMulti.open(uiMulti.render());
  await tick();
  await uiMulti.byId(uiMulti.render(), 'agy-custom-font-reset')[0].props.onClick();
  assert.deepEqual(uiMulti.calls, [{ customFontWeight: 600 }, { customFont: '', customFontWeight: 0 }]);

  // 4. Picker isolates translations and observers
  const ui = picker(async () => ['System', 'Terminal']);
  ui.open(ui.render());
  await tick();
  tree = ui.render();
  assert.equal(ui.all(ui.byId(tree, 'agy-font-picker')[0], node => node.props['data-agy-powertools-root'] === 'font-picker').length, 1);
  assert.deepEqual(ui.byId(tree, 'agy-font-picker-option').map(node => node.children[0].children[0]), ['System', 'Terminal']);
  assert.ok(ui.byId(tree, 'agy-font-picker-option').every(node => node.children[0].type === 'span' && node.children[0].props.translate === 'no'));
});

test('字体列表支持上下循环与 Home、End 导航', async () => {
  const ui = picker(async () => ['Arial', 'Inter', 'Menlo']);
  ui.open(ui.render());
  await tick();
  const tree = ui.render(), options = ui.byId(tree, 'agy-font-picker-option');
  let focused = -1;
  const nodes = options.map((_, i) => ({ focus: () => { focused = i; } }));
  nodes.forEach(node => { node.parentElement = { querySelectorAll: () => nodes }; });
  for (const [index, key, expected] of [[0, 'ArrowUp', 2], [2, 'ArrowDown', 0], [1, 'Home', 0], [0, 'End', 2]]) {
    options[index].props.onKeyDown({ key, preventDefault() {}, currentTarget: nodes[index] });
    assert.equal(focused, expected);
  }
});

test('searches both scripts in all UI languages and saves the CSS family', async () => {
  for (const [lang,expected] of [['zh-CN','测试字体'],['zh-TW','測試字體'],['en','Test Family']]) {
    const ui = picker(async()=>['Test Family','Other'],'',lang);
    ui.open(ui.render());
    await tick();
    for (const query of ['测试','測試','tEst']) {
      ui.byId(ui.render(),'agy-font-picker-search')[0].props.onChange({target:{value:query}});
      const matches = ui.byId(ui.render(),'agy-font-picker-option');
      assert.equal(matches.length,1);
      assert.equal(matches[0].children[0].children[0],expected);
      assert.equal(matches[0].children[0].props.style.fontFamily,'"Test Family"');
    }
    ui.byId(ui.render(),'agy-font-picker-option')[0].props.onClick();
    await tick();
    assert.deepEqual(ui.calls,[{customFont:'Test Family',customFontWeight:0}]);
    assert.equal(ui.byId(ui.render(),'agy-font-picker-trigger')[0].children[0].children[0],expected);
  }
});
