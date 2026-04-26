import { findTeam } from './teams';

/**
 * ═══════════════════════════════════════════════════════════
 * Scoring rules for FIFA W杯 2026 予想ゲーム
 * ═══════════════════════════════════════════════════════════
 */

// Base score: odds^0.4 (balance between spread and fairness)
export const baseScore = (odds) => Math.round(Math.pow(odds, 0.4) * 10) / 10;

// Stage multipliers (cumulative)
export const STAGE_MULT = {
  r32: 0.5,
  r16: 1.0,
  qf: 4.0,   // ⭐ highest
  sf: 3.0,
  final: 4.0,
  champ: 3.0,
  third: 2.0,
};

export const STAGE_LABEL = {
  r32: 'R32',
  r16: 'R16',
  qf: 'ベスト8',
  sf: 'ベスト4',
  final: '決勝',
  champ: '優勝',
  third: '3位',
};

// Bonus team config
export const BONUS_CFG = {
  A: { mult: 2.5, finalBonus: 2.0, champBonus: 2.0, label: 'ボーナスA', color: '#dc2626', bg: '#fee2e2' },
  B: { mult: 1.8, finalBonus: 1.5, champBonus: 1.5, label: 'ボーナスB', color: '#2563eb', bg: '#dbeafe' },
  C: { mult: 1.3, finalBonus: 1.2, champBonus: 1.2, label: 'ボーナスC', color: '#7c3aed', bg: '#f5f3ff' },
};

/**
 * Calculate a player's total score given their predictions and actual KO results.
 *
 * @param {Object} gl - Group rankings { A: ["メキシコ","韓国"], ... }
 * @param {Object} des - Designated bonus teams { A: "日本", B: "フランス", C: "スペイン" }
 * @param {Object} ko - Actual KO results { r32:[], r16:[], qf:[], sf:[], final:[], champ, third }
 * @returns {{ total: number, breakdown: Array }}
 */
export function calcScore(gl, des, ko) {
  let total = 0;
  const breakdown = [];

  // Players predict top 2 of each group (positions 0 and 1)
  const allPicked = [];
  Object.values(gl || {}).forEach((arr) => {
    if (arr) arr.forEach((tn, i) => { if (i < 2 && tn) allPicked.push(tn); });
  });

  allPicked.forEach((tn) => {
    const t = findTeam(tn);
    if (!t) return;
    const base = baseScore(t.o);

    const bonusKey = des?.A === tn ? 'A' : des?.B === tn ? 'B' : des?.C === tn ? 'C' : null;
    const bonusMult = bonusKey ? BONUS_CFG[bonusKey].mult : 1;

    let pts = 0;
    const stages = [];

    Object.entries(STAGE_MULT).forEach(([k, v]) => {
      if (k === 'champ') {
        if (ko.champ === tn) { pts += base * v; stages.push('👑'); }
      } else if (k === 'third') {
        if (ko.third === tn) { pts += base * v; stages.push('🥉'); }
      } else {
        if (ko[k] && ko[k].includes(tn)) { pts += base * v; stages.push(STAGE_LABEL[k]); }
      }
    });

    let finalPts = pts * bonusMult;
    if (bonusKey && ko.final?.includes(tn)) finalPts *= BONUS_CFG[bonusKey].finalBonus;
    if (bonusKey && ko.champ === tn) finalPts *= BONUS_CFG[bonusKey].champBonus;

    if (finalPts > 0) {
      breakdown.push({
        team: tn,
        base,
        bonusKey,
        pts: Math.round(finalPts * 100) / 100,
        stages,
      });
    }
    total += finalPts;
  });

  return {
    total: Math.round(total * 100) / 100,
    breakdown: breakdown.sort((a, b) => b.pts - a.pts),
  };
}
