/**
 * FIFA World Cup 2026 official R32 bracket
 * Seeds: "1X" = Group X winner, "2X" = runner-up, "3(A/B/...)" = best 3rd from those groups
 */

export const LEFT_R32 = [
  { id: 73, s: ['2A', '2B'] },
  { id: 74, s: ['1C', '2F'] },
  { id: 75, s: ['1E', '3(A/B/C/D/F)'] },
  { id: 76, s: ['1F', '2C'] },
  { id: 77, s: ['2E', '2I'] },
  { id: 78, s: ['1I', '3(C/D/F/G/H)'] },
  { id: 79, s: ['1A', '3(C/E/F/H/I)'] },
  { id: 80, s: ['1L', '3(E/H/I/J/K)'] },
];

export const RIGHT_R32 = [
  { id: 81, s: ['1G', '3(A/E/H/I/J)'] },
  { id: 82, s: ['1D', '3(B/E/F/I/J)'] },
  { id: 83, s: ['1H', '2J'] },
  { id: 84, s: ['2K', '2L'] },
  { id: 85, s: ['1B', '3(E/F/G/I/J)'] },
  { id: 86, s: ['2D', '2G'] },
  { id: 87, s: ['1J', '2H'] },
  { id: 88, s: ['1K', '3(D/E/I/J/L)'] },
];

export const ALL_R32 = [...LEFT_R32, ...RIGHT_R32];

/**
 * Resolve a seed string to an actual team object based on predictions.
 * Returns { n, o, is3?, tbd?, grp?, seed? }
 */
export function resolveSeed(seed, gl, tp, findTeam, GROUPS) {
  if (seed.startsWith('3(')) {
    const picked = tp[seed];
    if (picked) {
      const t = findTeam(picked);
      return t ? { n: picked, o: t.o, is3: true } : { n: picked, o: 100, is3: true };
    }
    return { n: '3位', o: 100, is3: true, tbd: true, seed };
  }
  const pos = seed[0];
  const grp = seed[1];
  const ranks = gl[grp] || [];
  const idx = pos === '1' ? 0 : 1;
  if (ranks.length <= idx) return { n: grp + pos + '位', o: 100, tbd: true, grp };
  const tn = ranks[idx];
  const t = findTeam(tn);
  return t ? { n: tn, o: t.o, grp } : { n: tn, o: 100, grp };
}

/**
 * Get 3rd-place candidates for a "3(A/B/...)" seed
 */
export function getThirdCandidates(seed, gl, GROUPS) {
  if (!seed.startsWith('3(')) return [];
  const letters = seed.match(/[A-L]/g) || [];
  const result = [];
  letters.forEach((g) => {
    const ranks = gl[g] || [];
    // If user has set 3rd place, use that. Otherwise list unpicked teams.
    if (ranks.length >= 3) {
      const t = GROUPS[g].find((x) => x.n === ranks[2]);
      if (t) result.push({ ...t, grp: g });
    } else {
      GROUPS[g].forEach((t) => {
        if (!ranks.includes(t.n)) result.push({ ...t, grp: g });
      });
    }
  });
  return result;
}
