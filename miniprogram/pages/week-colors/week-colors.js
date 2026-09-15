const almanac = require('../../utils/today-almanac.js');

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const pad2 = (n) => (n < 10 ? `0${n}` : String(n));

function keyOf(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function disclosureState(day, expanded) {
  const next = Object.assign({}, day);
  next.expanded = expanded;
  next.toggleText = expanded ? '收起详情' : '查看详情';
  next.a11yLabel = `${day.label}${day.date}，${expanded ? '已展开，点按收起' : '点按查看'}穿搭颜色、配饰和香调推荐`;
  return next;
}

Page({
  data: { days: null },
  onShow() {
    const now = new Date();
    const key = keyOf(now);
    if (this._key === key && this.data.days) return;
    this._key = key;
    if (this._buildTimer) clearTimeout(this._buildTimer);
    wx.showLoading({ title: '正在铺色', mask: true });
    this._buildTimer = setTimeout(() => this.build(now), 60);
  },
  onUnload() {
    if (this._buildTimer) clearTimeout(this._buildTimer);
    wx.hideLoading();
  },
  build(baseDate) {
    const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12);
      const common = {
        dateKey: keyOf(d),
        label: i === 0 ? '今天' : i === 1 ? '明天' : `周${WEEK[d.getDay()]}`,
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        today: i === 0,
        currentClass: i === 0 ? 'card-current' : '',
        delayClass: `d${Math.min(i + 1, 6)}`,
      };
      try {
        const daily = almanac.outfitForDate(d);
        days.push(disclosureState(Object.assign({}, common, {
          el: daily.el,
          main: daily.colors.main,
          accent: daily.colors.accent,
          avoidColors: daily.colors.avoid,
          acc: daily.acc,
          scent: daily.scent,
          elementLine: daily.elementLine,
          name: daily.colors.main.length ? daily.colors.main[0].n : '暂无主色',
          unavailable: false,
        }), false));
      } catch (e) {
        days.push(disclosureState(Object.assign({}, common, {
          el: '', main: [], accent: [], avoidColors: [], acc: [], scent: [],
          elementLine: '这一天的推荐暂时无法生成，请稍后再试。',
          name: '暂不可用', unavailable: true,
        }), false));
      }
    }
    this.setData({ days }, () => {
      this._buildTimer = null;
      wx.hideLoading();
    });
  },
  toggleDay(e) {
    const dateKey = e.currentTarget.dataset.dateKey;
    const current = this.data.days || [];
    let found = false;
    let shouldExpand = false;
    for (let i = 0; i < current.length; i++) {
      if (current[i].dateKey === dateKey) {
        found = true;
        shouldExpand = !current[i].expanded;
        break;
      }
    }
    if (!found) return;
    const days = current.map((day) => disclosureState(day, day.dateKey === dateKey && shouldExpand));
    this.setData({ days });
  },
  onShareAppMessage() { return { title: '未来一周每日色卡,提前配好', path: '/pages/week-colors/week-colors' }; },
});
