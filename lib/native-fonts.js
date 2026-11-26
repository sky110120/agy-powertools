(() => {
  // Family names are display aliases only. CSS and settings always use the enumerated family.
  const aliases = new Map(`Microsoft YaHei|微软雅黑|微軟雅黑
Microsoft YaHei UI|微软雅黑 UI|微軟雅黑 UI
SimSun|宋体|宋體
NSimSun|新宋体|新宋體
SimHei|黑体|黑體
KaiTi|楷体|楷體
FangSong|仿宋
DengXian|等线|等線
YouYuan|幼圆|幼圓
LiSu|隶书|隸書
STSong|华文宋体|華文宋體
STHeiti|华文黑体|華文黑體
STKaiti|华文楷体|華文楷體
STFangsong|华文仿宋|華文仿宋
STXihei|华文细黑|華文細黑
STZhongsong|华文中宋|華文中宋
PingFang SC|苹方 简|蘋方 簡
PingFang TC|苹方 繁|蘋方 繁
PingFang HK|苹方 港|蘋方 港
Hiragino Sans GB|冬青黑体简体中文|冬青黑體簡體中文
Songti SC|宋体 简|宋體 簡
Songti TC|宋体 繁|宋體 繁
Kaiti SC|楷体 简|楷體 簡
Kaiti TC|楷体 繁|楷體 繁
Heiti SC|黑体 简|黑體 簡
Heiti TC|黑体 繁|黑體 繁
Yuanti SC|圆体 简|圓體 簡
Lantinghei SC|兰亭黑 简|蘭亭黑 簡
Noto Sans SC|思源黑体|思源黑體
Noto Sans CJK SC|思源黑体|思源黑體
Noto Serif SC|思源宋体|思源宋體
Noto Serif CJK SC|思源宋体|思源宋體
Source Han Sans SC|思源黑体|思源黑體
Source Han Serif SC|思源宋体|思源宋體
LXGW WenKai|霞鹜文楷|霞鶩文楷
LXGW WenKai Mono|霞鹜文楷等宽|霞鶩文楷等寬
HarmonyOS Sans SC|鸿蒙黑体|鴻蒙黑體
MiSans|MiSans
Alibaba PuHuiTi|阿里巴巴普惠体|阿里巴巴普惠體
Sarasa Gothic SC|更纱黑体 SC|更紗黑體 SC
Sarasa Mono SC|等距更纱黑体 SC|等距更紗黑體 SC
Smiley Sans|得意黑
Maple Mono NF CN|枫叶等宽 NF CN|楓葉等寬 NF CN`.split('\n').map(row => {
    const [family, cn, tw = cn] = row.split('|');
    return [family.toLowerCase(), { cn, tw }];
  }));

  async function localizedNames(face) {
    const blob = await face.blob();
    async function read(start, size) {
      if (size > 1048576 || start + size > blob.size) throw new RangeError('Font table bounds');
      return new DataView(await blob.slice(start, start + size).arrayBuffer());
    }
    const header = await read(0, 12);
    const collection = header.getUint32(0) === 0x74746366;
    const count = collection ? header.getUint32(8) : 1;
    if (count > 256) return {};
    const offsets = collection && await read(12, 4 * count);
    for (let i = 0; i < count; i++) {
      const start = collection ? offsets.getUint32(i * 4) : 0;
      const tables = (start ? await read(start, 12) : header).getUint16(4);
      const directory = await read(start + 12, tables * 16);
      for (let j = 0; j < directory.byteLength; j += 16) {
        if (directory.getUint32(j) !== 0x6e616d65) continue;
        const names = await read(directory.getUint32(j+8), directory.getUint32(j+12));
        const values = {}, rank = {};
        let matched = !collection;
        for (let k = 0; k < names.getUint16(2); k++) {
          const p = 6 + 12*k, platform = names.getUint16(p), encoding = names.getUint16(p+2);
          if (platform !== 0 && !(platform === 3 && [0,1,10].includes(encoding))) continue;
          const lang = names.getUint16(p+4), id = names.getUint16(p+6);
          if (![1,6,16].includes(id)) continue;
          const offset = names.getUint16(4) + names.getUint16(p+10), length = names.getUint16(p+8);
          if (length > 512 || offset + length > names.byteLength || length % 2) continue;
          let name = '';
          for (let n=0; n<length; n+=2) name += String.fromCharCode(names.getUint16(offset+n));
          if (!name.trim() || /[\u0000-\u001f\u007f]/.test(name)) continue;
          if (id === 6 ? name === face.postscriptName : name === face.family) matched = true;
          const key = {2052:'cn',1028:'tw',3076:'hk'}[lang];
          if (key && id !== 6 && id > (rank[key] || 0)) { values[key] = name; rank[key] = id; }
        }
        if (matched) return values;
      }
    }
    return {};
  }

  function styleWeight(style = '') {
    const name = style.toLowerCase().replace(/[\s_-]/g,'');
    for (const [pattern, weight] of [[/thin/,100],[/extralight|ultralight/,200],[/light/,300],[/medium/,500],[/semibold|demibold/,600],[/extrabold|ultrabold/,800],[/black|heavy/,900],[/bold/,700],[/regular|normal|book|roman/,400]]) {
      if (pattern.test(name)) return weight;
    }
    return 0;
  }

  function catalog(faces, valid) {
    const byFamily = new Map();
    for (const face of faces) {
      const family = face.family?.trim?.();
      if (!family || !valid(family)) continue;
      if (!byFamily.has(family)) byFamily.set(family, {family, ...aliases.get(family.toLowerCase()), weights:[], face});
      const entry = byFamily.get(family), weight = styleWeight(face.style);
      if (weight && !entry.weights.includes(weight)) entry.weights.push(weight);
    }
    return [...byFamily.values()].sort((a,b) => a.family.localeCompare(b.family));
  }
  globalThis.__agyFontTools = {catalog, localizedNames, alias: family => aliases.get(family.toLowerCase())};
})();
