// 本地实证命例检索(可选增强):为 AI 解读提示词注入相似古例作类比证据。
// 数据文件不入库(隐私与版权),路径:env MINGYU_CASEBANK_PATH 或 data/casebank.local.jsonl;
// 文件不存在时本模块零影响。行格式(JSONL):
// {book, pillars:["年","月","日","时"], person, gender, strength, yongshen, events:[{when,event}], quote}
import fs from 'node:fs';
import path from 'node:path';

interface LocalCase {
  book: string;
  pillars: [string, string, string, string];
  person?: string;
  gender?: string;
  strength?: string;
  yongshen?: string;
  events?: { when?: string; event?: string }[];
  quote?: string;
}

// 轻量五行表(避免为此引深层依赖)
const STEM_WX: Record<string, string> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const BRANCH_WX: Record<string, string> = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

function shishenClass(dayWx: string, wx: string): string {
  if (wx === dayWx) return '比劫';
  if (SHENG[dayWx] === wx) return '食伤';
  if (KE[dayWx] === wx) return '财';
  if (KE[wx] === dayWx) return '官杀';
  return '印';
}

function profileOf(pillars: string[]): Record<string, number> | null {
  const day = pillars[2];
  const dayWx = STEM_WX[day?.[0] ?? ''];
  if (!dayWx) return null;
  const p: Record<string, number> = { 比劫: 0, 食伤: 0, 财: 0, 官杀: 0, 印: 0 };
  pillars.forEach((pz, i) => {
    const gw = STEM_WX[pz[0]];
    const zw = BRANCH_WX[pz[1]];
    if (gw && i !== 2) p[shishenClass(dayWx, gw)] += 2;
    if (zw) p[shishenClass(dayWx, zw)] += i === 1 ? 1.5 : 1;
  });
  return p;
}

let cache: { mtime: number; cases: (LocalCase & { _p: Record<string, number> | null })[] } | null = null;

function loadCasebank(): (LocalCase & { _p: Record<string, number> | null })[] | null {
  const file = process.env.MINGYU_CASEBANK_PATH ?? path.join(process.cwd(), 'data', 'casebank.local.jsonl');
  try {
    const stat = fs.statSync(file);
    if (cache && cache.mtime === stat.mtimeMs) return cache.cases;
    const cases = fs
      .readFileSync(file, 'utf-8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l) as LocalCase;
        } catch {
          return null;
        }
      })
      .filter((c): c is LocalCase => !!c && Array.isArray(c.pillars) && c.pillars.length === 4)
      .map((c) => ({ ...c, _p: profileOf(c.pillars) }));
    cache = { mtime: stat.mtimeMs, cases };
    return cases;
  } catch {
    return null; // 无本地命例库:静默跳过
  }
}

/** 依四柱检索相似命例,返回可直接拼入提示词的文本段;无库或无命中返回 null */
export function buildSimilarCasesSection(
  pillars: { year: string; month: string; day: string; hour: string },
  topK = 3,
): string | null {
  const bank = loadCasebank();
  if (!bank || !bank.length) return null;
  const q = [pillars.year, pillars.month, pillars.day, pillars.hour];
  const qp = profileOf(q);
  const dayGan = q[2][0];
  const dayWx = STEM_WX[dayGan];
  const monthZhi = q[1][1];
  const scored = bank
    .map((c) => {
      let s = 0;
      const cDay = c.pillars[2][0];
      if (cDay === dayGan) s += 3;
      else if (STEM_WX[cDay] === dayWx) s += 1.5;
      const cMonth = c.pillars[1][1];
      if (cMonth === monthZhi) s += 3;
      else if (BRANCH_WX[cMonth] === BRANCH_WX[monthZhi]) s += 1;
      if (qp && c._p) {
        let dot = 0;
        let na = 0;
        let nb = 0;
        for (const k of ['比劫', '食伤', '财', '官杀', '印']) {
          dot += qp[k] * c._p[k];
          na += qp[k] ** 2;
          nb += c._p[k] ** 2;
        }
        s += 4 * (dot / (Math.sqrt(na * nb) || 1));
      }
      if (c.events?.length) s += 0.5; // 略偏好带已验事件的例
      return { s, c };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, topK);
  if (!scored.length) return null;
  const lines = scored.map(({ c }) => {
    const ev = (c.events ?? [])
      .slice(0, 3)
      .map((e) => `${e.when ?? ''}${e.event ?? ''}`)
      .join(';');
    const quote = (c.quote ?? '').slice(0, 80);
    return `- 《${c.book}》${c.person ?? '佚名'}(${c.pillars.join(' ')})${c.strength && c.strength !== '无' ? ` 断${c.strength}` : ''}${ev ? ` 应事:${ev}` : ''}${quote ? ` 原文:「${quote}」` : ''}`;
  });
  return [
    '【相似古例(引擎按日主/月令/十神结构检索,类比证据)】',
    ...lines,
    '注:古例语境与今不同,引用时须做时代转译;古例只作类比佐证与先验锚定,不作硬结论。',
  ].join('\n');
}

/** 可证伪断语输出规范(所有解读提示词共用的附加要求) */
export const FALSIFIABLE_OUTPUT_SPEC = [
  '【断语规范】',
  '- 每条预测性断语必须给全四件套:结论 + 概率(0~1) + 应期窗口 + 证伪条件(“若……则此断记错”)。',
  '- 证据来源三级标注:[盘面]=排盘事实;[古例]=相似命例(注明书名);[推断]=命理推理。',
  '- 禁:事后倒推(“其实盘里早写了”)、双头下注、宽泛命中邀功、喜忌含糊不落到字、顺着已知实况改口、无应期窗口的断语。',
  '- 层次判断防拔高:证据“强”只支持相应档位,顶格判断须多重顶级信号叠加;好而有瑕取中档。',
].join('\n');
