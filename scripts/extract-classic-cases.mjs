/**
 * 从《滴天髓阐微》《子平真诠评注》纯文本中提取命例候选
 *
 * 识别:连续 3 行单干支 + 第 4 行单/双干支(时柱[+首步大运])→ 四柱;
 * 跳过随后的大运干支行;抓取批语段。
 * 旺衰标签:仅按"身/日主/日元"锚定的关键词粗分类,带否定词防误判;
 * 两可/无定论的一律丢弃。输出 JSONL 供人工复核。
 *
 * 用法:node scripts/extract-classic-cases.mjs <txt路径> <书名> > out.jsonl
 */
import { readFileSync } from 'node:fs';

const [, , path, book] = process.argv;
if (!path || !book) {
  console.error('用法: node scripts/extract-classic-cases.mjs <txt路径> <书名>');
  process.exit(1);
}

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const isGz = (s) => s.length === 2 && GAN.includes(s[0]) && ZHI.includes(s[1]);

const raw = readFileSync(path, 'utf8');
const lines = raw.split(/\r?\n/).map((l) => l.replace(/[\s　]+/g, ''));

const STRONG = /(身旺|身强|日主旺|日元旺|旺之极|从强|专旺|日主愈旺|身财并旺|印绶身旺|通根身旺|日主不弱)/;
const WEAK = /(身弱|身衰|日主弱|日元弱|日主衰|休囚已极|休囚极矣|衰极|弃命|从财|从杀|从儿|从势|杀重身轻|财多身弱|满局.{0,4}泄)/;
const NEG_GUARD = /[非不无未虽岂](.{0,2})(身旺|身强|身弱|身衰)/;

const cases = [];
let i = 0;
while (i < lines.length - 4) {
  if (isGz(lines[i]) && isGz(lines[i + 1]) && isGz(lines[i + 2])) {
    const l4 = lines[i + 3];
    let hour = null;
    if (isGz(l4)) hour = l4;
    else if (l4.length === 4 && isGz(l4.slice(0, 2)) && isGz(l4.slice(2))) hour = l4.slice(0, 2);
    if (hour) {
      const pillars = [lines[i], lines[i + 1], lines[i + 2], hour];
      // 跳过大运干支行
      let j = i + 4;
      while (j < lines.length && (isGz(lines[j]) || lines[j] === '')) j++;
      // 收批语(到下一个空行组/下一命例头)
      let comment = '';
      let k = j;
      while (k < lines.length && comment.length < 600) {
        if (lines[k] === '' && comment.length > 0) break;
        if (isGz(lines[k])) break;
        comment += lines[k];
        k++;
      }
      if (comment.length >= 30) {
        const hasStrong = STRONG.test(comment);
        const hasWeak = WEAK.test(comment);
        const negated = NEG_GUARD.test(comment);
        let label = null;
        if (hasStrong && !hasWeak && !negated) label = '强';
        else if (hasWeak && !hasStrong && !negated) label = '弱';
        if (label) {
          const kw = (label === '强' ? STRONG : WEAK).exec(comment);
          const pos = kw ? comment.indexOf(kw[0]) : 0;
          const ctx = comment.slice(Math.max(0, pos - 20), pos + kw[0].length + 10);
          // 反驳/转述守卫:"似乎X,不知…"、"岂知"、"谬以X论"是在否定该判断;
          // "前造/后造"是在说别的盘 → 全部丢弃
          const refuted = /(似乎|岂知|不知|谬|误|俗以|俗论|若作|前造|后造|彼则|此则)/.test(ctx);
          if (!refuted) {
            cases.push({
              book,
              pillars,
              expected: label,
              keyword: kw?.[0] ?? '',
              quote: comment.slice(Math.max(0, pos - 40), pos + 60),
            });
          }
        }
      }
      i = j;
      continue;
    }
  }
  i++;
}

console.error(`${book}: 提取 ${cases.length} 例(强 ${cases.filter((c) => c.expected === '强').length} / 弱 ${cases.filter((c) => c.expected === '弱').length})`);
for (const c of cases) console.log(JSON.stringify(c));
