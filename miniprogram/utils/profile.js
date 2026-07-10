/**
 * 本人档案 · 本地存储层
 * 现在:wx.storage 单机存储;将来云同步只需替换本文件实现,调用方不动。
 * 档案结构:{ date:'YYYY-MM-DD', ti:0-12, gi:0|1, city?:string, lon?:number, hm?:'HH:MM' }
 */
const KEY = 'zhiji-profile';

const get = () => {
  try {
    const p = wx.getStorageSync(KEY);
    return p && p.date ? p : null;
  } catch (e) {
    return null;
  }
};

const save = (p) => wx.setStorageSync(KEY, p);
const clear = () => wx.removeStorageSync(KEY);

/**
 * 构造排盘入参。若 (date,ti,gi) 与档案一致且档案有城市经度+精确时间,
 * 自动升级为真太阳时三件套(引擎会整盘重排,含夏令时/边界预警)。
 */
const personFrom = (date, ti, gi) => {
  const [y, m, d] = date.split('-').map(Number);
  const base = { year: y, month: m, day: d, timeIndex: ti, gender: gi === 0 ? 'male' : 'female' };
  const p = get();
  if (p && p.date === date && p.ti === ti && p.gi === gi && p.lon && p.hm) {
    const [hh, mm] = p.hm.split(':').map(Number);
    return {
      ...base,
      useTrueSolarTime: true,
      birthHour: hh,
      birthMinute: mm,
      birthLongitude: p.lon,
      birthPlace: p.city || '',
    };
  }
  return base;
};

module.exports = { get, save, clear, personFrom };
