const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];

Page({
  data: {
    times: TIMES, genders: ['男 (乾造)', '女 (坤造)'],
    date: '1996-11-23', ti: 2, gi: 0, city: '', hm: '',
    preview: null, tsNote: '', hasProfile: false,
  },
  onLoad() {
    const p = profile.get();
    if (p) {
      this.setData({ date: p.date, ti: p.ti, gi: p.gi, city: p.city || '', hm: p.hm || '', hasProfile: true });
      this.renderPreview();
    }
  },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  onCity(e) { this.setData({ city: e.detail.value.trim() }); },
  onHm(e) { this.setData({ hm: e.detail.value.trim() }); },
  save() {
    const { date, ti, gi, city, hm } = this.data;
    const p = { date, ti, gi };
    if (city) {
      const c = MY.lookupCity(city);
      if (!c) { wx.showToast({ title: '城市未收录,可留空', icon: 'none' }); return; }
      p.city = city; p.lon = c.lon;
    }
    if (hm) {
      if (!/^\d{1,2}:\d{2}$/.test(hm)) { wx.showToast({ title: '时间格式 HH:MM', icon: 'none' }); return; }
      p.hm = hm;
    }
    if ((p.lon && !p.hm) || (!p.lon && p.hm)) {
      wx.showToast({ title: '城市与精确时间需同时填写', icon: 'none' }); return;
    }
    profile.save(p);
    this.setData({ hasProfile: true });
    this.renderPreview();
    wx.showToast({ title: '已保存', icon: 'success' });
  },
  clearProfile() {
    profile.clear();
    this.setData({ hasProfile: false, preview: null, city: '', hm: '' });
    wx.showToast({ title: '已清除', icon: 'none' });
  },
  renderPreview() {
    try {
      const person = profile.personFrom(this.data.date, this.data.ti, this.data.gi);
      const r = MY.baziCalculator.calculatePillars(person);
      this.setData({
        preview: null,
      });
      this.setData({
        preview: [
          { n: '年', gz: r.pillars.year.ganZhi }, { n: '月', gz: r.pillars.month.ganZhi },
          { n: '日', gz: r.pillars.day.ganZhi }, { n: '时', gz: r.pillars.hour.ganZhi },
        ],
        tsNote: person.useTrueSolarTime ? '(已启用真太阳时)' : '',
      });
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },
});
