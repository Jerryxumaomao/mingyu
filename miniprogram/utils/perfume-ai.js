/**
 * 香水文字识别请求层。
 *
 * 只发送用户输入的香水名，不携带衣橱、命盘或任何 API key。相同输入在本次
 * 小程序会话内复用结果，并合并同时发起的请求，避免重复搜索和模型消耗。
 */
const ENDPOINT = 'https://askqiankun.com/api/miniprogram/perfumes/resolve';
const VALID_WUXING = ['木', '火', '土', '金', '水'];
const SOURCE_LABELS = {
  official: '官方资料',
  retailer: '零售商资料',
  mixed: '多源交叉资料',
  community: '社区资料',
  public: '公开资料',
};

const cache = Object.create(null);
const pending = Object.create(null);

const normalizeQuery = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const cacheKey = (value) => normalizeQuery(value).toLowerCase();

const requestError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const normalizeWuxing = (value) => {
  let list = value;
  if (!Array.isArray(list) && list && typeof list === 'object') {
    list = [list.primary, list.secondary, list.minor || list.trace];
  }
  return (Array.isArray(list) ? list : [])
    .filter((item, index, all) => VALID_WUXING.includes(item) && all.indexOf(item) === index)
    .slice(0, 3);
};

const normalizeNotes = (value) => {
  if (!value || typeof value !== 'object') return { notes: null, notesText: '' };
  const notes = {};
  const compact = [];
  ['top', 'middle', 'base'].forEach((layer) => {
    const items = (Array.isArray(value[layer]) ? value[layer] : [])
      .map(normalizeQuery)
      .filter(Boolean)
      .slice(0, 5);
    notes[layer] = items;
    items.forEach((item) => {
      if (!compact.includes(item) && compact.length < 6) compact.push(item);
    });
  });
  return { notes, notesText: compact.join('、') };
};

const normalizeSources = (value) => (Array.isArray(value) ? value : [])
  .map((item) => ({
    title: normalizeQuery(item && item.title),
    url: normalizeQuery(item && item.url),
    level: normalizeQuery(item && item.level),
  }))
  .filter((item) => item.title)
  .slice(0, 3);

const normalizeSuccess = (payload, query) => {
  const raw = payload.perfume || payload.data || payload.result || payload;
  const wx = normalizeWuxing(raw.wuxing || raw.wx);
  const name = normalizeQuery(raw.name || raw.n || query);
  const fragranceFamily = normalizeQuery(raw.fragranceFamily || raw.fragrance || raw.family || raw.f);
  const noteInfo = normalizeNotes(raw.notes);
  if (!name || !fragranceFamily || !wx.length) {
    return {
      ok: false,
      code: 'insufficient_evidence',
      message: '查到的资料不足以可靠判断香调，请手动选择。',
    };
  }

  const evidenceLevel = raw.evidenceLevel || raw.sourceLevel || raw.source_level || 'community';
  const usage = payload.usage || raw.usage || null;
  return {
    ok: true,
    source: payload.source || 'ai',
    perfume: {
      n: name,
      name,
      brand: normalizeQuery(raw.brand),
      edition: normalizeQuery(raw.edition),
      f: fragranceFamily,
      fragranceFamily,
      notes: noteInfo.notes,
      notesText: noteInfo.notesText,
      wx,
      wuxing: wx,
      confidence: raw.confidence,
      evidenceLevel,
      sourceLabel: SOURCE_LABELS[evidenceLevel] || '公开资料',
      sources: normalizeSources(raw.sources),
    },
    usage,
  };
};

const normalizeResponse = (payload, query) => {
  if (!payload || typeof payload !== 'object') {
    throw requestError('服务返回格式异常，请稍后再试。', 'invalid_response');
  }
  if (payload.ok === false) {
    return {
      ok: false,
      code: payload.code || 'not_resolved',
      message: payload.message || '暂时查不到可靠资料，请手动选择。',
    };
  }
  return normalizeSuccess(payload, query);
};

const resolvePerfume = (value) => {
  const query = normalizeQuery(value);
  if (!query) return Promise.reject(requestError('请先填写香水全名。', 'empty_query'));

  const key = cacheKey(query);
  if (cache[key]) {
    return Promise.resolve({
      ...cache[key],
      ...(cache[key].ok ? { source: 'cache', usage: null } : {}),
    });
  }
  if (pending[key]) return pending[key];

  pending[key] = new Promise((resolve, reject) => {
    wx.request({
      url: ENDPOINT,
      method: 'POST',
      data: { query },
      header: { 'content-type': 'application/json' },
      // 搜索和模型提取是串行的；给足单次窗口，避免客户端先超时又重试，反而重复消耗。
      timeout: 35000,
      success(response) {
        const status = response.statusCode || 0;
        if (status < 200 || status >= 300) {
          const message = response.data && response.data.message;
          reject(requestError(message || '联网查询暂时不可用，请手动选择。', `http_${status}`));
          return;
        }
        try {
          const result = normalizeResponse(response.data, query);
          // 成功和“证据不足”都缓存；同一名字不重复消耗搜索与模型额度。
          cache[key] = result;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail() {
        reject(requestError('网络连接失败，请检查网络后重试，或手动选择香调。', 'network_error'));
      },
      complete() {
        delete pending[key];
      },
    });
  });

  return pending[key];
};

module.exports = { ENDPOINT, SOURCE_LABELS, normalizeQuery, normalizeResponse, resolvePerfume };
