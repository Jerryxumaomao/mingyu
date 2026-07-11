/**
 * 人生K线 预载与缓存。
 * 18-70 岁全程结果只依赖出生信息、不依赖当天日期,同一档案算一次即可复用:
 * 启动时后台预算(app.js onLaunch),年运页/放大页/首页仪表盘直接秒开。
 */
const MY = require('../lib/mingyu.js');
const profile = require('./profile.js');

const KEY = 'wz-kline';
const keyOf = (date, ti, gi) => `${date}|${ti}|${gi}`;
let mem = null; // 内存一级缓存,避免反复读 storage

/** 命中返回 { natal, years },否则 null */
const get = (date, ti, gi) => {
  const k = keyOf(date, ti, gi);
  if (mem && mem.key === k) return mem;
  try {
    const c = wx.getStorageSync(KEY);
    if (c && c.key === k && c.v === 1) { mem = c; return c; }
  } catch (e) { /* 读不到就现算 */ }
  return null;
};

/** 现算(同步重活,调用方自己决定要不要包 loading/setTimeout) */
const build = (date, ti, gi) => {
  const k = MY.calculateLifeKline(
    { ...profile.personFrom(date, ti, gi), strengthModel: 'classic-calibrated' },
    { startAge: 18, endAge: 70 },
  );
  return { v: 1, key: keyOf(date, ti, gi), natal: k.natal, years: k.years };
};

/** 只为本人档案落盘(帮别人查的不占存储) */
const save = (data) => {
  mem = data;
  const p = profile.get();
  if (p && data.key === keyOf(p.date, p.ti, p.gi)) {
    try { wx.setStorageSync(KEY, data); } catch (e) { /* 内存缓存仍有效 */ }
  }
};

/** 启动预载:有档案且未缓存时后台算一次 */
const preload = () => {
  const p = profile.get();
  if (!p || get(p.date, p.ti, p.gi)) return;
  try { save(build(p.date, p.ti, p.gi)); } catch (e) { /* 预载失败则页面打开时再算 */ }
};

module.exports = { get, build, save, preload };
