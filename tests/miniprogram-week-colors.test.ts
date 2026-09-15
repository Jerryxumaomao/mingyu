/** 小程序未来一周色卡详情与展开交互回归测试。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

type Color = { n: string; c: string };
type WeekDay = {
  dateKey: string;
  label: string;
  date: string;
  main: Color[];
  accent: Color[];
  avoidColors: Color[];
  acc: string[];
  scent: string[];
  expanded: boolean;
  toggleText: string;
};
type WeekPage = {
  data: { days: WeekDay[] | null };
  build(date: Date): void;
  toggleDay(event: { currentTarget: { dataset: { dateKey: string } } }): void;
  setData(next: Partial<WeekPage['data']>, callback?: () => void): void;
};

function loadAlmanac() {
  const source = readFileSync(
    new URL('../miniprogram/utils/today-almanac.js', import.meta.url),
    'utf8',
  );
  const module = { exports: {} as Record<string, unknown> };
  const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const require = (id: string) => {
    if (id === '../lib/mingyu.js') {
      return {
        baziCalculator: {
          calculatePillars: ({ day }: { day: number }) => {
            const dayZhi = zhi[day % zhi.length];
            return {
              pillars: {
                day: { ganZhi: `甲${dayZhi}`, gan: '甲', zhi: dayZhi },
                month: { ganZhi: '庚子', gan: '庚', zhi: '子' },
              },
            };
          },
        },
        recommendOutfit: ({ dayZhi }: { dayZhi: string }) => ({
          colors: {
            main: [`红色${dayZhi}`, '橙色', '紫色', '酒红'],
            accent: ['白色', '银色', '金色'],
            avoid: ['绿色', '青色', '原木色', '薄荷绿'],
          },
          accessories: ['银饰', '白金', '金属链', '圆形元素', '黑曜石', '海蓝宝', '蓝宝石'],
          scents: { families: ['醛香调', '清冽白木', '海洋水生调', '清凉调', '草木香'] },
        }),
      };
    }
    if (id === './colormap.js') {
      return {
        WX_COLOR: { 木: '#3f7050', 火: '#b5432f', 土: '#8a6a3b', 金: '#b8952e', 水: '#3a5f7d' },
        hexOf: (name: string) => (name.includes('红') ? '#b5432f' : '#d8cdb4'),
      };
    }
    throw new Error(`未处理的小程序依赖：${id}`);
  };

  vm.runInNewContext(
    source,
    { module, exports: module.exports, require, Date },
    {
      filename: 'miniprogram/utils/today-almanac.js',
    },
  );
  return module.exports as {
    outfitForDate(date: Date): {
      el: string;
      colors: { main: Color[]; accent: Color[]; avoid: Color[] };
      acc: string[];
      scent: string[];
      elementLine: string;
    };
  };
}

function loadWeekPage() {
  const source = readFileSync(
    new URL('../miniprogram/pages/week-colors/week-colors.js', import.meta.url),
    'utf8',
  );
  const almanac = loadAlmanac();
  let definition: Omit<WeekPage, 'setData'> | null = null;
  let hidden = 0;
  const require = (id: string) => {
    if (id === '../../utils/today-almanac.js') return almanac;
    throw new Error(`未处理的小程序依赖：${id}`);
  };

  vm.runInNewContext(
    source,
    {
      require,
      Date,
      setTimeout,
      clearTimeout,
      Page: (value: Omit<WeekPage, 'setData'>) => {
        definition = value;
      },
      wx: {
        showLoading() {},
        hideLoading() {
          hidden += 1;
        },
      },
    },
    { filename: 'miniprogram/pages/week-colors/week-colors.js' },
  );
  assert.ok(definition);
  const page = definition as unknown as WeekPage;
  page.setData = function setData(next, callback) {
    this.data = { ...this.data, ...next };
    callback?.();
  };
  return { page, hidden };
}

test('固定日期可生成跨年的连续七天，且每一天都带完整详情', () => {
  const loaded = loadWeekPage();
  loaded.page.build(new Date(2026, 11, 29, 12));
  const days = loaded.page.data.days ?? [];

  assert.deepEqual(
    [...days.map((day) => day.dateKey)],
    [
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
    ],
  );
  assert.equal(new Set(days.map((day) => day.dateKey)).size, 7);
  for (const day of days) {
    assert.equal(day.main.length, 3);
    assert.equal(day.accent.length, 2);
    assert.equal(day.avoidColors.length, 3);
    assert.equal(day.acc.length, 6);
    assert.equal(day.scent.length, 4);
    assert.equal(day.expanded, false);
  }
  assert.match(days[0].main[0].n, /巳/);
  assert.match(days[1].main[0].n, /午/);
});

test('七张卡都可单独展开，再点当前卡会收起，非法键不改变状态', () => {
  const { page } = loadWeekPage();
  page.build(new Date(2026, 11, 29, 12));
  const keys = (page.data.days ?? []).map((day) => day.dateKey);

  for (const key of keys) {
    page.toggleDay({ currentTarget: { dataset: { dateKey: key } } });
    const expanded = (page.data.days ?? []).filter((day) => day.expanded);
    assert.equal(expanded.length, 1);
    assert.equal(expanded[0].dateKey, key);
    assert.equal(expanded[0].toggleText, '收起详情');
  }

  const lastKey = keys.at(-1) ?? '';
  page.toggleDay({ currentTarget: { dataset: { dateKey: lastKey } } });
  assert.equal(
    (page.data.days ?? []).some((day) => day.expanded),
    false,
  );
  const before = JSON.stringify(page.data.days);
  page.toggleDay({ currentTarget: { dataset: { dateKey: 'not-a-day' } } });
  assert.equal(JSON.stringify(page.data.days), before);
});

test('模板把摘要设为可点击入口，并完整呈现颜色、配饰与香调详情', () => {
  const template = readFileSync(
    new URL('../miniprogram/pages/week-colors/week-colors.wxml', import.meta.url),
    'utf8',
  );

  assert.match(template, /wx:key="dateKey"/);
  assert.match(template, /data-date-key="\{\{item\.dateKey\}\}" bindtap="toggleDay"/);
  assert.match(template, /wx:if="\{\{item\.expanded\}\}"/);
  assert.match(template, /宜作主色/);
  assert.match(template, /适合点缀/);
  assert.match(template, /当天别碰/);
  assert.match(template, /\{\{item\.acc\}\}/);
  assert.match(template, /\{\{item\.scent\}\}/);
  assert.match(template, /仅供文化研究与娱乐/);
});
