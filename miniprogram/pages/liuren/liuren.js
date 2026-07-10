const MY = require('../../lib/mingyu.js');

Page({
  data: { methods: ['时间起课(当下时刻)', '报数起课', '随机起课'], mi: 0, num: '', r: null },
  onMethod(e) { this.setData({ mi: +e.detail.value }); },
  onNum(e) { this.setData({ num: e.detail.value }); },
  run() {
    const method = ['time', 'number', 'random'][this.data.mi];
    const params = { method };
    if (method === 'number') {
      const n = parseInt(this.data.num, 10);
      if (!n || n <= 0) { wx.showToast({ title: '请输入正整数', icon: 'none' }); return; }
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
            { t: '天时(起)', ...s.start }, { t: '人事(中)', ...s.process }, { t: '结果(末)', ...s.result },
          ],
          lines: [`起:${s.start.meaning}`, `中:${s.process.meaning}`, `末:${s.result.meaning}`],
          advice: s.result.advice, timing: s.result.timing, direction: s.result.direction,
        },
      });
    } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); }
  },
});
