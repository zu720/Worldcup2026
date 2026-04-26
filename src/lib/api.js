/**
 * ═══════════════════════════════════════════════════════════
 * Data access layer
 * ═══════════════════════════════════════════════════════════
 * Supabase が設定されていればそちらを使い、
 * 未設定なら localStorage に fallback する。
 *
 * アプリ本体は supabase か localStorage かを意識しない。
 * ═══════════════════════════════════════════════════════════
 */
import { supabase, hasSupabase } from './supabase';

const LS_PRED_KEY = 'wc2026:predictions';
const LS_TOUR_KEY = 'wc2026:tournament';
const LS_ME_KEY = 'wc2026:me';

const EMPTY_KO = { r32:[], r16:[], qf:[], sf:[], final:[], champ:null, third:null };

/* ── local fallback helpers ── */
function lsLoad(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function lsSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ── "me" (player's name, stored locally only) ── */
export const myName = {
  get: () => localStorage.getItem(LS_ME_KEY) || '',
  set: (n) => localStorage.setItem(LS_ME_KEY, n || ''),
  clear: () => localStorage.removeItem(LS_ME_KEY),
};

/* ── predictions ── */

export async function savePrediction({ name, gl, des, tp }) {
  if (!name || !name.trim()) throw new Error('name required');
  const payload = { name: name.trim(), gl: gl || {}, des: des || {}, tp: tp || {} };
  if (hasSupabase) {
    const { error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'name' });
    if (error) throw error;
    return true;
  }
  const all = lsLoad(LS_PRED_KEY, []);
  const i = all.findIndex((p) => p.name === payload.name);
  if (i >= 0) all[i] = { ...all[i], ...payload, updated_at: new Date().toISOString() };
  else all.push({ ...payload, created_at: new Date().toISOString(), locked: false });
  lsSave(LS_PRED_KEY, all);
  return true;
}

export async function getPredictionByName(name) {
  if (!name) return null;
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('name', name.trim())
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const all = lsLoad(LS_PRED_KEY, []);
  return all.find((p) => p.name === name.trim()) || null;
}

export async function getAllPredictions() {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  return lsLoad(LS_PRED_KEY, []);
}

/* ── tournament state ── */

export async function getTournament() {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('tournament')
      .select('*')
      .eq('id', 'wc2026')
      .maybeSingle();
    if (error) throw error;
    return data || { id: 'wc2026', phase: 'pre', groups: {}, ko: EMPTY_KO, vote_locked: false };
  }
  return lsLoad(LS_TOUR_KEY, { id: 'wc2026', phase: 'pre', groups: {}, ko: EMPTY_KO, vote_locked: false });
}

export async function saveTournament(patch) {
  if (hasSupabase) {
    const { error } = await supabase
      .from('tournament')
      .update({ ...patch })
      .eq('id', 'wc2026');
    if (error) throw error;
    return true;
  }
  const cur = lsLoad(LS_TOUR_KEY, { id: 'wc2026', phase: 'pre', groups: {}, ko: EMPTY_KO, vote_locked: false });
  lsSave(LS_TOUR_KEY, { ...cur, ...patch, updated_at: new Date().toISOString() });
  return true;
}

/* ── realtime subscriptions (supabase only) ── */

export function subscribePredictions(onChange) {
  if (!hasSupabase) return () => {};
  const channel = supabase
    .channel('pred-changes')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeTournament(onChange) {
  if (!hasSupabase) return () => {};
  const channel = supabase
    .channel('tour-changes')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tournament' },
        () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}
