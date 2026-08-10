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
type WardrobePage = {
  data: {
    mats: Material[];
    owned: string[];
    perfumes: unknown[];
  };
  onLoad(): void;
  toggleMat(event: { currentTarget: { dataset: { n: string } } }): void;
  persist(): void;
  setData(next: Partial<WardrobePage['data']>, callback?: () => void): void;
};

function loadWardrobePage(initialOwned: string[] = []) {
  const source = readFileSync(
    new URL('../miniprogram/pages/wardrobe/wardrobe.js', import.meta.url),
    'utf8',
  );
  const materials: Material[] = [
    { n: '银饰', wx: '金' },
    { n: '珍珠', wx: '水' },
  ];
  const saved: Array<{ mats: string[]; perfumes: unknown[] }> = [];
  let definition: Omit<WardrobePage, 'setData'> | null = null;

  const wardrobe = {
    get: () => ({ mats: [...initialOwned], perfumes: [] }),
    save: (value: { mats: string[]; perfumes: unknown[] }) => saved.push(value),
    marks: () => '',
  };
  const require = (id: string) => {
    if (id === '../../data/materials.js') return materials;
    if (id === '../../data/perfumes.js') return [];
    if (id === '../../utils/wardrobe.js') return wardrobe;
    throw new Error(`未处理的小程序依赖：${id}`);
  };

  vm.runInNewContext(
    source,
    {
      require,
      Page: (value: Omit<WardrobePage, 'setData'>) => {
        definition = value;
      },
      wx: { showToast() {} },
    },
    { filename: 'miniprogram/pages/wardrobe/wardrobe.js' },
  );
  assert.ok(definition);

  const page = definition as unknown as WardrobePage;
  page.setData = function setData(next, callback) {
    this.data = { ...this.data, ...next };
    callback?.();
  };
  return { page, saved };
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
