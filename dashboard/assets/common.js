/* 看板共享工具 */
const $ = (s, root) => (root || document).querySelector(s);
const TIME_OPTIONS = [
  [0, '早子时 00:00-01:00'], [1, '丑时 01:00-03:00'], [2, '寅时 03:00-05:00'],
  [3, '卯时 05:00-07:00'], [4, '辰时 07:00-09:00'], [5, '巳时 09:00-11:00'],
  [6, '午时 11:00-13:00'], [7, '未时 13:00-15:00'], [8, '申时 15:00-17:00'],
  [9, '酉时 17:00-19:00'], [10, '戌时 19:00-21:00'], [11, '亥时 21:00-23:00'],
  [12, '晚子时 23:00-24:00'],
];

/* 生成一组出生信息表单,prefix 区分多人(合婚) */
function birthFormHTML(prefix, title) {
  const opts = TIME_OPTIONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  return `<div class="card"><b style="color:var(--gold)">${title || '出生信息'}</b>
  <div class="row">
    <div><label>年</label><input id="${prefix}-y" type="number" value="1996"></div>
    <div><label>月</label><input id="${prefix}-m" type="number" min="1" max="12" value="11"></div>
    <div><label>日</label><input id="${prefix}-d" type="number" min="1" max="31" value="23"></div>
  </div>
  <div class="row">
    <div><label>时辰</label><select id="${prefix}-t">${opts}</select></div>
    <div><label>性别</label><select id="${prefix}-g"><option value="male">男 (乾造)</option><option value="female">女 (坤造)</option></select></div>
  </div>
  <div class="row">
    <div><label>出生城市(可选,自动经度→真太阳时)</label><input id="${prefix}-city" placeholder="如:长春 / 深圳"></div>
    <div><label>精确时间(启用真太阳时必填)</label><input id="${prefix}-hm" placeholder="如 03:15"></div>
  </div></div>`;
}

function personFromForm(prefix) {
  const p = {
    year: +$(`#${prefix}-y`).value, month: +$(`#${prefix}-m`).value, day: +$(`#${prefix}-d`).value,
    timeIndex: +$(`#${prefix}-t`).value, gender: $(`#${prefix}-g`).value,
  };
  const city = $(`#${prefix}-city`).value.trim();
  const hm = $(`#${prefix}-hm`).value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (city && hm) {
    const c = MY.lookupCity(city);
    if (c) {
      p.useTrueSolarTime = true;
      p.birthHour = +hm[1]; p.birthMinute = +hm[2];
      p.birthLongitude = c.lon; p.birthPlace = city;
    }
  }
  return p;
}

function pillarsHTML(pillars) {
  const cells = [['年柱', pillars.year], ['月柱', pillars.month], ['日柱', pillars.day], ['时柱', pillars.hour]];
  return `<div class="pillars">${cells.map(([n, p]) => `<div class="p"><span>${n}</span><b>${p.ganZhi}</b></div>`).join('')}</div>`;
}

function headerHTML(active) {
  const items = [['index', '总览'], ['paipan', '排盘'], ['kline', '人生K线'], ['hehun', '合婚'], ['liuren', '小六壬'], ['outfit', '五行穿搭']];
  return `<a class="logo" href="index.html">知 几</a><nav>${items
    .map(([f, n]) => `<a href="${f}.html" class="${f === active ? 'on' : ''}">${n}</a>`).join('')}</nav>
  <button class="theme-btn" onclick="toggleTheme()">${currentTheme() === 'paper' ? '🌙 水墨' : '📜 宣纸'}</button>`;
}

/* 主题:水墨(默认暗)/ 宣纸(亮,古籍气质),localStorage 记忆 */
function currentTheme() { try { return localStorage.getItem('my-theme') || 'paper'; } catch { return 'paper'; } }
function applyTheme() {
  if (currentTheme() === 'paper') document.documentElement.setAttribute('data-theme', 'paper');
  else document.documentElement.removeAttribute('data-theme');
}
function toggleTheme() {
  try { localStorage.setItem('my-theme', currentTheme() === 'paper' ? 'ink' : 'paper'); } catch {}
  applyTheme();
  const btn = document.querySelector('.theme-btn');
  if (btn) btn.textContent = currentTheme() === 'paper' ? '🌙 水墨' : '📜 宣纸';
}
/* CSS 变量读取(供 SVG/canvas 取当前主题色) */
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
applyTheme();
