// AI 狼人杀 — 本地历史记录（localStorage）
// 存每一局，方便回看挑素材做视频。只存在浏览器本地。

const STORAGE_KEY = 'debate_history_v1';
const MAX_ENTRIES = 50; // 最多存最近 50 局

export function loadHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

// 保存一局。entry: { players, nights, days, winner, mvp? }
export function saveGame(entry) {
  if (typeof window === 'undefined') return null;
  try {
    const list = loadHistory();
    const record = {
      id: `wg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      ...entry,
    };
    const next = [record, ...list].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return record;
  } catch (e) {
    return null;
  }
}

export function deleteGame(id) {
  if (typeof window === 'undefined') return;
  try {
    const list = loadHistory().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (isToday) return `今天 ${hm}`;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
}

// 把赛后复盘补存进最近一条历史记录
export function appendReview(review) {
  if (typeof window === 'undefined') return;
  try {
    const list = loadHistory();
    if (list.length === 0) return;
    list[0] = { ...list[0], review };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}
