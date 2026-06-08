'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Users, Eye, EyeOff, RotateCw, Loader2, Scale, MessageSquare, ChevronRight, Trophy, Pause, History, Clock, Trash2, ArrowLeft, X, Sparkles, Megaphone, Swords, Mic, Flame, Shuffle, Quote, Gavel } from 'lucide-react';
import { loadHistory, saveGame, deleteGame, clearHistory, formatTime } from '../lib/history';

// 每个模型一种配色（用于区分模型身份，与正反方无关）
const AVATAR_STYLES = [
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
];

// 槽位号(PLAYER_N) → 显示名，写死在代码里（与"谁是卧底/狼人杀"同一套）
const SLOT_NAMES = { 1: '智谱', 2: 'DeepSeek', 3: '千问', 4: 'Kimi', 5: '豆包', 6: 'MiniMax' };
function slotName(slot) { return SLOT_NAMES[slot] || ('模型' + slot); }

const SEAT_ORDER = ['千问', '豆包', '智谱', 'DeepSeek', 'Kimi', 'MiniMax'];
function seatRank(displayName) {
  const name = displayName || '';
  const i = SEAT_ORDER.findIndex(d => name.includes(d) || d.includes(name));
  return i === -1 ? 999 : i;
}
function orderByDefault(models) {
  return [...models].sort((a, b) => seatRank(a.displayName) - seatRank(b.displayName));
}

// 内置奇葩说风格辩题（原创措辞，正/反两方立场）
const TOPICS = [
  { q: '异地恋该不该坚持', pos: '该坚持', neg: '不该坚持' },
  { q: '工作群里领导发的消息，要不要秒回', pos: '要秒回', neg: '不必秒回' },
  { q: '结婚后该不该和父母同住', pos: '该同住', neg: '不该同住' },
  { q: '朋友的对象出轨了，该不该告诉朋友', pos: '该告诉', neg: '不该告诉' },
  { q: '该不该为了高薪，做一份自己讨厌的工作', pos: '该', neg: '不该' },
  { q: '另一半比我赚得多很多，这段关系健不健康', pos: '健康', neg: '不健康' },
  { q: '三十岁还没存款，是不是很失败', pos: '是', neg: '不是' },
  { q: '相亲时该不该坦白自己的真实收入', pos: '该坦白', neg: '不必坦白' },
  { q: '当代年轻人选择躺平，是智慧还是逃避', pos: '是智慧', neg: '是逃避' },
  { q: '好朋友找我借一大笔钱，该不该借', pos: '该借', neg: '不该借' },
  { q: '该不该把工资卡上交给另一半', pos: '该上交', neg: '不该上交' },
  { q: '孩子考砸了，该批评还是该安慰', pos: '该批评', neg: '该安慰' },
  { q: '为了陪伴家人，该不该放弃大城市的高薪机会', pos: '该放弃', neg: '不该放弃' },
  { q: '恋爱中，该不该查看对方的手机', pos: '该查', neg: '不该查' },
  { q: '同事当众甩锅给我，该当面戳穿还是忍下来', pos: '当面戳穿', neg: '忍下来' },
  { q: '该不该和很聊得来、但收入很低的人结婚', pos: '该', neg: '不该' },
  { q: '父母该不该告诉孩子"家里不富裕"', pos: '该说', neg: '不该说' },
  { q: '该不该为了孩子，维持一段没有爱的婚姻', pos: '该维持', neg: '不该维持' },
  { q: '工作和兴趣冲突时，该不该把兴趣变成工作', pos: '该', neg: '不该' },
  { q: '【脑洞】如果能一键删掉一段痛苦的记忆，你会删吗', pos: '会删', neg: '不删' },
  { q: '【脑洞】有台机器能精准预测你的死期，你想知道吗', pos: '想知道', neg: '不想知道' },
  { q: '【脑洞】如果可以永远 25 岁，但要失去所有记忆，你愿意吗', pos: '愿意', neg: '不愿意' },
  { q: '被全世界误解、只有自己知道真相，这份坚持值不值得', pos: '值得', neg: '不值得' },
  { q: '感情里，主动的一方是不是就输了', pos: '是', neg: '不是' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function sideLabel(side) { return side === 'pos' ? '正方' : '反方'; }
function sideShort(side) { return side === 'pos' ? '正' : '反'; }
function roleLabel(pos) { return pos === 1 ? '一辩' : pos === 2 ? '二辩' : '三辩'; }
function sideColor(side) { return side === 'pos' ? 'rose' : 'sky'; }

export default function Debate() {
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]); // 需正好 6 个
  const [password, setPassword] = useState('');
  const [mentorCount, setMentorCount] = useState(2); // 1 或 2 位导师
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customMode, setCustomMode] = useState(false);
  const [customQ, setCustomQ] = useState('');
  const [customPos, setCustomPos] = useState('正方');
  const [customNeg, setCustomNeg] = useState('反方');

  const [stage, setStage] = useState('setup'); // setup | playing | ended
  const [debaters, setDebaters] = useState([]); // 6 名：{id, modelIndex, displayName, side, pos, avatar}
  const [mentors, setMentors] = useState([]); // modelIndex[]
  const [evaluatorIdx, setEvaluatorIdx] = useState(null);
  const [phase, setPhase] = useState(''); // pre-vote|opening|clash|closing|mentor|post-vote
  const [activeKey, setActiveKey] = useState(null); // 正在发言者的 modelIndex
  const [audience, setAudience] = useState({ initial: null, final: null }); // {pos,neg,reason}
  const [statements, setStatements] = useState([]); // 立论 [{side,pos,modelIndex,text}]
  const [clash, setClash] = useState([]); // 开杠 [{side,pos,modelIndex,text}]
  const [bicker, setBicker] = useState([]); // 抬杠·全员混战 [{side,pos,modelIndex,text}]
  const [closings, setClosings] = useState([]); // 结辩 [{side,pos,modelIndex,text,isLast}]
  const [mentorComments, setMentorComments] = useState([]); // [{modelIndex,text}]
  const [winner, setWinner] = useState(''); // pos|neg|tie
  const [mvp, setMvp] = useState(null); // {side,pos} or null
  const [running, setRunning] = useState(false);
  const [showReason, setShowReason] = useState(true); // 显示评审/观众跑票理由
  const [error, setError] = useState('');

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingGame, setViewingGame] = useState(null);

  const abortRef = useRef(false);
  const savedRef = useRef(false);
  const logEndRef = useRef(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  useEffect(() => {
    fetch('/api/debate').then(r => r.json()).then(data => {
      if (data.players) {
        const configured = data.players.filter(p => p.configured).map(p => ({ ...p, displayName: slotName(p.index) }));
        setAvailableModels(configured);
        setSelectedModels(orderByDefault(configured).map(p => p.index));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [statements, clash, closings, mentorComments, phase, activeKey, audience]);

  const callModel = async (modelIndex, system, user, maxTokens = 280, allowLong = false) => {
    const resp = await fetch('/api/debate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIndex: modelIndex, system, user, maxTokens, password, allowLong }),
    });
    const rawText = await resp.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch (e) {
      const snippet = rawText.replace(/\s+/g, ' ').slice(0, 120);
      throw new Error('模型 ' + modelIndex + ' 返回异常（HTTP ' + resp.status + '）：' + (snippet || '空响应'));
    }
    if (!resp.ok || data.error) throw new Error((data.error && data.error.message) || ('模型 ' + modelIndex + ' 调用失败'));
    return data.text;
  };

  const toggleModel = (index) => {
    setSelectedModels(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };
  const rollTopic = () => { setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]); };

  // 选评审：优先可靠且非 MiniMax 的模型（DeepSeek > 智谱 > 千问 > 其它非 MiniMax > 任意）
  function pickEvaluator(idxs) {
    const byName = (n) => idxs.find(i => slotName(i).includes(n));
    return byName('DeepSeek') || byName('智谱') || byName('千问')
      || idxs.find(i => !slotName(i).includes('MiniMax')) || idxs[0];
  }

  const startDebate = () => {
    setError('');
    const usable = selectedModels.length > 0 ? [...selectedModels] : orderByDefault(availableModels).map(m => m.index);
    if (usable.length !== 6) { setError('奇葩说是 3v3，请正好选择 6 个模型参战'); return; }
    let curTopic = topic;
    if (customMode) {
      if (!customQ.trim()) { setError('请填写自定义辩题'); return; }
      curTopic = { q: customQ.trim(), pos: customPos.trim() || '正方', neg: customNeg.trim() || '反方' };
      setTopic(curTopic);
    }
    // 随机分 3v3 + 辩位
    const sh = shuffle(usable);
    const posIdx = sh.slice(0, 3), negIdx = sh.slice(3, 6);
    const ds = [];
    posIdx.forEach((mi, k) => ds.push({ id: ds.length + 1, modelIndex: mi, displayName: slotName(mi), side: 'pos', pos: k + 1, avatar: ds.length % AVATAR_STYLES.length }));
    negIdx.forEach((mi, k) => ds.push({ id: ds.length + 1, modelIndex: mi, displayName: slotName(mi), side: 'neg', pos: k + 1, avatar: ds.length % AVATAR_STYLES.length }));
    const mts = shuffle(usable).slice(0, Math.max(1, Math.min(2, mentorCount)));
    const evalIdx = pickEvaluator(usable);

    abortRef.current = false; savedRef.current = false;
    setDebaters(ds); setMentors(mts); setEvaluatorIdx(evalIdx);
    setAudience({ initial: null, final: null });
    setStatements([]); setClash([]); setBicker([]); setClosings([]); setMentorComments([]);
    setWinner(''); setMvp(null); setError(''); setPhase('');
    setStage('playing');
    setTimeout(() => runDebate(ds, curTopic, mts, evalIdx), 300);
  };

  const finalize = (result, mvpInfo, curTopic, ds, aud, stmts, cl, bk, clo, mc) => {
    setWinner(result); setMvp(mvpInfo); setStage('ended'); setRunning(false); setPhase('');
    if (!savedRef.current) {
      savedRef.current = true;
      saveGame({
        kind: 'debate',
        topic: curTopic,
        debaters: ds.map(d => ({ id: d.id, modelIndex: d.modelIndex, modelName: slotName(d.modelIndex), side: d.side, pos: d.pos, avatar: d.avatar })),
        mentors: mc.map(m => ({ modelIndex: m.modelIndex, modelName: slotName(m.modelIndex), text: m.text })),
        audience: aud, statements: stmts, clash: cl, bicker: bk, closings: clo,
        winner: result, mvp: mvpInfo,
      });
      setHistory(loadHistory());
    }
  };

  const runDebate = async (ds, curTopic, mts, evalIdx) => {
    if (abortRef.current) return;
    setRunning(true); setError('');
    const find = (side, pos) => ds.find(d => d.side === side && d.pos === pos);

    // ===== 1. 拟真观众·初始投票 =====
    setPhase('pre-vote'); setActiveKey(null);
    let aud = { initial: null, final: null };
    try {
      const raw = await callModel(evalIdx, buildAudiencePreSystem(curTopic), buildAudiencePreUser(curTopic), 200, false);
      const rawPre = parseVoteSplit(raw);
      const baseP = jitterPos(rawPre.pos);
      aud.initial = { pos: baseP, neg: 100 - baseP, reason: reasonOf(raw), _raw: rawPre.pos };
    } catch (e) { aud.initial = { pos: 50, neg: 50, reason: '（初始投票获取失败，按 50:50 起算）' }; }
    setAudience({ ...aud });
    if (abortRef.current) { setRunning(false); return; }
    await sleep(600);

    // 落后方拿"后结辩"
    const trailSide = aud.initial.pos < aud.initial.neg ? 'pos' : 'neg';
    const leadSide = trailSide === 'pos' ? 'neg' : 'pos';

    // ===== 2. 立论（正一→反一→正二→反二→正三→反三）=====
    setPhase('opening');
    const order = [];
    for (let p = 1; p <= 3; p++) { order.push(find('pos', p)); order.push(find('neg', p)); }
    let stmts = [];
    for (const d of order) {
      if (abortRef.current) { setRunning(false); return; }
      setActiveKey(d.modelIndex);
      try {
        const text = await callModel(d.modelIndex, buildOpeningSystem(d, curTopic), buildOpeningUser(d, curTopic, stmts), 320, true);
        stmts = [...stmts, { side: d.side, pos: d.pos, modelIndex: d.modelIndex, text: cleanText(text) }];
        setStatements([...stmts]);
      } catch (e) { setError(e.message); setRunning(false); setActiveKey(null); return; }
    }

    // ===== 3. 开杠（正一 vs 反一，4 回合）=====
    setPhase('clash'); setActiveKey(null);
    await sleep(500);
    const p1 = find('pos', 1), n1 = find('neg', 1);
    const clashOrder = [p1, n1, p1, n1];
    let cl = [];
    for (const d of clashOrder) {
      if (abortRef.current) { setRunning(false); return; }
      setActiveKey(d.modelIndex);
      try {
        const text = await callModel(d.modelIndex, buildClashSystem(d, curTopic), buildClashUser(d, curTopic, stmts, cl), 140, false);
        cl = [...cl, { side: d.side, pos: d.pos, modelIndex: d.modelIndex, text: cleanText(text) }];
        setClash([...cl]);
      } catch (e) { /* 开杠某句失败则跳过，不中断 */ }
    }
    setActiveKey(null);

    // ===== 3.5 抬杠（全员混战，一轮短兵、火力全开）=====
    setPhase('bicker'); setActiveKey(null);
    await sleep(450);
    const bickerOrder = [];
    for (let p = 1; p <= 3; p++) { bickerOrder.push(find('pos', p)); bickerOrder.push(find('neg', p)); }
    let bk = [];
    for (const d of bickerOrder) {
      if (abortRef.current) { setRunning(false); return; }
      setActiveKey(d.modelIndex);
      try {
        const text = await callModel(d.modelIndex, buildBickerSystem(d, curTopic), buildBickerUser(d, curTopic, stmts, cl, bk), 120, false);
        if (cleanText(text)) { bk = [...bk, { side: d.side, pos: d.pos, modelIndex: d.modelIndex, text: cleanText(text) }]; setBicker([...bk]); }
      } catch (e) { /* 抬杠某句失败则跳过 */ }
    }
    setActiveKey(null);

    // ===== 4. 结辩（领先方先、落后方后结辩）=====
    setPhase('closing');
    await sleep(400);
    const closeOrder = [find(leadSide, 3), find(trailSide, 3)];
    let clo = [];
    for (let k = 0; k < closeOrder.length; k++) {
      const d = closeOrder[k];
      const isLast = k === closeOrder.length - 1;
      if (abortRef.current) { setRunning(false); return; }
      setActiveKey(d.modelIndex);
      try {
        const text = await callModel(d.modelIndex, buildClosingSystem(d, curTopic, isLast), buildClosingUser(d, curTopic, stmts, cl, bk, clo), 340, true);
        clo = [...clo, { side: d.side, pos: d.pos, modelIndex: d.modelIndex, text: cleanText(text), isLast }];
        setClosings([...clo]);
      } catch (e) { setError(e.message); setRunning(false); setActiveKey(null); return; }
    }
    setActiveKey(null);

    // ===== 5. 导师点评 =====
    setPhase('mentor');
    await sleep(400);
    let mc = [];
    for (const mi of mts) {
      if (abortRef.current) { setRunning(false); return; }
      setActiveKey(mi);
      try {
        const text = await callModel(mi, buildMentorSystem(mi, curTopic), buildMentorUser(curTopic, stmts, cl, bk, clo), 260, true);
        if (cleanText(text)) { mc = [...mc, { modelIndex: mi, text: cleanText(text) }]; setMentorComments([...mc]); }
      } catch (e) { /* 导师失败跳过 */ }
    }
    setActiveKey(null);

    // ===== 6. 拟真观众·最终投票 + 跑票判胜负 =====
    setPhase('post-vote');
    await sleep(400);
    let mvpInfo = null;
    try {
      const raw = await callModel(evalIdx, buildAudiencePostSystem(curTopic), buildAudiencePostUser(curTopic, aud.initial, stmts, cl, bk, clo), 320, false);
      const rawPost = parseVoteSplit(raw);
      const swing = rawPost.pos - aud.initial._raw;
      const fp = Math.max(2, Math.min(98, aud.initial.pos + swing));
      aud.final = { pos: fp, neg: 100 - fp, reason: reasonOf(raw) };
      mvpInfo = parseMvp(raw);
    } catch (e) {
      aud.final = { pos: aud.initial.pos, neg: aud.initial.neg, reason: '（最终投票获取失败）' };
    }
    setAudience({ ...aud });

    const result = aud.final.pos > aud.initial.pos ? 'pos' : aud.final.pos < aud.initial.pos ? 'neg' : 'tie';
    finalize(result, mvpInfo, curTopic, ds, aud, stmts, cl, bk, clo, mc);
  };

  const stopDebate = () => { abortRef.current = true; setRunning(false); };
  const reset = () => {
    abortRef.current = true;
    setStage('setup'); setDebaters([]); setMentors([]); setEvaluatorIdx(null);
    setPhase(''); setActiveKey(null); setAudience({ initial: null, final: null });
    setStatements([]); setClash([]); setBicker([]); setClosings([]); setMentorComments([]);
    setWinner(''); setMvp(null); setError(''); setRunning(false);
  };
  const rerun = () => { rollTopic(); setCustomMode(false); reset(); };

  // ============================ 渲染 ============================

  if (stage === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium mb-4">
              <Scale className="w-3.5 h-3.5" /> AI 竞技场
            </div>
            <h1 className="text-3xl font-bold mb-2">奇葩说</h1>
            <p className="text-slate-400 text-sm">六个大模型 3v3 唇枪舌战，现场观众跑票定胜负</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div>
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 选择参战模型（每局随机分 3v3）</span>
                <span className={selectedModels.length === 6 ? 'text-emerald-400' : 'text-amber-400'}>{selectedModels.length}/6</span>
              </div>
              {availableModels.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {orderByDefault(availableModels).map(m => {
                      const on = selectedModels.includes(m.index);
                      return (
                        <button key={m.index} onClick={() => toggleModel(m.index)}
                          className={'text-sm px-3 py-2 rounded-lg border transition ' + (on ? 'bg-amber-500/90 border-amber-400 text-white' : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500')}>
                          {m.displayName}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={() => setSelectedModels(orderByDefault(availableModels).map(m => m.index))} className="text-xs text-slate-400 hover:text-amber-300 transition">全选</button>
                    <button onClick={() => setSelectedModels([])} className="text-xs text-slate-400 hover:text-amber-300 transition">清空</button>
                    <span className="text-xs text-slate-500">需正好 6 个</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-amber-400/80 bg-amber-500/10 rounded-lg p-2.5 leading-relaxed">
                  还没检测到已配置的模型。请在部署平台配置 PLAYER_1~6 的环境变量后刷新。
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span>本场辩题</span>
                {!customMode && <button onClick={rollTopic} className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1"><Shuffle className="w-3 h-3" /> 换一个</button>}
              </div>
              {!customMode ? (
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3">
                  <div className="text-sm font-medium mb-2">{topic.q}？</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">正方 · {topic.pos}</span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">反方 · {topic.neg}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input value={customQ} onChange={e => setCustomQ(e.target.value)} placeholder="辩题，例如：异地恋该不该坚持"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                  <div className="flex gap-2">
                    <input value={customPos} onChange={e => setCustomPos(e.target.value)} placeholder="正方观点"
                      className="flex-1 bg-slate-900/60 border border-rose-500/40 rounded-lg px-3 py-2 text-sm text-rose-200 focus:outline-none focus:border-rose-400" />
                    <input value={customNeg} onChange={e => setCustomNeg(e.target.value)} placeholder="反方观点"
                      className="flex-1 bg-slate-900/60 border border-sky-500/40 rounded-lg px-3 py-2 text-sm text-sky-200 focus:outline-none focus:border-sky-400" />
                  </div>
                </div>
              )}
              <button onClick={() => setCustomMode(!customMode)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">{customMode ? '← 用内置辩题' : '自定义辩题 →'}</button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">导师人数（纯点评、不投票）</span>
              <div className="flex gap-1.5">
                {[1, 2].map(n => (
                  <button key={n} onClick={() => setMentorCount(n)}
                    className={'text-xs w-8 h-8 rounded-lg border transition ' + (mentorCount === n ? 'bg-violet-500/80 border-violet-400 text-white' : 'bg-slate-700/40 border-slate-600 text-slate-400')}>{n}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-2">访问密码（后端如设置了才需要）</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="留空则不验证"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            {error && <div className="text-xs text-rose-300 bg-rose-500/10 rounded-lg p-2.5">{error}</div>}
            <button onClick={startDebate} disabled={selectedModels.length !== 6}
              className="w-full bg-gradient-to-r from-amber-500 to-rose-500 text-white py-3 rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Play className="w-4 h-4" /> 开始辩论
            </button>
            {history.length > 0 && (
              <button onClick={() => setShowHistory(true)}
                className="w-full bg-slate-700/40 border border-slate-600 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:border-slate-500 transition flex items-center justify-center gap-2">
                <History className="w-4 h-4" /> 历史记录（{history.length}）
              </button>
            )}
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">每局随机分正反方 · 100 名拟真观众赛前赛后两次投票 · 跑票多者胜</p>
        </div>
        {showHistory && <HistoryPanel history={history} onClose={() => setShowHistory(false)} onView={(g) => { setViewingGame(g); setShowHistory(false); }} onDelete={(id) => { deleteGame(id); setHistory(loadHistory()); }} onClear={() => { clearHistory(); setHistory([]); }} />}
        {viewingGame && <DebateReplay game={viewingGame} onClose={() => setViewingGame(null)} />}
      </div>
    );
  }

  const banner = phaseBanner(phase);
  const posTeam = debaters.filter(d => d.side === 'pos').sort((a, b) => a.pos - b.pos);
  const negTeam = debaters.filter(d => d.side === 'neg').sort((a, b) => a.pos - b.pos);
  const isMentor = (mi) => mentors.includes(mi);
  const isEval = (mi) => mi === evaluatorIdx;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm flex items-center gap-1.5 shrink-0"><Scale className="w-4 h-4 text-amber-500" /> 奇葩说</span>
            {banner && running && <span className={'text-xs px-2 py-0.5 rounded-full text-white ' + banner.cls}>{banner.icon} {banner.label}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowReason(!showReason)}
              className={'text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ' + (showReason ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500')}>
              {showReason ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} 解说
            </button>
            <button onClick={reset} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> 新一局
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* 辩题 */}
        <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <div className="text-lg font-bold mb-2">{topic.q}？</div>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">正方 · {topic.pos}</span>
            <span className="text-slate-300">VS</span>
            <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 font-medium">反方 · {topic.neg}</span>
          </div>
        </div>

        {/* 票数条 */}
        <VoteBar initial={audience.initial} final={audience.final} topic={topic} winner={winner} showReason={showReason} />

        {/* 双方阵容 */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {[{ team: posTeam, side: 'pos' }, { team: negTeam, side: 'neg' }].map(({ team, side }) => (
            <div key={side} className={'rounded-2xl border p-3 ' + (side === 'pos' ? 'bg-rose-50/60 border-rose-200' : 'bg-sky-50/60 border-sky-200')}>
              <div className={'text-xs font-bold mb-2 ' + (side === 'pos' ? 'text-rose-700' : 'text-sky-700')}>{sideLabel(side)} · {side === 'pos' ? topic.pos : topic.neg}</div>
              <div className="space-y-1.5">
                {team.map(d => {
                  const st = AVATAR_STYLES[d.avatar];
                  return (
                    <div key={d.id} className={'flex items-center gap-2 rounded-lg px-2 py-1.5 bg-white border transition ' + (activeKey === d.modelIndex ? (side === 'pos' ? 'border-rose-400 ring-1 ring-rose-300' : 'border-sky-400 ring-1 ring-sky-300') : 'border-slate-200')}>
                      <div className={'w-6 h-6 rounded ' + st.bg + ' ' + st.text + ' flex items-center justify-center font-bold text-[11px]'}>{d.pos}</div>
                      <span className="text-xs font-medium truncate">{d.displayName}</span>
                      <span className="text-[10px] text-slate-400">{roleLabel(d.pos)}</span>
                      <span className="ml-auto flex items-center gap-1">
                        {isEval(d.modelIndex) && <Gavel className="w-3 h-3 text-slate-400" />}
                        {isMentor(d.modelIndex) && <Mic className="w-3 h-3 text-violet-400" />}
                        {activeKey === d.modelIndex && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {showReason && (mentors.length > 0 || evaluatorIdx) && (
          <div className="mb-4 text-[11px] text-slate-400 flex items-center gap-3 px-1">
            <span className="flex items-center gap-1"><Gavel className="w-3 h-3" /> 评审(算跑票)：{slotName(evaluatorIdx)}</span>
            <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> 导师：{mentors.map(slotName).join('、')}</span>
            <span className="text-slate-300">（中立角色由模型客串）</span>
          </div>
        )}

        {/* ===== 时间线 ===== */}
        <div className="space-y-4">
          {/* 立论 */}
          {(statements.length > 0 || phase === 'opening') && (
            <SectionCard icon={<Megaphone className="w-3.5 h-3.5" />} title="立论" tone="slate">
              {statements.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} />)}
              {phase === 'opening' && activeKey != null && <Speaking who={debaters.find(d => d.modelIndex === activeKey)} verb="立论中" />}
            </SectionCard>
          )}

          {/* 开杠 */}
          {(clash.length > 0 || phase === 'clash') && (
            <SectionCard icon={<Swords className="w-3.5 h-3.5" />} title="开杠 · 短兵相接" tone="fuchsia">
              {clash.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} compact />)}
              {phase === 'clash' && activeKey != null && <Speaking who={debaters.find(d => d.modelIndex === activeKey)} verb="开杠中" />}
            </SectionCard>
          )}

          {/* 抬杠·全员混战 */}
          {(bicker.length > 0 || phase === 'bicker') && (
            <SectionCard icon={<Flame className="w-3.5 h-3.5" />} title="抬杠 · 全员混战" tone="orange">
              {bicker.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} compact />)}
              {phase === 'bicker' && activeKey != null && <Speaking who={debaters.find(d => d.modelIndex === activeKey)} verb="开火中" />}
            </SectionCard>
          )}

          {/* 结辩 */}
          {(closings.length > 0 || phase === 'closing') && (
            <SectionCard icon={<Quote className="w-3.5 h-3.5" />} title="结辩" tone="amber">
              {closings.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} closing />)}
              {phase === 'closing' && activeKey != null && <Speaking who={debaters.find(d => d.modelIndex === activeKey)} verb="结辩中" />}
            </SectionCard>
          )}

          {/* 导师点评 */}
          {(mentorComments.length > 0 || phase === 'mentor') && (
            <SectionCard icon={<Mic className="w-3.5 h-3.5" />} title="导师点评" tone="violet">
              {mentorComments.map((m, i) => {
                const st = AVATAR_STYLES[(debaters.find(d => d.modelIndex === m.modelIndex) || {}).avatar || 0];
                return (
                  <div key={i} className="flex gap-2.5">
                    <div className={'shrink-0 w-7 h-7 rounded-lg ' + st.bg + ' ' + st.text + ' flex items-center justify-center'}><Mic className="w-3.5 h-3.5" /></div>
                    <div className="flex-1">
                      <div className="text-xs text-violet-600 mb-0.5">导师 · {slotName(m.modelIndex)}</div>
                      <div className="text-sm text-slate-700 leading-relaxed">{m.text}</div>
                    </div>
                  </div>
                );
              })}
              {phase === 'mentor' && activeKey != null && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> {slotName(activeKey)} 点评中…</div>}
            </SectionCard>
          )}

          {phase === 'post-vote' && running && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> 现场观众正在最终投票…
            </div>
          )}
        </div>

        {/* 结果 */}
        {stage === 'ended' && audience.final && (
          <div className={'mt-4 rounded-2xl p-5 text-center text-white ' + (winner === 'pos' ? 'bg-rose-500' : winner === 'neg' ? 'bg-sky-500' : 'bg-slate-500')}>
            <Trophy className="w-8 h-8 mx-auto mb-2" />
            <div className="text-lg font-bold">
              {winner === 'tie' ? '平局！双方跑票持平' : (sideLabel(winner) + '获胜！' + (winner === 'pos' ? topic.pos : topic.neg))}
            </div>
            <div className="text-sm opacity-90 mt-1">
              初始 {audience.initial.pos}:{audience.initial.neg} → 最终 {audience.final.pos}:{audience.final.neg}
              {winner !== 'tie' && <span> · {sideLabel(winner)}跑票 +{Math.abs(audience.final.pos - audience.initial.pos)}</span>}
            </div>
            {mvp && (() => {
              const d = debaters.find(x => x.side === mvp.side && x.pos === mvp.pos);
              return <div className="text-xs opacity-90 mt-2 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1"><Sparkles className="w-3.5 h-3.5" /> 本场 MVP：{sideLabel(mvp.side)}{roleLabel(mvp.pos)}{d ? '（' + d.displayName + '）' : ''}</div>;
            })()}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* 控制 */}
        <div className="sticky bottom-0 bg-slate-50 pt-3 pb-4 mt-4">
          {running ? (
            <button onClick={stopDebate} className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <Pause className="w-4 h-4" /> 辩论进行中…（点此中断）
            </button>
          ) : stage === 'ended' ? (
            <button onClick={rerun} className="w-full bg-gradient-to-r from-amber-500 to-rose-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4" /> 换个辩题再来一局
            </button>
          ) : (
            <button onClick={reset} className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> 返回设置
            </button>
          )}
        </div>
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

// ============================ 子组件 ============================

function SectionCard({ icon, title, tone, children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className={'px-4 py-2 border-b text-xs font-medium flex items-center gap-1.5 ' + (tones[tone] || tones.slate)}>{icon} {title}</div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

function SpeechRow({ s, debaters, compact, closing }) {
  const d = debaters.find(x => x.modelIndex === s.modelIndex) || {};
  const st = AVATAR_STYLES[d.avatar || 0];
  return (
    <div className="flex items-start gap-2.5">
      <div className={'shrink-0 rounded-lg ' + st.bg + ' ' + st.text + ' flex items-center justify-center font-bold ' + (compact ? 'w-6 h-6 text-[11px]' : 'w-7 h-7 text-xs')}>{s.pos}</div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={'text-[10px] px-1.5 py-0.5 rounded font-medium ' + (s.side === 'pos' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700')}>{sideLabel(s.side)}{roleLabel(s.pos)}</span>
          <span className="text-xs text-slate-500">{slotName(s.modelIndex)}</span>
          {closing && s.isLast && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">后结辩 · 最后陈词</span>}
        </div>
        <div className="text-sm text-slate-800 mt-0.5 leading-relaxed">{s.text}</div>
      </div>
    </div>
  );
}

function Speaking({ who, verb }) {
  if (!who) return null;
  return <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> {sideLabel(who.side)}{roleLabel(who.pos)}（{who.displayName}）{verb}…</div>;
}

function VoteBar({ initial, final, topic, winner, showReason }) {
  const cur = final || initial;
  if (!cur) return (
    <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> 现场观众正在投票…
    </div>
  );
  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-bold text-rose-600">正方 {cur.pos}</span>
        <span className="text-slate-400">{final ? '最终票数' : '初始票数'}（共 100 人）</span>
        <span className="font-bold text-sky-600">{cur.neg} 反方</span>
      </div>
      {initial && final ? (() => {
        const lo = Math.min(initial.pos, final.pos);
        const hi = Math.max(initial.pos, final.pos);
        const swing = hi - lo;
        const posGained = final.pos > initial.pos;
        const stripe = posGained
          ? 'repeating-linear-gradient(45deg,#fb7185,#fb7185 5px,#fecdd3 5px,#fecdd3 10px)'
          : 'repeating-linear-gradient(45deg,#38bdf8,#38bdf8 5px,#bae6fd 5px,#bae6fd 10px)';
        return (
          <div className="h-4 rounded-full overflow-hidden flex bg-slate-100" title={(posGained ? '正方' : '反方') + '跑票 +' + swing}>
            <div className="bg-rose-400 h-full transition-all duration-700" style={{ width: lo + '%' }} />
            {swing > 0 && <div className="h-full transition-all duration-700" style={{ width: swing + '%', background: stripe }} />}
            <div className="bg-sky-400 h-full transition-all duration-700" style={{ width: (100 - hi) + '%' }} />
          </div>
        );
      })() : (
        <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
          <div className="bg-rose-400 h-full transition-all duration-700" style={{ width: cur.pos + '%' }} />
          <div className="bg-sky-400 h-full transition-all duration-700" style={{ width: cur.neg + '%' }} />
        </div>
      )}
      {initial && final && (
        <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-center gap-2 flex-wrap">
          <span>初始 {initial.pos}:{initial.neg}</span>
          <ChevronRight className="w-3 h-3" />
          <span>最终 {final.pos}:{final.neg}</span>
          {final.pos !== initial.pos ? (
            <span className={'font-medium ' + (final.pos > initial.pos ? 'text-rose-600' : 'text-sky-600')}>
              · 斜纹区 = 被说服改投{final.pos > initial.pos ? '正方' : '反方'}的 {Math.abs(final.pos - initial.pos)} 票
            </span>
          ) : <span className="text-slate-400">· 无人跑票</span>}
        </div>
      )}
      {showReason && cur.reason && (
        <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
          <span className="text-slate-400">{final ? '跑票解读：' : '初始倾向：'}</span>{cur.reason}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ history, onClose, onView, onDelete, onClear }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col text-slate-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-amber-400" /> 历史记录</div>
          <div className="flex items-center gap-3">
            {history.length > 0 && <button onClick={() => { if (confirm('确定清空全部历史记录？')) onClear(); }} className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> 清空</button>}
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-3 space-y-2">
          {history.length === 0 ? <div className="text-center text-slate-500 text-sm py-10">还没有历史记录</div> :
            history.map(g => {
              const w = g.winner;
              const wc = w === 'pos' ? 'bg-rose-500' : w === 'neg' ? 'bg-sky-500' : 'bg-slate-500';
              const wl = w === 'tie' ? '平局' : (sideLabel(w) + '胜');
              return (
                <div key={g.id} className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 hover:border-slate-500 transition cursor-pointer group" onClick={() => onView(g)}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium truncate flex-1">{g.topic ? g.topic.q : '辩论'}？</span>
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium text-white shrink-0 ' + wc}>{wl}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(g.id); }} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{g.audience && g.audience.initial && g.audience.final ? (g.audience.initial.pos + ':' + g.audience.initial.neg + ' → ' + g.audience.final.pos + ':' + g.audience.final.neg) : ''}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(g.createdAt)}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function DebateReplay({ game, onClose }) {
  const topic = game.topic || { q: '', pos: '正方', neg: '反方' };
  const debaters = (game.debaters || []).map(d => ({ ...d, displayName: slotName(d.modelIndex) }));
  const posTeam = debaters.filter(d => d.side === 'pos').sort((a, b) => a.pos - b.pos);
  const negTeam = debaters.filter(d => d.side === 'neg').sort((a, b) => a.pos - b.pos);
  const w = game.winner;
  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> 返回</button>
          <span className="text-xs text-slate-400">{formatTime(game.createdAt)}</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-4">
        <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <div className="text-lg font-bold mb-2">{topic.q}？</div>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">正方 · {topic.pos}</span>
            <span className="text-slate-300">VS</span>
            <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 font-medium">反方 · {topic.neg}</span>
          </div>
        </div>
        <VoteBar initial={game.audience && game.audience.initial} final={game.audience && game.audience.final} topic={topic} winner={w} showReason={true} />
        <div className="mb-4 grid grid-cols-2 gap-3">
          {[{ team: posTeam, side: 'pos' }, { team: negTeam, side: 'neg' }].map(({ team, side }) => (
            <div key={side} className={'rounded-2xl border p-3 ' + (side === 'pos' ? 'bg-rose-50/60 border-rose-200' : 'bg-sky-50/60 border-sky-200')}>
              <div className={'text-xs font-bold mb-2 ' + (side === 'pos' ? 'text-rose-700' : 'text-sky-700')}>{sideLabel(side)} · {side === 'pos' ? topic.pos : topic.neg}</div>
              <div className="space-y-1.5">
                {team.map(d => { const st = AVATAR_STYLES[d.avatar]; return (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-white border border-slate-200">
                    <div className={'w-6 h-6 rounded ' + st.bg + ' ' + st.text + ' flex items-center justify-center font-bold text-[11px]'}>{d.pos}</div>
                    <span className="text-xs font-medium truncate">{d.displayName}</span><span className="text-[10px] text-slate-400">{roleLabel(d.pos)}</span>
                  </div>); })}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {(game.statements || []).length > 0 && <SectionCard icon={<Megaphone className="w-3.5 h-3.5" />} title="立论" tone="slate">{game.statements.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} />)}</SectionCard>}
          {(game.clash || []).length > 0 && <SectionCard icon={<Swords className="w-3.5 h-3.5" />} title="开杠 · 短兵相接" tone="fuchsia">{game.clash.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} compact />)}</SectionCard>}
          {(game.bicker || []).length > 0 && <SectionCard icon={<Flame className="w-3.5 h-3.5" />} title="抬杠 · 全员混战" tone="orange">{game.bicker.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} compact />)}</SectionCard>}
          {(game.closings || []).length > 0 && <SectionCard icon={<Quote className="w-3.5 h-3.5" />} title="结辩" tone="amber">{game.closings.map((s, i) => <SpeechRow key={i} s={s} debaters={debaters} closing />)}</SectionCard>}
          {(game.mentors || []).length > 0 && <SectionCard icon={<Mic className="w-3.5 h-3.5" />} title="导师点评" tone="violet">{game.mentors.map((m, i) => (
            <div key={i} className="flex gap-2.5"><div className="shrink-0 w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center"><Mic className="w-3.5 h-3.5" /></div><div className="flex-1"><div className="text-xs text-violet-600 mb-0.5">导师 · {m.modelName || slotName(m.modelIndex)}</div><div className="text-sm text-slate-700 leading-relaxed">{m.text}</div></div></div>
          ))}</SectionCard>}
        </div>
        <div className={'mt-4 rounded-2xl p-5 text-center text-white ' + (w === 'pos' ? 'bg-rose-500' : w === 'neg' ? 'bg-sky-500' : 'bg-slate-500')}>
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <div className="text-lg font-bold">{w === 'tie' ? '平局' : (sideLabel(w) + '获胜！' + (w === 'pos' ? topic.pos : topic.neg))}</div>
          {game.audience && game.audience.initial && game.audience.final && <div className="text-sm opacity-90 mt-1">初始 {game.audience.initial.pos}:{game.audience.initial.neg} → 最终 {game.audience.final.pos}:{game.audience.final.neg}</div>}
          {game.mvp && (() => { const d = debaters.find(x => x.side === game.mvp.side && x.pos === game.mvp.pos); return <div className="text-xs opacity-90 mt-2 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1"><Sparkles className="w-3.5 h-3.5" /> MVP：{sideLabel(game.mvp.side)}{roleLabel(game.mvp.pos)}{d ? '（' + d.displayName + '）' : ''}</div>; })()}
        </div>
      </div>
    </div>
  );
}

// ============================ 工具函数 ============================

function phaseBanner(phase) {
  const m = {
    'pre-vote': { icon: '🗳️', label: '观众初投', cls: 'bg-slate-600' },
    'opening': { icon: '📣', label: '立论', cls: 'bg-slate-700' },
    'clash': { icon: '⚔️', label: '开杠', cls: 'bg-fuchsia-600' },
    'bicker': { icon: '🥊', label: '抬杠混战', cls: 'bg-orange-600' },
    'closing': { icon: '🔥', label: '结辩', cls: 'bg-amber-600' },
    'mentor': { icon: '🎤', label: '导师点评', cls: 'bg-violet-600' },
    'post-vote': { icon: '🗳️', label: '观众终投', cls: 'bg-slate-600' },
  };
  return m[phase] || null;
}

function cleanText(t) {
  if (!t) return '';
  return String(t).replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '').replace(/^(发言|立论|结辩|陈词|点评|开杠)[:：]\s*/, '').trim();
}

// 解析评审输出的票数 → 归一化到 100
function parseVoteSplit(raw) {
  const t = String(raw || '');
  const pm = t.match(/正方[^\d]{0,4}(\d+)/);
  const nm = t.match(/反方[^\d]{0,4}(\d+)/);
  let pos = pm ? parseInt(pm[1], 10) : null;
  let neg = nm ? parseInt(nm[1], 10) : null;
  if (pos == null && neg == null) return { pos: 50, neg: 50 };
  if (pos == null) pos = 100 - neg;
  if (neg == null) neg = 100 - pos;
  const sum = pos + neg;
  if (sum <= 0) return { pos: 50, neg: 50 };
  pos = Math.round((pos / sum) * 100);
  pos = Math.max(0, Math.min(100, pos));
  return { pos, neg: 100 - pos };
}

function reasonOf(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/(?:理由|原因|说明|跑票原因|跑票)[:：]\s*([\s\S]+)/);
  if (m) return m[1].replace(/最佳辩手[\s\S]*/, '').trim().slice(0, 160);
  const lines = t.split(/\n+/).map(s => s.trim()).filter(Boolean);
  for (const ln of lines) {
    if (/正方/.test(ln) && /反方/.test(ln) && /\d/.test(ln) && ln.length < 30) continue;
    if (/最佳辩手|MVP/i.test(ln)) continue;
    if (ln.length > 6) return ln.slice(0, 160);
  }
  return '';
}

function parseMvp(raw) {
  const t = String(raw || '');
  const m = t.match(/(?:最佳辩手|MVP)[^正反]{0,6}(正方|反方)\s*([一二三123])/i);
  if (!m) return null;
  const side = m[1] === '正方' ? 'pos' : 'neg';
  const map = { '一': 1, '二': 2, '三': 3, '1': 1, '2': 2, '3': 3 };
  const pos = map[m[2]];
  return pos ? { side, pos } : null;
}

// 给票数加小幅随机抖动，让数字有机不死板（基线用）
function jitterPos(p) { const v = p + Math.round((Math.random() - 0.5) * 5); return Math.max(3, Math.min(97, v)); }

// 拼接发言供 prompt 上下文使用
function fmtSpeeches(arr) {
  return (arr || []).map(s => sideLabel(s.side) + roleLabel(s.pos) + '（' + slotName(s.modelIndex) + '）：「' + s.text + '」').join('\n');
}

// ============================ Prompt 构造 ============================

function buildOpeningSystem(d, topic) {
  const stance = d.side === 'pos' ? topic.pos : topic.neg;
  return `这是一档《奇葩说》风格的辩论秀。你是${slotName(d.modelIndex)}，担任${sideLabel(d.side)}${roleLabel(d.pos)}，本方立场是「${stance}」。
辩题：${topic.q}？

现在是【立论】环节，做开场陈述：旗帜鲜明亮出你方观点，给 1-2 个最有说服力的论点，并配一个能击中观众的例子、扎心细节或金句。像真正的奇葩说辩手那样——有观点、有共鸣、口语化、有梗、有态度，让现场观众愿意投你这边。

一段话即可（约 3-5 句，精炼有力，别像念稿）。只输出你要当众说的那段话本身，不要"我认为"之类前缀，不要加引号、不要写旁白。`;
}
function buildOpeningUser(d, topic, stmts) {
  let ctx = '';
  if (stmts.length) ctx += '【此前已发言】\n' + fmtSpeeches(stmts) + '\n\n你可以顺势呼应本方、反驳对方。\n';
  ctx += '轮到你（' + sideLabel(d.side) + roleLabel(d.pos) + '）立论。';
  return ctx;
}

function buildClashSystem(d, topic) {
  const stance = d.side === 'pos' ? topic.pos : topic.neg;
  return `《奇葩说》【开杠】环节——短兵相接、你来我往的快速攻防。你是${sideLabel(d.side)}${roleLabel(d.pos)}，立场「${stance}」，辩题：${topic.q}？

用最犀利、最快的一两句话怼回去：抓对方逻辑漏洞、反问、戳痛点或抛金句。针锋相对、有火药味、有梗，但务必短。

只输出一两句话（别超过两句），直接开怼，不要前缀、不要旁白。`;
}
function buildClashUser(d, topic, stmts, clashSoFar) {
  let ctx = '【双方立论要点】\n' + fmtSpeeches(stmts) + '\n\n';
  if (clashSoFar.length) ctx += '【刚才的开杠】\n' + fmtSpeeches(clashSoFar) + '\n\n';
  ctx += '轮到你（' + sideLabel(d.side) + roleLabel(d.pos) + '）开怼，一两句话。';
  return ctx;
}

function buildBickerSystem(d, topic) {
  const stance = d.side === 'pos' ? topic.pos : topic.neg;
  return `《奇葩说》【抬杠】环节——全员混战、火力全开，最炸场的一轮。你是${sideLabel(d.side)}${roleLabel(d.pos)}，立场「${stance}」，辩题：${topic.q}？

抓住对方任何一句话里的漏洞、矛盾或可笑之处，用**一句**最狠、最快、最有梗的话怼上去。可以毒舌、可以反讽、可以归谬、可以抓字眼，怎么炸怎么来——但只能一句。

只输出一句话（就一句！），立刻开火，不要前缀、不要旁白。`;
}
function buildBickerUser(d, topic, stmts, clash, bickerSoFar) {
  let ctx = '【双方立论要点】\n' + fmtSpeeches(stmts) + '\n\n';
  if (clash.length) ctx += '【开杠交锋】\n' + fmtSpeeches(clash) + '\n\n';
  if (bickerSoFar.length) ctx += '【正在混战】\n' + fmtSpeeches(bickerSoFar) + '\n\n';
  ctx += '轮到你（' + sideLabel(d.side) + roleLabel(d.pos) + '）插一句最狠的，一句话开火。';
  return ctx;
}

function buildClosingSystem(d, topic, isLast) {
  const stance = d.side === 'pos' ? topic.pos : topic.neg;
  const last = isLast
    ? '你方拿到了全场的【后结辩】——最后一句话落在你这里。这是翻盘的关键一击：升华立意、收拢全场、用最走心或最有力量的话，把还在犹豫的观众拉到你方，制造跑票。'
    : '巩固本方核心、回应对方最强的攻击，把你方立场钉死。';
  return `《奇葩说》【结辩】环节。你是${sideLabel(d.side)}${roleLabel(d.pos)}，代表${sideLabel(d.side)}做总结陈词，立场「${stance}」，辩题：${topic.q}？

${last}

一段话（约 3-5 句），有逻辑、有情绪、奇葩说式的金句收尾。只输出陈词本身，不要前缀、不要旁白。`;
}
function buildClosingUser(d, topic, stmts, clash, bicker, clo) {
  let ctx = '【全场立论】\n' + fmtSpeeches(stmts) + '\n\n';
  if (clash.length) ctx += '【开杠交锋】\n' + fmtSpeeches(clash) + '\n\n';
  if (bicker && bicker.length) ctx += '【抬杠混战】\n' + fmtSpeeches(bicker) + '\n\n';
  if (clo.length) ctx += '【已结辩】\n' + fmtSpeeches(clo) + '\n\n';
  ctx += '轮到你（' + sideLabel(d.side) + roleLabel(d.pos) + '）结辩。';
  return ctx;
}

function buildMentorSystem(mi, topic) {
  return `你是《奇葩说》的导师/嘉宾（${slotName(mi)} 客串），刚看完一场关于「${topic.q}？」的 3v3 辩论。

给一段导师点评：像蔡康永、罗振宇、李诞那种调性——犀利、有洞察、有梗、有金句。可以盛赞某位辩手的高光，也可以点破谁的逻辑站不住，还可以跳出辩题谈谈背后真正动人的地方。但你不投票、不宣布谁赢。

一段话（2-4 句）。只输出点评本身，不要前缀、不要旁白。`;
}
function buildMentorUser(topic, stmts, clash, bicker, clo) {
  let ctx = '【这场辩论】\n辩题：' + topic.q + '？（正方：' + topic.pos + ' / 反方：' + topic.neg + '）\n\n';
  ctx += '立论：\n' + fmtSpeeches(stmts) + '\n\n';
  if (clash.length) ctx += '开杠：\n' + fmtSpeeches(clash) + '\n\n';
  if (bicker && bicker.length) ctx += '抬杠混战：\n' + fmtSpeeches(bicker) + '\n\n';
  if (clo.length) ctx += '结辩：\n' + fmtSpeeches(clo) + '\n\n';
  ctx += '请你点评。';
  return ctx;
}

function buildAudiencePreSystem(topic) {
  return `你是一档辩论节目【现场 100 名观众】的情绪统计官，绝对中立、不偏袒任何一方。

辩题：${topic.q}？ 正方主张「${topic.pos}」，反方主张「${topic.neg}」。

辩论还没开始。仅凭大众对这个话题的天然第一印象，估计现场 100 名观众此刻会怎么站队（考虑常识、社会主流观念、情感倾向，给一个真实可信、不必对半的分布）。

严格按以下两行格式输出，不要多余内容：
正方X 反方Y（X、Y 为整数且相加等于 100）
理由：一句话说明观众初始为何这样倾向。`;
}
function buildAudiencePreUser(topic) {
  return '辩题：' + topic.q + '？（正方：' + topic.pos + ' / 反方：' + topic.neg + '）。给出现场 100 名观众的初始投票分布和一句原因。';
}

function buildAudiencePostSystem(topic) {
  return `你是一档辩论节目【现场 100 名观众】的情绪统计官，绝对中立、不偏袒任何模型或任何一方，只按"谁的论证与表达更打动现场观众"判断。

辩题：${topic.q}？ 正方主张「${topic.pos}」，反方主张「${topic.neg}」。

读完整场辩论后，估计现场 100 名观众最终投票分布。观众容易被走心的故事、犀利的金句、扎实的逻辑、强势的结辩打动；相比赛前，票数会因谁表现更好而"跑票"。给真实可信的最终分布。

严格按以下三行格式输出，不要多余内容：
正方X 反方Y（X、Y 为整数且相加等于 100）
跑票原因：一句话说明哪些发言/哪一方造成了跑票。
最佳辩手：正方/反方 + 一/二/三辩。`;
}
function buildAudiencePostUser(topic, initial, stmts, clash, bicker, clo) {
  let ctx = '辩题：' + topic.q + '？（正方：' + topic.pos + ' / 反方：' + topic.neg + '）\n';
  ctx += '赛前观众投票：正方' + initial.pos + ' 反方' + initial.neg + '。\n\n';
  ctx += '【立论】\n' + fmtSpeeches(stmts) + '\n\n';
  if (clash.length) ctx += '【开杠】\n' + fmtSpeeches(clash) + '\n\n';
  if (bicker && bicker.length) ctx += '【抬杠混战】\n' + fmtSpeeches(bicker) + '\n\n';
  if (clo.length) ctx += '【结辩】\n' + fmtSpeeches(clo) + '\n\n';
  ctx += '请给出最终投票分布、跑票原因、最佳辩手。';
  return ctx;
}
