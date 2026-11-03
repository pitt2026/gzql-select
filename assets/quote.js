/* ============================================================
 * quote.js — 腾讯实时行情接入 (qt.gtimg.cn)
 * 采用 <script> 注入方式规避浏览器跨域限制（无需后端代理）。
 * 暴露全局：window.GTQuote.get(codes) -> Promise<{code:data}>
 * ============================================================ */
(function (global) {
  'use strict';

  // 代码标准化：支持 600519 / sh600519 / 贵州茅台(仅代码) 等输入
  function normCode(input) {
    if (!input) return '';
    var c = String(input).trim().toLowerCase();
    // 已是 sh/sz/bj 前缀
    if (/^(sh|sz|bj)\d{6}$/.test(c)) return c;
    c = c.replace(/^(sh|sz|bj)/, '');
    if (!/^\d{6}$/.test(c)) return '';
    if (c === '000001' || c === '999999') return 'sh' + c;  // 上证指数
    if (/^399/.test(c)) return 'sz' + c;                     // 深证/创业板指
    if (/^[36]/.test(c)) return 'sh' + c;        // 沪市 6 开头
    if (/^[03]/.test(c)) return 'sz' + c;        // 深市 0/3 开头
    if (/^[458]/.test(c)) return 'bj' + c;       // 北交所 8/4、新三板 5(兜底)
    return 'sh' + c;
  }

  // 解析 gtimg 返回的字符串（以 ~ 分隔的字段）
  function parse(raw) {
    if (!raw) return null;
    var f = String(raw).replace(/^"|"$/g, '').split('~');
    if (f.length < 30) return null;
    var num = function (i) {
      var v = parseFloat(f[i]);
      return isNaN(v) ? null : v;
    };
    return {
      name: f[1] || '',
      code: f[2] || '',
      price: num(3),
      prevClose: num(4),
      open: num(5),
      high: num(33),
      low: num(34),
      change: num(31),
      changePct: num(32),
      turnover: num(38),      // 换手率 %
      pe: num(39),            // 市盈率 TTM
      amplitude: num(43),     // 振幅 %
      circCap: num(44),       // 流通市值(亿)
      totalCap: num(45),      // 总市值(亿)
      pb: num(46),            // 市净率
      limitUp: num(47),       // 涨停价
      limitDown: num(48),     // 跌停价
      volRatio: num(49),      // 量比
      time: f[30] || ''
    };
  }

  // 通过注入 script 标签拉取（跨域安全）
  function get(codes) {
    var list = (Array.isArray(codes) ? codes : [codes])
      .map(normCode).filter(Boolean);
    return new Promise(function (resolve) {
      if (!list.length) { resolve({}); return; }
      var s = document.createElement('script');
      s.src = 'https://qt.gtimg.cn/q=' + list.join(',');
      s.charset = 'gbk';
      var out = {};
      var done = function () {
        list.forEach(function (c) {
          try {
            var raw = global['v_' + c];
            if (raw) out[c] = parse(raw);
          } catch (e) { /* ignore */ }
        });
        if (s.parentNode) s.parentNode.removeChild(s);
        resolve(out);
      };
      s.onload = done;
      s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); resolve(out); };
      document.head.appendChild(s);
    });
  }

  global.GTQuote = { get: get, normCode: normCode };
})(window);
