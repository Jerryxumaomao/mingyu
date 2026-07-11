const MY = require('../../lib/mingyu.js');

Page({
  // 默认报数起课:让用户带着问题参与,仪式感和随机性都最好。
  // 时间起课同一时辰(2小时)结果相同是规则本身,界面上要讲清楚,免得用户以为坏了。
  data: { methods: ['报数抽签(推荐)', '以时抽签', '随手一抽'], mi: 0, num: '', r: null },
  onShareAppMessage() { return { title: '心里有事?来抽一签', path: '/pages/liuren/liuren' }; },
  onMethod(e) { this.setData({ mi: +e.detail.value, r: null }); },
  onNum(e) { this.setData({ num: e.detail.value }); },
  // 报数起课同数同日结果相同,"再来一卦"必须换数,所以清空回到引导态
  reset() {
    this.setData({ r: null, num: '' });
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
  },
  run() {
    const method = ['number', 'time', 'random'][this.data.mi];
    const params = { method };
    if (method === 'number') {
      const n = parseInt(this.data.num, 10);
      if (!n || n <= 0) { wx.showToast({ title: '先默念所问,再报一数', icon: 'none' }); return; }
      params.number = n;
    }
    try {
      const r = MY.generateXiaoliuren(params);
      const s = r.sequence;
      this.setData({ r: null });
      this.setData({
        r: {
          methodLabel: r.methodLabel, lunarMonth: r.lunarMonth, lunarDay: r.lunarDay, hourLabel: r.hourLabel,
          palaces: [
            { t: '开局', ...s.start }, { t: '过程', ...s.process }, { t: '结果', ...s.result },
          ],
          lines: [
            `起——${s.start.meaning}`,
            `变——${s.process.meaning}`,
            `落——${s.result.meaning}`,
          ],
          advice: s.result.advice, timing: s.result.timing, direction: s.result.direction,
        },
      });
    } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); }
  },
});
