const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];

// 十天干取象与性情(传统主流口径,简语)
const GAN_INFO = {
  甲: ['参天之木', '如乔木栋梁,性直而进,折而不弯'],
  乙: ['花草之木', '如藤萝芝兰,柔韧善绕,逢势而上'],
  丙: ['太阳之火', '如日照万物,热烈坦荡,光明外放'],
  丁: ['灯烛之火', '如灯前之焰,细腻绵长,暗处生明'],
  戊: ['城垣之土', '如高山厚壁,沉稳可倚,不动如山'],
  己: ['田园之土', '如沃土养物,包容细致,润物无声'],
  庚: ['剑戟之金', '如刀剑之刚,果决锋利,宁折不弯'],
  辛: ['珠玉之金', '如金玉之器,清贵精细,柔中藏锋'],
  壬: ['江河之水', '如大川奔流,通达善变,志在千里'],
  癸: ['雨露之水', '如雨露滋物,静水深流,绵密入微'],
};
// 强弱释义 + 喜忌因由(按扶抑主流口径)
const explain = (gan, element, status, fav, unf) => {
  const [img, trait] = GAN_INFO[gan] || ['', ''];
  const strong = status.indexOf('强') > -1 || status.indexOf('旺') > -1;
  const weak = status.indexOf('弱') > -1;
  const statusExp = strong
    ? '生逢其时、同气够多,根基厚,扛得住事,可主动出击'
    : weak
      ? '生不逢时、帮衬偏少,宜借力养势,不宜硬拼'
      : '强弱相当,不偏不倚,可攻可守';
  const why = strong
    ? `${status}之命,不缺帮手,缺的是出口。${fav} 能引你的力量流转生发,故为喜;${unf} 再来则拥塞内耗,故为忌。`
    : weak
      ? `${status}之命,根基尚薄。${fav} 能生你助你,故为喜;${unf} 徒增消耗克伐,故为忌。`
      : `中和之命,贵在平衡。${fav} 顺其势,故为喜;${unf} 破其衡,故为忌。`;
  return [
    { q: '日主', a: `生日那天的天干,即是你本人。你属${gan}${element}——${img},${trait}。` },
    { q: status, a: `看的是全盘之中,帮你的力量多还是耗你的力量多。你的盘${statusExp}。` },
    { q: '喜忌', a: why },
  ];
};

Page({
  data: {
    date: '1996-11-23', times: TIMES, ti: 2, genders: ['男 (乾造)', '女 (坤造)'], gi: 0,
    r: null, busy: false, showForm: false, isSelf: true,
  },
  onLoad() {
    const p = profile.get();
    if (p) this.setData({ date: p.date, ti: p.ti, gi: p.gi });
  },
  onShow() {
    // 无结果或改过档案:按档案(重新)排盘
    const p = profile.get();
    const pk = p ? `${p.date}|${p.ti}|${p.gi}` : '';
    const stale = this.data.r && this.data.isSelf && this._pk !== pk;
    if (p && (!this.data.r || stale) && !this.data.busy) {
      this.setData({ date: p.date, ti: p.ti, gi: p.gi }, () => this.run());
    }
  },
  onShareAppMessage() { return { title: '排个盘,看看你的喜与忌', path: '/pages/paipan/paipan' }; },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  run() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    wx.showLoading({ title: '正在排盘', mask: true });
    setTimeout(() => {
      try {
        const r = MY.baziCalculator.calculateBazi({
          ...profile.personFrom(this.data.date, this.data.ti, this.data.gi),
          strengthModel: 'classic-calibrated',
        });
        const ug = r.analysis.usefulGod;
        const p = profile.get();
        const isSelf = !!p && p.date === this.data.date && p.ti === this.data.ti && p.gi === this.data.gi;
        this._pk = `${this.data.date}|${this.data.ti}|${this.data.gi}`;
        this.setData({ r: null });
        this.setData({
          busy: false, isSelf, showForm: false,
          r: {
            zhus: [
              { n: '年', gz: r.pillars.year.ganZhi }, { n: '月', gz: r.pillars.month.ganZhi },
              { n: '日', gz: r.pillars.day.ganZhi }, { n: '时', gz: r.pillars.hour.ganZhi },
            ],
            dm: r.dayMaster.gan + r.dayMaster.element,
            status: r.analysis.dayMasterStrength.status,
            score: r.analysis.dayMasterStrength.score,
            fav: (ug.favorableWuxing || []).join(''),
            unf: (ug.unfavorableWuxing || []).join(''),
            warnings: r.warnings || [],
            explain: explain(
              r.dayMaster.gan, r.dayMaster.element,
              r.analysis.dayMasterStrength.status,
              (ug.favorableWuxing || []).join('、'),
              (ug.unfavorableWuxing || []).join('、'),
            ),
          },
        }, () => wx.hideLoading());
      } catch (e) {
        wx.hideLoading();
        this.setData({ busy: false });
        wx.showToast({ title: e.message, icon: 'none' });
      }
    }, 80);
  },
});
