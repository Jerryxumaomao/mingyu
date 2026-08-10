/**
 * 小程序衣橱材质交互回归测试。
 *
 * 页面脚本是微信小程序 CommonJS；测试用 vm 注入 Page/wx 与依赖，模拟真机上的
 * onLoad、点击切换和本地持久化，避免模板选中态再次依赖 WXML 方法调用。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

type Material = { n: string; wx: string; selected?: boolean };
type Perfume = { n: string; en: string; wx: string[]; f: string };
type AiPerfume = {
  n: string;
  f: string;
  wx: string[];
  notesText?: string;
  sourceLabel: string;
  sources: unknown[];
};
type AiResponse = {
  ok: boolean;
  source?: string;
  perfume?: AiPerfume;
  usage?: { total_tokens?: number } | null;
  code?: string;
  message?: string;
};
type WardrobePage = {
  data: {
    mats: Material[];
    owned: string[];
    perfumes: Array<{ n: string; wx: string[]; f: string }>;
    kw: string;
    results: Perfume[];
    showCustom: boolean;
    customName: string;
    aiLoading: boolean;
    aiError: string;
    aiResult: AiPerfume | null;
    aiQuery: string;
  };
  onLoad(): void;
  toggleMat(event: { currentTarget: { dataset: { n: string } } }): void;
  onKw(event: { detail: { value: string } }): void;
  lookupPerfume(): Promise<unknown>;
  confirmAiPerfume(): void;
  addCustom(): void;
  persist(): void;
  setData(next: Partial<WardrobePage['data']>, callback?: () => void): void;
};

function loadWardrobePage(
  initialOwned: string[] = [],
  options: {
    localPerfumes?: Perfume[];
    resolvePerfume?: (name: string) => Promise<AiResponse>;
  } = {},
) {
  const source = readFileSync(
    new URL('../miniprogram/pages/wardrobe/wardrobe.js', import.meta.url),
    'utf8',
  );
  const materials: Material[] = [
    { n: '银饰', wx: '金' },
    { n: '珍珠', wx: '水' },
  ];
  const saved: Array<{ mats: string[]; perfumes: unknown[] }> = [];
  const toasts: Array<{ title: string; icon: string }> = [];
  let definition: Omit<WardrobePage, 'setData'> | null = null;

  const wardrobe = {
    get: () => ({ mats: [...initialOwned], perfumes: [] }),
    save: (value: { mats: string[]; perfumes: unknown[] }) => saved.push(value),
    marks: () => '',
  };
  const require = (id: string) => {
    if (id === '../../data/materials.js') return materials;
    if (id === '../../data/perfumes.js') return options.localPerfumes ?? [];
    if (id === '../../utils/wardrobe.js') return wardrobe;
    if (id === '../../utils/perfume-ai.js') {
      return {
        normalizeQuery: (value: unknown) =>
          String(value || '')
            .trim()
            .replace(/\s+/g, ' '),
        resolvePerfume:
          options.resolvePerfume ?? (() => Promise.reject(new Error('测试未提供香水识别响应'))),
      };
    }
    throw new Error(`未处理的小程序依赖：${id}`);
  };

  vm.runInNewContext(
    source,
    {
      require,
      Page: (value: Omit<WardrobePage, 'setData'>) => {
        definition = value;
      },
      wx: {
        showToast(value: { title: string; icon: string }) {
          toasts.push(value);
        },
      },
    },
    { filename: 'miniprogram/pages/wardrobe/wardrobe.js' },
  );
  assert.ok(definition);

  const page = definition as unknown as WardrobePage;
  page.setData = function setData(next, callback) {
    this.data = { ...this.data, ...next };
    callback?.();
  };
  return { page, saved, toasts };
}

type PerfumeAiModule = {
  resolvePerfume(name: string): Promise<AiResponse>;
};

function loadPerfumeAi(
  request: (options: {
    url: string;
    method: string;
    data: Record<string, unknown>;
    header: Record<string, string>;
    success(response: { statusCode: number; data: unknown }): void;
    fail(): void;
    complete(): void;
  }) => void,
) {
  const source = readFileSync(
    new URL('../miniprogram/utils/perfume-ai.js', import.meta.url),
    'utf8',
  );
  const module = { exports: {} as PerfumeAiModule };
  vm.runInNewContext(
    source,
    { module, exports: module.exports, wx: { request } },
    { filename: 'miniprogram/utils/perfume-ai.js' },
  );
  return module.exports;
}

function loadWardrobeStorage(stored: unknown) {
  const source = readFileSync(new URL('../miniprogram/utils/wardrobe.js', import.meta.url), 'utf8');
  const module = { exports: {} as { get?: () => { mats: string[]; perfumes: unknown[] } } };
  const require = (id: string) => {
    if (id === '../data/materials.js') return [];
    throw new Error(`未处理的小程序依赖：${id}`);
  };
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      require,
      wx: {
        getStorageSync: () => stored,
        setStorageSync() {},
      },
    },
    { filename: 'miniprogram/utils/wardrobe.js' },
  );
  assert.equal(typeof module.exports.get, 'function');
  return module.exports.get();
}

test('衣橱加载时把已拥有材质映射为模板可直接读取的 selected 布尔值', () => {
  const { page } = loadWardrobePage(['银饰']);
  page.onLoad();

  assert.deepEqual(
    page.data.mats.map(({ n, selected }) => ({ n, selected })),
    [
      { n: '银饰', selected: true },
      { n: '珍珠', selected: false },
    ],
  );
});

test('点击材质会同步选中态、拥有清单和本地存储，再点一次可取消', () => {
  const { page, saved } = loadWardrobePage();
  page.onLoad();

  page.toggleMat({ currentTarget: { dataset: { n: '珍珠' } } });
  assert.deepEqual([...page.data.owned], ['珍珠']);
  assert.equal(page.data.mats.find((item) => item.n === '珍珠')?.selected, true);
  assert.deepEqual(
    { mats: [...(saved.at(-1)?.mats ?? [])], perfumes: [...(saved.at(-1)?.perfumes ?? [])] },
    { mats: ['珍珠'], perfumes: [] },
  );

  page.toggleMat({ currentTarget: { dataset: { n: '珍珠' } } });
  assert.deepEqual([...page.data.owned], []);
  assert.equal(page.data.mats.find((item) => item.n === '珍珠')?.selected, false);
  assert.deepEqual(
    { mats: [...(saved.at(-1)?.mats ?? [])], perfumes: [...(saved.at(-1)?.perfumes ?? [])] },
    { mats: [], perfumes: [] },
  );
});

test('WXML 选中态不再调用数组方法', () => {
  const template = readFileSync(
    new URL('../miniprogram/pages/wardrobe/wardrobe.wxml', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(template, /\.indexOf\s*\(/);
  assert.match(template, /item\.selected/);
});

test('旧缓存只有 mats 时自动补为空香水架，不阻断衣橱页面加载', () => {
  const result = loadWardrobeStorage({ mats: ['银饰'] });
  assert.deepEqual([...result.mats], ['银饰']);
  assert.deepEqual([...result.perfumes], []);
});

test('香水本地库命中时不显示 AI 查询入口，也不发起联网识别', () => {
  let aiCalls = 0;
  const { page } = loadWardrobePage([], {
    localPerfumes: [
      {
        n: '祖玛珑 蓝风铃',
        en: 'jo malone wild bluebell',
        wx: ['水', '木', '金'],
        f: '清凉花香水感',
      },
    ],
    resolvePerfume: async () => {
      aiCalls += 1;
      return { ok: false };
    },
  });
  page.onLoad();
  page.onKw({ detail: { value: '蓝风铃' } });

  assert.equal(page.data.results.length, 1);
  assert.equal(page.data.showCustom, false);
  assert.equal(aiCalls, 0);
});

test('本地无结果时仅在用户主动点击后识别，确认前不写入衣橱', async () => {
  let aiCalls = 0;
  const { page, saved } = loadWardrobePage([], {
    resolvePerfume: async (name) => {
      aiCalls += 1;
      assert.equal(name, '冷门香水 2026');
      return {
        ok: true,
        source: 'ai',
        perfume: {
          n: '冷门香水 2026',
          f: '冷冽草本木质',
          wx: ['木', '金', '水'],
          sourceLabel: '官方资料',
          sources: [{ title: '品牌官网' }],
        },
        usage: { total_tokens: 318 },
      };
    },
  });
  page.onLoad();
  page.onKw({ detail: { value: '冷门香水 2026' } });

  assert.equal(page.data.showCustom, true);
  assert.equal(aiCalls, 0);
  const lookup = page.lookupPerfume();
  assert.equal(page.data.aiLoading, true);
  await lookup;

  assert.equal(aiCalls, 1);
  assert.equal(page.data.aiLoading, false);
  assert.equal(page.data.aiResult?.sourceLabel, '官方资料');
  assert.equal(saved.length, 0, 'AI 结果只能预览，不能自动保存');

  page.confirmAiPerfume();
  assert.equal(saved.length, 1);
  const savedPerfumes = saved.at(-1)?.perfumes as Array<{ n: string; f: string; wx: string[] }>;
  assert.deepEqual(
    { n: savedPerfumes[0].n, f: savedPerfumes[0].f, wx: [...savedPerfumes[0].wx] },
    { n: '冷门香水 2026', f: '冷冽草本木质', wx: ['木', '金', '水'] },
  );
});

test('证据不足时给出明确提示并保留手动分组入口', async () => {
  const { page, saved } = loadWardrobePage([], {
    resolvePerfume: async () => ({
      ok: false,
      code: 'insufficient_evidence',
      message: '没有找到足够可靠的公开资料。',
    }),
  });
  page.onLoad();
  page.onKw({ detail: { value: '只有昵称的香水' } });
  await page.lookupPerfume();

  assert.equal(page.data.showCustom, true);
  assert.match(page.data.aiError, /可靠/);
  assert.equal(page.data.aiResult, null);

  page.addCustom();
  assert.equal(saved.length, 1);
  const savedPerfumes = saved.at(-1)?.perfumes as Array<{ n: string; f: string; wx: string[] }>;
  assert.equal(savedPerfumes[0].n, '只有昵称的香水');
  assert.deepEqual([...savedPerfumes[0].wx], ['木']);
});

test('请求层只发送香水名，并合并及缓存同一输入的请求', async () => {
  const requests: Array<Parameters<Parameters<typeof loadPerfumeAi>[0]>[0]> = [];
  const api = loadPerfumeAi((options) => requests.push(options));

  const first = api.resolvePerfume('  Maison   Test 01 ');
  const second = api.resolvePerfume('maison test 01');
  assert.equal(requests.length, 1);
  assert.equal(first, second, '并发的同名查询应复用同一个 Promise');
  assert.equal(requests[0].url, 'https://askqiankun.com/api/miniprogram/perfumes/resolve');
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual({ ...requests[0].data }, { query: 'Maison Test 01' });
  assert.deepEqual({ ...requests[0].header }, { 'content-type': 'application/json' });

  requests[0].success({
    statusCode: 200,
    data: {
      ok: true,
      source: 'ai',
      perfume: {
        name: 'Maison Test 01',
        fragranceFamily: '清透木质调',
        notes: {
          top: ['柑橘', '杜松'],
          middle: ['冷杉', '鸢尾'],
          base: ['雪松', '麝香', '琥珀'],
        },
        wuxing: ['金', '木'],
        evidenceLevel: 'mixed',
        sources: [
          { title: '品牌页', url: 'https://example.com/official' },
          { title: '零售商资料', url: 'https://example.com/shop' },
          { title: '香水资料库', url: 'https://example.com/database' },
          { title: '不应下发的第四条', url: 'https://example.com/fourth' },
        ],
      },
      usage: { prompt_tokens: 210, completion_tokens: 42, total_tokens: 252 },
    },
  });
  requests[0].complete();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.perfume?.sourceLabel, '多源交叉资料');
  assert.deepEqual([...(a.perfume?.wx ?? [])], ['金', '木']);
  assert.equal(a.perfume?.notesText, '柑橘、杜松、冷杉、鸢尾、雪松、麝香');
  assert.equal(a.perfume?.sources.length, 3);
  assert.equal(b.usage?.total_tokens, 252);

  await api.resolvePerfume('Maison Test 01');
  assert.equal(requests.length, 1, '成功结果应从会话缓存读取，不应再次请求');
});

test('WXML 只在本地无结果分支提供 AI 查询，并要求确认后上架', () => {
  const template = readFileSync(
    new URL('../miniprogram/pages/wardrobe/wardrobe.wxml', import.meta.url),
    'utf8',
  );
  assert.match(template, /wx:if="\{\{showCustom\}\}"[\s\S]*bindtap="lookupPerfume"/);
  assert.match(template, /wx:if="\{\{aiResult\}\}"[\s\S]*bindtap="confirmAiPerfume"/);
  assert.match(template, /bindtap="addCustom"/);
  assert.match(template, /联网识别香调/);
  assert.match(template, /maxlength="80"/);
  assert.match(template, /主要香材/);
  assert.match(template, /资料出处/);
  assert.doesNotMatch(template, /token/i);
});
