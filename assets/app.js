/* ============================================================
 * app.js — 跟庄擒龙 · 移动端短线操作系统
 * 单页 H5：总览 / 行情 / 工具 / 我的
 * ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具函数 ---------------- */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }
  function fmt(v, d) {
    if (v == null || isNaN(v)) return '--';
    return Number(v).toFixed(d == null ? 2 : d);
  }
  function pcls(v) { return v > 0 ? 'up' : (v < 0 ? 'down' : 'flat'); }
  function psign(v) { return v > 0 ? '+' : ''; }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* ---------------- 全局状态 ---------------- */
  var state = {
    tab: 'home',
    toolTab: 'score',
    quote: null,        // {code, data}
    auto: false,
    timer: null,
    market: 'balance',  // bull / balance / bear
    sc: { main: 0, theme: 0, kline: 0, vol: 0, tick: 0, limit: 0 }, // 0/1/2
    scMutual: false
  };

  /* ============================================================
   * 内容数据：方法论文档（源自《短线金手》1-7 册，移动端折叠）
   * ============================================================ */
  var CONTENT = [
    {
      id: 's0', title: '系统总览', html:
        '<p class="lead">提炼自私募实战操盘体系，以「<b>资金为王、跟庄擒龙、多维共振、顺势而为</b>」为核心理念，整合实时选股与交易系统，配套买卖信号、仓位管理、风险控制三大支撑模块，形成可落地的短线闭环。</p>' +
        '<div class="mod-grid">' +
          '<div class="mod"><b>① 实时选股</b><div class="dim">六维模型</div>主力/题材/K线/量价/分时/涨停，六维共振打分。</div>' +
          '<div class="mod"><b>② 交易系统</b><div class="dim">环境+买+卖</div>大盘环境优先过滤，明确进出场规则。</div>' +
          '<div class="mod"><b>③ 买卖信号</b><div class="dim">强/中/弱</div>把模糊"感觉"转为可执行量化信号。</div>' +
          '<div class="mod"><b>④ 仓位管理</b><div class="dim">环境×个股</div>底仓+机动仓+哨仓，按温度分配敞口。</div>' +
          '<div class="mod"><b>⑤ 风险控制</b><div class="dim">三层防线</div>系统/个股/纪律，硬规则止损止盈。</div>' +
          '<div class="mod"><b>⑥ 标准流程</b><div class="dim">盘前→盘后</div>固化每日动作，把系统变习惯。</div>' +
        '</div>' +
        '<div class="note"><b>设计原则：</b>① 大盘环境优先——系统风险不过滤，再好个股也慎用；② 主力追踪为核心——资金动向是唯一不会骗人的语言；③ 量价与分时为验证——"分时图是因，K线图是果"；④ 纪律高于判断——信号触发即执行。</div>'
    },
    {
      id: 's1', title: '实时选股系统（六维）', html:
        '<p class="lead">六维从粗到精、层层过滤：先用主力资金与题材锁定"战场"，再用形态与量价确认"战机"，最后用分时图做"临门一脚"验证。共振越强，信号等级越高。</p>' +
        '<h4>维度一 · 主力资金（跟庄核心）</h4>' +
        '<div class="tbl-wrap"><table class="tbl"><tr><th>数据</th><th>关键参数</th><th>含义</th></tr>' +
        '<tr><td>龙虎榜(盘后)</td><td>买方前五&gt;卖方前五；机构专用≥2家且买入大</td><td>机构重金=强跟进</td></tr>' +
        '<tr><td>股东F10</td><td>控股股东变更(协议转让&gt;划转)；十大流通股东增持；筹码分散→集中</td><td>新大股东入主=买入契机</td></tr>' +
        '<tr><td>基金持股</td><td>看基金经理历史业绩<b>持续性</b></td><td>选人重于选基</td></tr></table></div>' +
        '<div class="ok">龙虎榜阈值：日涨跌幅偏离±7%、换手20%、振幅15%、连续3日偏离累计20%。</div>' +
        '<h4>维度二 · 题材热点</h4><ul class="tight"><li><b>政策驱动</b>：如自贸区批复带动板块机会</li><li><b>龙头风向标</b>：龙头强弱指引整个板块</li><li><b>联动个股</b>：龙头确认后找补涨</li></ul>' +
        '<div class="note">是否"有集团军在背后运作"决定上涨幅度与安全性；纯情绪独舞谨慎。</div>' +
        '<h4>维度三 · K线形态</h4><ul class="tight"><li><b>仙人指路</b>：一阳穿三线、进攻形态、构筑6/9/12月越长越可靠；次日站稳上影线收盘→真</li><li><b>小牛漫步</b>：≥7连阳、依托30日线、量能温和</li><li><b>头肩底/双底</b>：周/月线确认，量度涨幅=颈线−最低点</li><li><b>涨停板</b>：均线密集多头、具涨停基因、波段涨幅&lt;25%介入优</li></ul>' +
        '<h4>维度四 · 量价</h4><div class="tbl-wrap"><table class="tbl"><tr><th>指标</th><th>参数</th><th>研判</th></tr>' +
        '<tr><td>量比/涨幅榜</td><td>两榜前10交集，9:40二次复核</td><td>盘前/开盘锁定</td></tr>' +
        '<tr><td>换手率</td><td>强势日换手≥5%；涨停换手&lt;10%佳</td><td>越低=封板越坚决</td></tr>' +
        '<tr><td>高开四档</td><td>&lt;2%寻常｜2-4%强势｜4-7%超强｜&gt;7%极强</td><td>须巨量配合否则诱多</td></tr>' +
        '<tr><td>巨量(竞价)</td><td>流通盘&lt;3000万→600手；3000-6000万→800手；6000万-1亿→1000手；1-2亿→1500手</td><td>波段涨幅小=扫货</td></tr>' +
        '<tr><td>集合竞价选股</td><td>波段涨幅&lt;25%</td><td>更安全</td></tr></table></div>' +
        '<h4>维度五 · 分时图（临门一脚）</h4><ul class="tight"><li><b>建仓三要素</b>：锯齿状尖角波 + 每尖角下方大分时量 + 间歇性主动性大/中买单</li><li><b>均价线判强弱</b>：价在均线上+红量放大=真实上涨</li><li><b>假信号排除</b>：大盘股自然锯齿非建仓；涨幅后大尖角+大卖单=减仓出货</li></ul>' +
        '<h4>维度六 · 涨停/急速拉升</h4><div class="tbl-wrap"><table class="tbl"><tr><th>高胜率战法</th><th>触发</th></tr>' +
        '<tr><td>仙人指路长上影</td><td>试盘后次日放量确认</td></tr><tr><td>完美小连阳</td><td>≥7小阳后回踩均线</td></tr>' +
        '<tr><td>N型/夹板型</td><td>回调不破前低再攻击</td></tr><tr><td>双龙出海/三外有三</td><td>双涨停/三连板确认</td></tr>' +
        '<tr><td>倒拔杨柳/天衣无缝</td><td>巨量阴洗后反包/缺口不补</td></tr><tr><td>龙虎榜/低换手涨停</td><td>机构大买+突破 / 换手&lt;10%</td></tr>' +
        '<tr><td>三线重叠/双底颈线</td><td>30/60/120日共振或颈线放量</td></tr></table></div>' +
        '<div class="ok"><b>急速拉升均线法则：</b>5日=攻击线；20日=天机线(首次回踩支撑)；60日=生命线(首次回踩极佳低吸)；30周线拐头=长线上涨。</div>' +
        '<div class="warn"><b>六维共振打分：</b>≥4维且含"主力+分时"→强(可重仓)；2-3维→中(试仓)；仅1维→观察。维度互斥(形态走好但分时出货)→严禁交易。</div>'
    },
    {
      id: 's2', title: '交易系统', html:
        '<p class="lead">选股解决"买什么"，交易系统解决"何时买、买多少、何时卖"。第一道闸门永远是<b>大盘环境</b>。</p>' +
        '<h4>1. 大盘环境判定</h4><div class="tbl-wrap"><table class="tbl"><tr><th>环境</th><th>判定</th><th>权限</th></tr>' +
        '<tr><td><span class="tag red">牛市/偏暖</span></td><td>指数均线多头或横盘企稳</td><td>积极参与，仓位上限高</td></tr>' +
        '<tr><td><span class="tag gold">平衡市</span></td><td>震荡方向不明</td><td>半仓滚动快进快出</td></tr>' +
        '<tr><td><span class="tag green">熊市/斜率&gt;60%</span></td><td>单边下跌</td><td><b>严禁涨停战法</b>，≤3成或空仓</td></tr></table></div>' +
        '<h4>2. 个股硬性剔除</h4><ul class="tight"><li>剔除 ST/*ST 及基本面不健康</li><li>剔除动态PE过高纯炒作（除非强题材）</li><li>剔除超级大盘股分时"假建仓"</li><li>优先：年线上方、有板块效应、均线多头</li></ul>' +
        '<h4>3. 趋势条件（买点前置）</h4><ul class="tight"><li>最优：均线密集缠绕+多头排列</li><li>次优：仅生命线/决策线/趋势线多头</li><li>慎用：完全空头排列（仅左侧小仓试探）</li><li>首破重要均线通常回踩，<b>缩量回踩</b>才健康</li></ul>' +
        '<h4>4. 买点体系</h4><div class="tbl-wrap"><table class="tbl"><tr><th>买点</th><th>要点</th></tr>' +
        '<tr><td><b>A 回调买</b></td><td>回踩5/10/20/30/60日均线企稳（强支撑优先）</td></tr>' +
        '<tr><td><b>B 突破买</b></td><td>放量突破颈线/平台/前高跟进</td></tr>' +
        '<tr><td><b>C 竞价买</b></td><td>集合竞价巨量高开+波段涨幅&lt;25%+均线多头</td></tr>' +
        '<tr><td><b>D 确认买</b></td><td>仙人指路次日放量、小连阳回踩10日线</td></tr></table></div>' +
        '<div class="warn">卖点总原则：<b>不让盈利变亏损</b>；连续涨停开板即卖点；放量破位无条件出局。</div>'
    },
    {
      id: 's3', title: '买卖信号模块', html:
        '<h4>买入信号（强/中/弱）</h4><div class="tbl-wrap"><table class="tbl"><tr><th>等级</th><th>触发条件</th><th>动作</th></tr>' +
        '<tr><td><span class="tag red">强买</span></td><td>竞价巨量高开+涨幅&lt;25%+多头；仙人指路次日站稳；小连阳回踩10日；头肩底颈线放量突破</td><td>重仓</td></tr>' +
        '<tr><td><span class="tag gold">中买</span></td><td>回踩20/60日缩量企稳；N型再攻击；龙虎榜机构大买+突破；三线重叠共振</td><td>半仓试探</td></tr>' +
        '<tr><td><span class="tag blue">弱/观察</span></td><td>分时建仓波形初现；股东筹码集中；题材刚落地</td><td>建哨仓</td></tr></table></div>' +
        '<h4>卖出信号（强/中/弱）</h4><div class="tbl-wrap"><table class="tbl"><tr><th>等级</th><th>触发条件</th><th>动作</th></tr>' +
        '<tr><td><span class="tag red">强卖</span></td><td>巨量阴阳(量比&gt;20高开不封板)；MACD顶背离；放跌破10日线；连续涨停开板</td><td>立即清仓</td></tr>' +
        '<tr><td><span class="tag gold">中卖</span></td><td>缩量创新高；跌破20日线3-5日不回；分时出货波形</td><td>减至半仓下</td></tr>' +
        '<tr><td><span class="tag blue">弱卖</span></td><td>突发利好+巨量；短期获利&gt;40%；板块龙头转弱</td><td>分批止盈</td></tr></table></div>' +
        '<div class="note"><b>分时出货三特征：</b>① 刻意制造做多气氛(对敲)；② 拉升乏力、单笔大单拉；③ 分时量价背离。</div>'
    },
    {
      id: 's4', title: '仓位管理模块', html:
        '<p class="lead">仓位=风险敞口。同样一笔交易，仓位决定生死。核心公式：<b>仓位 = 市场温度 × 信号强度 × 个股确定性</b>。</p>' +
        '<h4>1. 按大盘环境的基准仓位</h4><div class="tbl-wrap"><table class="tbl"><tr><th>环境</th><th>基准</th><th>说明</th></tr>' +
        '<tr><td>牛市</td><td class="kpi">≥8成</td><td>可积极重仓</td></tr>' +
        '<tr><td>平衡市</td><td class="kpi">≤5成</td><td>半仓滚动，练熟前不超3成</td></tr>' +
        '<tr><td>熊市/斜率&gt;60%</td><td class="kpi">≤3成或空仓</td><td>严禁涨停战法</td></tr></table></div>' +
        '<h4>2. 个股仓位分配</h4><ul class="tight"><li><b>龙头/强信号</b>：重仓出击(可达8成+，分散2-3只)</li><li><b>试错仓</b>：信号未确认仅1-3成哨仓</li><li><b>底仓+机动仓</b>：底仓长持，机动仓应对大阴做T</li><li><b>分批建仓</b>：首仓+回调加仓</li></ul>' +
        '<div class="warn">任何单票仓位不应超过总资金 <b>30%-40%</b>，避免黑天鹅造成不可逆回撤。</div>'
    },
    {
      id: 's5', title: '风险控制模块', html:
        '<p class="lead">风控是系统的"安全带"。宁可少赚，不可大亏。三层防线：<b>系统风险 → 个股风险 → 纪律执行</b>。</p>' +
        '<h4>1. 系统风险防线</h4><ul class="tight"><li>大盘单边下跌/斜率&gt;60%：<b>禁止</b>涨停战法，整体降仓或空仓</li><li>环境偏暖才提高成功率</li></ul>' +
        '<h4>2. 个股硬止损</h4><div class="tbl-wrap"><table class="tbl"><tr><th>类型</th><th>触发</th><th>参数</th></tr>' +
        '<tr><td>比例止损</td><td>逆势亏损达阈值</td><td class="kpi">亏损3%出局</td></tr>' +
        '<tr><td>均线止损</td><td>放跌破10日操盘线</td><td class="kpi">无条件出局</td></tr>' +
        '<tr><td>天机线止损</td><td>涨中跌破20日线</td><td>3-5日不破减仓；<b>5日不回清仓</b></td></tr>' +
        '<tr><td>涨停价止损</td><td>跌破首根涨停开盘价</td><td>破位即走</td></tr></table></div>' +
        '<h4>3. 止盈规则</h4><div class="tbl-wrap"><table class="tbl"><tr><th>类型</th><th>触发</th><th>动作</th></tr>' +
        '<tr><td>回撤止盈</td><td>盈利≥5%回落至1%</td><td class="kpi">坚决止盈</td></tr>' +
        '<tr><td>开板止盈</td><td>连续涨停开板</td><td>短线卖出</td></tr>' +
        '<tr><td>目标止盈</td><td>短期获利&gt;40%</td><td>了结大部留底仓</td></tr>' +
        '<tr><td>缩量止盈</td><td>缩量创新高</td><td>逐步减仓</td></tr></table></div>' +
        '<h4>4. 个股与陷阱风险</h4><ul class="tight"><li>排除ST、高PE、异常波动</li><li>警惕"利好+巨量"借利好出货</li><li>警惕假仙人指路(空头排列长上影)</li><li>警惕对敲诱多与涨幅后大尖角减仓</li></ul>'
    },
    {
      id: 's6', title: '标准操作流程（每日固化）', html:
        '<div class="tbl-wrap"><table class="tbl"><tr><th>时段</th><th>动作</th></tr>' +
        '<tr><td><b>盘前 9:15前</b></td><td>复盘龙虎榜、研公告(控股股东变更/重组)、跟题材、刷新选股池</td></tr>' +
        '<tr><td><b>竞价 9:15-9:25</b></td><td>取量比榜+涨幅榜前10交集；锁定竞价巨量高开标的</td></tr>' +
        '<tr><td><b>盘中 9:30-15:00</b></td><td>六维实时监控、分时验证、按信号买卖、T+0降成本</td></tr>' +
        '<tr><td><b>盘后 15:00后</b></td><td>复盘成败、更新选股池、记录日志与情绪纪律</td></tr></table></div>' +
        '<div class="note"><b>T+0纪律：</b>只在已有底仓的明确上涨态势个股上做日内仓；上涨超7%考虑T出当日仓；错了及时止损。</div>'
    },
    {
      id: 's7', title: '关键参数速查表', html:
        '<h4>均线周期含义</h4><div class="tbl-wrap"><table class="tbl"><tr><th>均线</th><th>含义</th><th>用法</th></tr>' +
        '<tr><td>5日</td><td>攻击线</td><td>拐头走平即抛</td></tr><tr><td>10日</td><td>操盘线</td><td>跌破无条件出</td></tr>' +
        '<tr><td>20日</td><td>天机线</td><td>首回踩支撑；破3-5日减、5日清</td></tr><tr><td>30日</td><td>中期线</td><td>缓慢上行=中期趋势</td></tr>' +
        '<tr><td>60日</td><td>生命线</td><td>首回踩=极佳低吸</td></tr><tr><td>120日</td><td>半年线</td><td>站上转强</td></tr></table></div>' +
        '<h4>量价与高开阈值</h4><div class="tbl-wrap"><table class="tbl"><tr><th>项目</th><th>参数</th></tr>' +
        '<tr><td>高开四档</td><td>&lt;2%寻常｜2-4%强势｜4-7%超强｜&gt;7%极强</td></tr>' +
        '<tr><td>集合竞价巨量</td><td>&lt;3000万→600手；3000-6000万→800手；6000万-1亿→1000手；1-2亿→1500手</td></tr>' +
        '<tr><td>换手率</td><td>强势日换手≥5%；涨停换手&lt;10%佳</td></tr><tr><td>集合竞价选股涨幅</td><td>波段涨幅&lt;25%</td></tr>' +
        '<tr><td>巨量阴阳量比</td><td>量比&gt;20视为异常</td></tr><tr><td>小牛漫步</td><td>≥7连阳(依托30日线)</td></tr></table></div>' +
        '<h4>仓位与风控阈值</h4><div class="tbl-wrap"><table class="tbl"><tr><th>项目</th><th>阈值</th></tr>' +
        '<tr><td>牛市基准</td><td>≥8成</td></tr><tr><td>平衡基准</td><td>≤5成</td></tr><tr><td>熊市基准</td><td>≤3成或空仓</td></tr>' +
        '<tr><td>单票上限</td><td>30%-40%</td></tr><tr><td>硬止损</td><td>亏3%/破10日/破20日5日不回</td></tr>' +
        '<tr><td>回撤止盈</td><td>盈利≥5%回落至1%</td></tr><tr><td>目标止盈</td><td>短期获利&gt;40%</td></tr></table></div>'
    },
    {
      id: 's8', title: '核心纪律与免责', html:
        '<h4>十条铁律</h4><ol class="tight"><li>大盘环境优先——系统风险不过滤，再好个股也慎用</li>' +
        '<li>资金为王——只跟有主流资金介入的标的</li><li>分时图是因，K线图是果——临门一脚看盘口</li>' +
        '<li>信号触发即执行，杜绝侥幸与犹豫</li><li>不让盈利的股票变亏损（回撤止盈）</li>' +
        '<li>单次亏损有限（3%止损），以有限亏换大空间</li><li>底仓+机动仓，滚动降成本</li>' +
        '<li>单票不过40%，拒绝孤注一掷</li><li>多份耐心，大波段思维，不频繁折腾</li>' +
        '<li>看错立即认错，按策略应对，不摊平亏损</li></ol>' +
        '<div class="warn"><b>免责声明：</b>本系统为基于公开出版物的方法论整合与结构化提炼，仅供学习研究框架参考，<b>不构成任何投资建议</b>。股市有风险，入市需谨慎；实盘请结合自身风险承受能力并遵守相关法律法规。</div>'
    }
  ];

  /* ---------------- 渲染：总览（折叠文档） ---------------- */
  function renderHome() {
    var html = '<div class="card"><h3>跟庄擒龙 · A股短线操作系统</h3>' +
      '<div class="muted">v1.0 ｜ 基于《短线金手》1-7 册 ｜ 方法参数非实时行情</div></div>';
    CONTENT.forEach(function (s, i) {
      html += '<div class="acc' + (i === 0 ? ' open' : '') + '" data-acc="' + s.id + '">' +
        '<div class="acc-h"><span><span class="num">' + (i + 1) + '.</span>' + s.title + '</span><span class="arrow">▶</span></div>' +
        '<div class="acc-b">' + s.html + '</div></div>';
    });
    return html;
  }

  /* ---------------- 六维打分器组件 ---------------- */
  var DIMS = [
    { k: 'main', n: '主力资金（跟庄核心）', d: '龙虎榜机构大买 / 股东增持 / 基金重仓' },
    { k: 'theme', n: '题材热点', d: '政策或事件驱动 / 龙头风向 / 板块联动' },
    { k: 'kline', n: 'K线形态', d: '仙人指路 / 小牛漫步 / 头肩底 / 涨停板' },
    { k: 'vol', n: '量价', d: '量比+涨幅交集 / 换手 / 高开档' },
    { k: 'tick', n: '分时图（临门一脚）', d: '建仓三要素 / 均价线 / 假信号排除' },
    { k: 'limit', n: '涨停 / 急速拉升', d: '高胜率涨停战法 / 均线法则' }
  ];
  var LEVELS = [{ v: 2, t: '满足', c: 'on2' }, { v: 1, t: '部分', c: 'on1' }, { v: 0, t: '不满足', c: 'on0' }];

  function renderScorer() {
    var h = '';
    DIMS.forEach(function (dim, i) {
      h += '<div class="dim"><div class="dh"><b><span class="dnum">' + (i + 1) + '</span>' + dim.n + '</b></div>' +
        '<div class="ddesc">' + dim.d + '</div><div class="lv" data-dim="' + dim.k + '">';
      LEVELS.forEach(function (l) {
        var on = state.sc[dim.k] === l.v ? (' ' + l.c) : '';
        h += '<button class="' + on.trim() + '" data-v="' + l.v + '">' + l.t + '</button>';
      });
      h += '</div></div>';
    });
    h += '<div class="field"><label class="row" style="cursor:pointer">' +
      '<input type="checkbox" id="scMutual"' + (state.scMutual ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--red)"> ' +
      '<span style="color:var(--red);font-weight:700">维度互斥（如形态走好但分时出货）→ 严禁交易</span></label></div>';
    h += '<div id="scResult"></div>';
    return h;
  }

  function computeScore() {
    var count = 0, hasMain = false, hasTick = false;
    DIMS.forEach(function (d) { if (state.sc[d.k] >= 1) count++; });
    hasMain = state.sc.main >= 1; hasTick = state.sc.tick >= 1;
    var envBase = { bull: 0.8, balance: 0.5, bear: 0.3 }[state.market];
    if (state.scMutual) return { cls: 'ban', t: '⛔ 严禁交易', d: '检测到维度互斥，形态与分时/资金相互矛盾，按纪律禁止开仓。', pos: 0 };
    if (count >= 4 && hasMain && hasTick) {
      var p1 = Math.round(Math.min(envBase, 0.8) * 100);
      return { cls: 'strong', t: '🔴 强信号（可重仓）', d: '六维共振≥4 且含「主力资金+分时验证」。建议仓位 ≤ ' + p1 + '%（受' + envName() + '基准约束）。', pos: p1 };
    }
    if (count >= 2) {
      var p2 = Math.round(Math.min(envBase, 0.5) * 100);
      return { cls: 'mid', t: '🟡 中信号（试仓）', d: '满足 2-3 维，半仓试探。建议仓位 ≤ ' + p2 + '%（受' + envName() + '基准约束）。', pos: p2 };
    }
    if (count === 1) return { cls: 'weak', t: '🔵 弱信号（观察）', d: '仅 1 维，建「哨仓」跟踪，仓位 1-3 成。', pos: Math.round(Math.min(envBase, 0.1) * 100) };
    return { cls: 'weak', t: '⚪ 暂不操作', d: '未满足任何维度，继续观察选股池。', pos: 0 };
  }
  function envName() { return { bull: '牛市', balance: '平衡市', bear: '熊市' }[state.market]; }

  function refreshScore() {
    var box = document.getElementById('scResult');
    if (!box) return;
    var r = computeScore();
    var posLine = r.pos > 0 ? ('<div class="rd">单票上限提醒：不超过总资金 30%-40%。</div>') : '';
    box.className = 'result ' + r.cls;
    box.innerHTML = '<div class="rt">' + r.t + '</div><div class="rd">' + r.d + '</div>' + posLine;
  }

  function bindScorer() {
    document.querySelectorAll('.lv').forEach(function (lv) {
      var k = lv.getAttribute('data-dim');
      lv.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          state.sc[k] = parseInt(b.getAttribute('data-v'), 10);
          lv.querySelectorAll('button').forEach(function (x) { x.className = ''; });
          var v = state.sc[k];
          var map = { 2: 'on2', 1: 'on1', 0: 'on0' };
          b.className = map[v];
          refreshScore();
        });
      });
    });
    var m = document.getElementById('scMutual');
    if (m) m.addEventListener('change', function () { state.scMutual = m.checked; refreshScore(); });
    refreshScore();
  }

  /* ---------------- 行情页 ---------------- */
  function renderQuote() {
    var h = '<div class="card"><h3>实时行情 + 个股六维打分</h3>' +
      '<div class="field"><label>输入代码或名称（如 600519 / 300750 / 000001）</label>' +
      '<div class="row"><input class="input" id="qInput" placeholder="股票代码" value="' + (state.quote ? state.quote.code.slice(2) : '') + '">' +
      '<button class="btn blue sm" id="qBtn" style="flex:0 0 72px">查询</button></div></div>' +
      '<div class="pillrow"><span class="muted">示例：</span>' +
      '<button class="btn ghost sm ex" data-c="600519">茅台</button>' +
      '<button class="btn ghost sm ex" data-c="300750">宁德</button>' +
      '<button class="btn ghost sm ex" data-c="000001">上证</button></div>' +
      '<div class="row" style="margin-top:6px"><label class="row" style="cursor:pointer;flex:1">' +
      '<input type="checkbox" id="autoChk" ' + (state.auto ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--red)"> <span class="muted">自动刷新(5秒)</span></label>' +
      '<button class="btn ghost sm" id="refreshBtn" style="flex:0 0 84px">↻ 手动刷新</button></div>' +
      '</div><div id="qBody"></div>';
    return h;
  }

  function renderQuoteBody() {
    var box = document.getElementById('qBody');
    if (!box) return;
    if (!state.quote) {
      box.innerHTML = '<div class="empty">输入代码查询实时行情，并基于个股做六维打分。</div>';
      return;
    }
    var d = state.quote.data;
    if (!d || d.price == null) {
      box.innerHTML = '<div class="warn">行情获取失败，请检查网络或代码是否正确。</div>' + scorerBlock();
      bindScorer();
      return;
    }
    var chg = d.change || 0, pct = d.changePct || 0;
    var pc = pcls(chg);
    var h = '<div class="qcard">' +
      '<div class="qtop"><div><div class="qname">' + d.name + '</div><div class="qcode">' + state.quote.code.slice(2) + ' · ' + state.quote.code + '</div></div>' +
      '<button class="btn ghost sm" id="addWl" style="flex:0 0 auto">＋自选</button></div>' +
      '<div class="qprice ' + pc + '">' + fmt(d.price) + '</div>' +
      '<div class="qchg ' + pc + '">' + psign(chg) + fmt(chg) + '　' + psign(pct) + fmt(pct) + '%</div>' +
      '<div class="qgrid">' +
      cell('今开', fmt(d.open)) + cell('昨收', fmt(d.prevClose)) + cell('最高', fmt(d.high)) + cell('最低', fmt(d.low)) +
      cell('换手%', fmt(d.turnover)) + cell('量比', fmt(d.volRatio)) + cell('振幅%', fmt(d.amplitude)) + cell('市盈(TTM)', fmt(d.pe)) +
      cell('流通市值', fmt(d.circCap) + '亿') + cell('总市值', fmt(d.totalCap) + '亿') +
      '</div>' +
      '<div class="muted" style="margin-top:8px">更新时间：' + (d.time || '--') + '</div></div>';
    h += hintsBlock(d) + scorerBlock();
    box.innerHTML = h;
    var aw = document.getElementById('addWl');
    if (aw) aw.addEventListener('click', function () { addWatch(state.quote.code); });
    bindScorer();
  }
  function cell(k, v) { return '<div class="cell"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }

  function hintsBlock(d) {
    var openPct = d.prevClose ? (d.open - d.prevClose) / d.prevClose * 100 : null;
    var op = openPct == null ? '--' : (openPct < 2 ? '寻常' : openPct < 4 ? '强势' : openPct < 7 ? '超强' : '极强');
    var turnOk = d.turnover != null && d.turnover >= 5;
    var vr = d.volRatio != null && d.volRatio > 20;
    return '<div class="card" style="margin-top:12px"><h4 style="margin-top:0">行情速读（量价维度辅助）</h4>' +
      '<div class="pillrow">' +
      chip('高开 ' + fmt(openPct, 1) + '%', op, openPct == null ? 'flat' : (openPct >= 2 ? 'up' : 'flat')) +
      chip('换手 ' + fmt(d.turnover) + '%', turnOk ? '达标≥5%' : '偏弱', turnOk ? 'up' : 'flat') +
      chip('量比 ' + fmt(d.volRatio), vr ? '异常&gt;20' : '正常', vr ? 'down' : 'flat') +
      '</div><div class="muted">高开四档：&lt;2%寻常｜2-4%强势｜4-7%超强｜&gt;7%极强；强势股日换手≥5%；量比&gt;20警惕巨量阴阳。</div></div>';
  }
  function chip(main, sub, cls) {
    return '<span class="tag ' + (cls === 'up' ? 'red' : cls === 'down' ? 'green' : 'blue') + '">' + main + ' · ' + sub + '</span>';
  }
  function scorerBlock() {
    return '<div class="card" style="margin-top:12px"><h4 style="margin-top:0">六维共振打分</h4>' + renderScorer() + '</div>';
  }

  function doQuery(code) {
    var norm = window.GTQuote.normCode(code);
    if (!norm) { toast('代码格式不正确'); return; }
    var btn = document.getElementById('qBtn'); if (btn) btn.disabled = true;
    if (btn) btn.textContent = '查询中…';
    window.GTQuote.get(norm).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = '查询'; }
      if (res[norm]) { state.quote = { code: norm, data: res[norm] }; }
      else { state.quote = { code: norm, data: null }; }
      renderQuoteBody();
    });
  }

  function bindQuote() {
    var qb = document.getElementById('qBtn');
    if (qb) qb.addEventListener('click', function () { doQuery(document.getElementById('qInput').value); });
    var qi = document.getElementById('qInput');
    if (qi) qi.addEventListener('keydown', function (e) { if (e.key === 'Enter') doQuery(qi.value); });
    document.querySelectorAll('.ex').forEach(function (b) {
      b.addEventListener('click', function () { if (qi) qi.value = b.getAttribute('data-c'); doQuery(b.getAttribute('data-c')); });
    });
    var ac = document.getElementById('autoChk');
    if (ac) ac.addEventListener('change', function () {
      state.auto = ac.checked;
      if (state.auto) startAuto(); else stopAuto();
    });
    var rb = document.getElementById('refreshBtn');
    if (rb) rb.addEventListener('click', function () { if (state.quote) doQuery(state.quote.code.slice(2)); });
    renderQuoteBody();
  }
  function startAuto() {
    stopAuto();
    state.timer = setInterval(function () { if (state.quote) doQuery(state.quote.code.slice(2)); }, 5000);
  }
  function stopAuto() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }

  /* ---------------- 工具页 ---------------- */
  function renderTools() {
    var seg = '<div class="seg" id="toolSeg">' +
      '<button data-t="score" class="' + (state.toolTab === 'score' ? 'active' : '') + '">打分器</button>' +
      '<button data-t="pos" class="' + (state.toolTab === 'pos' ? 'active' : '') + '">仓位计算</button>' +
      '<button data-t="sl" class="' + (state.toolTab === 'sl' ? 'active' : '') + '">止损止盈</button></div>';
    var body = '';
    if (state.toolTab === 'score') body = '<div class="card"><h4 style="margin-top:0">六维共振打分器</h4>' + renderScorer() + '</div>';
    else if (state.toolTab === 'pos') body = renderPos();
    else body = renderSL();
    return seg + '<div id="toolBody">' + body + '</div>';
  }

  function renderPos() {
    var env = state.market;
    return '<div class="card"><h4 style="margin-top:0">仓位计算器</h4>' +
      '<p class="lead">仓位 = 市场温度 × 信号强度 × 个股确定性，并受单票上限 40% 约束。</p>' +
      '<div class="field"><label>市场温度（0-100，熊市≈30 / 平衡≈50 / 牛市≈80）</label>' +
      '<div class="slider-wrap"><div class="sv" id="tempV">50</div>' +
      '<input type="range" id="temp" min="0" max="100" value="50"></div></div>' +
      '<div class="field"><label>信号强度</label>' +
      '<div class="seg" id="sigSeg">' +
      '<button data-s="0.3" class="">弱</button><button data-s="0.6" class="active">中</button><button data-s="0.9" class="">强</button></div></div>' +
      '<div class="field"><label>个股确定性</label>' +
      '<div class="seg" id="cerSeg">' +
      '<button data-c="0.5" class="">低</button><button data-c="0.75" class="active">中</button><button data-c="1" class="">高</button></div></div>' +
      '<div class="field"><label>大盘环境基准（上限参考）</label>' +
      '<div class="seg" id="envSeg">' +
      '<button data-e="bull" class="' + (env === 'bull' ? 'active' : '') + '">牛市≥8成</button>' +
      '<button data-e="balance" class="' + (env === 'balance' ? 'active' : '') + '">平衡≤5成</button>' +
      '<button data-e="bear" class="' + (env === 'bear' ? 'active' : '') + '">熊市≤3成</button></div></div>' +
      '<div class="calc-out" id="posOut"></div></div>';
  }

  function renderSL() {
    var link = state.quote && state.quote.data && state.quote.data.price != null;
    var linkTxt = link ? ('已联动：' + state.quote.data.name + ' 现价 ' + fmt(state.quote.data.price)) : '未联动个股（去行情页查询后可自动带入现价）';
    return '<div class="card"><h4 style="margin-top:0">止损 / 止盈计算器</h4>' +
      '<div class="field"><label>买入价</label><input class="input" id="buyP" type="number" placeholder="如 100"></div>' +
      '<div class="muted" style="margin:6px 0">' + linkTxt + '</div>' +
      '<div class="calc-out" id="slOut"><div class="muted">输入买入价查看止损止盈位。</div></div></div>';
  }

  function calcPos() {
    var box = document.getElementById('posOut'); if (!box) return;
    var temp = parseInt(document.getElementById('temp').value, 10);
    var sig = parseFloat(document.querySelector('#sigSeg .active').getAttribute('data-s'));
    var cer = parseFloat(document.querySelector('#cerSeg .active').getAttribute('data-c'));
    var envBase = { bull: 80, balance: 50, bear: 30 }[state.market];
    var raw = temp * sig * cer / 100;          // %
    var cap = Math.min(raw, 40);               // 单票上限
    var html = '';
    html += line('市场温度', temp + '%');
    html += line('信号强度系数', sig.toFixed(2));
    html += line('个股确定性系数', cer.toFixed(2));
    html += line('理论仓位', raw.toFixed(1) + '%');
    html += line('建议仓位(≤单票40%)', '<b>' + cap.toFixed(1) + '%</b>');
    html += line('大盘基准上限', envBase + '%');
    if (cap < raw) html += '<div class="muted" style="margin-top:6px">已触单票上限 40%，风控优先。</div>';
    box.innerHTML = html;
  }
  function line(k, v) { return '<div class="line"><span>' + k + '</span><span>' + v + '</span></div>'; }

  function calcSL() {
    var box = document.getElementById('slOut'); if (!box) return;
    var bp = parseFloat(document.getElementById('buyP').value);
    if (!bp || bp <= 0) { box.innerHTML = '<div class="muted">请输入有效买入价。</div>'; return; }
    var stop = bp * 0.97;          // 3% 止损
    var pull = bp * 1.01;          // 回撤止盈触发（需先有≥5%盈利）
    var target = bp * 1.40;        // 目标止盈 >40%
    var html = '';
    html += line('硬止损价（亏3%）', '<b>' + fmt(stop) + '</b>');
    html += line('回撤止盈线（盈利≥5%后回落至1%）', fmt(pull));
    html += line('目标止盈价（短期获利>40%）', fmt(target));
    if (state.quote && state.quote.data && state.quote.data.price != null) {
      var p = state.quote.data.price;
      var pl = (p - bp) / bp * 100;
      var toStop = (p - stop) / bp * 100;
      html += '<hr class="sep">';
      html += line('当前现价', fmt(p));
      html += line('浮动盈亏', '<b class="' + pcls(pl) + '">' + psign(pl) + fmt(pl) + '%</b>');
      html += line('距止损空间', psign(toStop) + fmt(toStop) + '%');
    }
    html += '<div class="muted" style="margin-top:6px">回撤止盈需先有≥5%盈利；放量破10日线/跌破涨停开盘价即走。</div>';
    box.innerHTML = html;
  }

  function bindTools() {
    var seg = document.getElementById('toolSeg');
    if (seg) seg.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { state.toolTab = b.getAttribute('data-t'); renderAll(); });
    });
    if (state.toolTab === 'score') bindScorer();
    if (state.toolTab === 'pos') bindPos();
    if (state.toolTab === 'sl') bindSL();
  }
  function bindPos() {
    var temp = document.getElementById('temp');
    if (temp) temp.addEventListener('input', function () { document.getElementById('tempV').textContent = temp.value; calcPos(); });
    ['sigSeg', 'cerSeg', 'envSeg'].forEach(function (id) {
      var s = document.getElementById(id); if (!s) return;
      s.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          s.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          if (id === 'envSeg') state.market = b.getAttribute('data-e');
          calcPos();
        });
      });
    });
    calcPos();
  }
  function bindSL() {
    var bp = document.getElementById('buyP');
    if (bp) bp.addEventListener('input', calcSL);
    calcSL();
  }

  /* ---------------- 我的页 ---------------- */
  var CHECKLIST = {
    pre: { t: '盘前 9:15前', items: [
      { id: 'p1', x: '复盘前日龙虎榜（机构专用席位/买入力量）' },
      { id: 'p2', x: '研读公告（控股股东变更/重组/政策）' },
      { id: 'p3', x: '跟踪题材新闻与板块联动' },
      { id: 'p4', x: '刷新昨日选股池' }
    ] },
    call: { t: '竞价 9:15-9:25', items: [
      { id: 'c1', x: '取量比榜+涨幅榜前10交集' },
      { id: 'c2', x: '锁定集合竞价巨量高开标的' }
    ] },
    intra: { t: '盘中 9:30-15:00', items: [
      { id: 'i1', x: '六维实时监控与分时验证' },
      { id: 'i2', x: '按信号执行买卖' },
      { id: 'i3', x: '底仓 T+0 滚动降成本' }
    ] },
    post: { t: '盘后 15:00后', items: [
      { id: 'o1', x: '复盘成败与卖错买错' },
      { id: 'o2', x: '更新选股池' },
      { id: 'o3', x: '记录操作日志与情绪纪律' }
    ] }
  };

  function renderMine() {
    var date = todayKey();
    var done = LS.get('gzql_check_' + date, {});
    var ph = '<div class="card"><h3>每日操作流程清单</h3><div class="muted">今日 ' + date + ' ｜ 勾选自动保存，每日清零</div>';
    Object.keys(CHECKLIST).forEach(function (k) {
      var ph3 = CHECKLIST[k];
      ph += '<div class="phase"><div class="ph"><span class="dot"></span>' + ph3.t + '</div>';
      ph3.items.forEach(function (it) {
        var on = done[it.id] ? ' done' : '';
        var chk = done[it.id] ? ' checked' : '';
        ph += '<label class="chk' + on + '"><input type="checkbox" data-id="' + it.id + '"' + chk + '><span class="ct">' + it.x + '</span></label>';
      });
      ph += '</div>';
    });
    ph += '<button class="btn ghost sm" id="clearChk" style="margin-top:4px">清空今日勾选</button></div>';

    var wl = LS.get('gzql_watch', []);
    var wlHtml = '<div class="card"><h3>自选股</h3><div id="wlList">';
    if (!wl.length) wlHtml += '<div class="empty">暂无自选，去行情页点击「＋自选」添加。</div>';
    else wl.forEach(function (c) { wlHtml += '<div class="wl" data-c="' + c + '"><div><div class="wn">' + c.slice(2) + '</div><div class="wc">' + c + '</div></div><div class="wp" id="wlp_' + c + '">--</div><button class="del" data-c="' + c + '">删除</button></div>'; });
    wlHtml += '</div></div>';

    var notes = LS.get('gzql_notes', '');
    var noteHtml = '<div class="card"><h3>操作笔记</h3><textarea class="input" id="notes" placeholder="记录今日操作、情绪与反思…">' + escapeHtml(notes) + '</textarea>' +
      '<button class="btn blue sm" id="saveNote" style="margin-top:8px">保存笔记</button></div>';

    return ph + wlHtml + noteHtml;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function bindMine() {
    document.querySelectorAll('.chk input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-id');
        var key = 'gzql_check_' + todayKey();
        var d = LS.get(key, {});
        if (cb.checked) d[id] = 1; else delete d[id];
        LS.set(key, d);
        cb.closest('.chk').classList.toggle('done', cb.checked);
      });
    });
    var clr = document.getElementById('clearChk');
    if (clr) clr.addEventListener('click', function () { LS.set('gzql_check_' + todayKey(), {}); renderAll(); toast('已清空'); });
    document.querySelectorAll('.wl .del').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); removeWatch(b.getAttribute('data-c')); });
    });
    document.querySelectorAll('.wl').forEach(function (w) {
      w.addEventListener('click', function (e) {
        if (e.target.classList.contains('del')) return;
        var c = w.getAttribute('data-c');
        state.tab = 'quote'; setTabActive();
        state.quote = { code: c, data: null };
        renderAll();
        doQuery(c.slice(2));
      });
    });
    var sn = document.getElementById('saveNote');
    if (sn) sn.addEventListener('click', function () { LS.set('gzql_notes', document.getElementById('notes').value); toast('笔记已保存'); });
    // 刷新自选股价格
    var wl = LS.get('gzql_watch', []);
    if (wl.length) window.GTQuote.get(wl).then(function (res) {
      wl.forEach(function (c) {
        var el = document.getElementById('wlp_' + c); if (!el) return;
        var d = res[c];
        if (d && d.price != null) { var pc = pcls(d.change); el.className = 'wp ' + pc; el.textContent = fmt(d.price) + ' ' + psign(d.changePct) + fmt(d.changePct) + '%'; }
        else el.textContent = '—';
      });
    });
  }

  function addWatch(code) {
    var wl = LS.get('gzql_watch', []);
    if (wl.indexOf(code) >= 0) { toast('已在自选'); return; }
    wl.push(code); LS.set('gzql_watch', wl); toast('已加自选');
    // 若在行情页则刷新列表感；这里仅提示
  }
  function removeWatch(code) {
    var wl = LS.get('gzql_watch', []).filter(function (c) { return c !== code; });
    LS.set('gzql_watch', wl); renderAll(); toast('已删除');
  }

  /* ---------------- 路由 ---------------- */
  function renderAll() {
    var view = document.getElementById('view');
    if (state.tab === 'home') view.innerHTML = renderHome();
    else if (state.tab === 'quote') view.innerHTML = renderQuote();
    else if (state.tab === 'tools') view.innerHTML = renderTools();
    else if (state.tab === 'mine') view.innerHTML = renderMine();
    if (state.tab === 'home') bindHome();
    else if (state.tab === 'quote') bindQuote();
    else if (state.tab === 'tools') bindTools();
    else if (state.tab === 'mine') bindMine();
    window.scrollTo(0, 0);
  }
  function bindHome() {
    document.querySelectorAll('.acc-h').forEach(function (h) {
      h.addEventListener('click', function () { h.parentElement.classList.toggle('open'); });
    });
  }
  function setTabActive() {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === state.tab); });
  }

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var tab = t.getAttribute('data-tab');
      if (tab === state.tab) return;
      if (state.auto && tab !== 'quote') stopAuto();
      state.tab = tab; setTabActive(); renderAll();
    });
  });

  // 初始化
  renderAll();
})();
