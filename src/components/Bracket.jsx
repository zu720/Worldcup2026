import { useState } from 'react';
import { T, Flag } from './ui';
import { GROUPS } from '../data/teams';
import { BONUS_CFG } from '../data/scoring';
import { LEFT_R32, RIGHT_R32, resolveSeed, getThirdCandidates } from '../data/bracket';
import { findTeam } from '../data/teams';

export default function BracketView({ gl, des, tp, ko, readonly, onAdvance, onSetGroup, onPick3rd }) {
  const leftRes = LEFT_R32.map((m) => ({ id: m.id, seeds: m.s, teams: m.s.map((s) => resolveSeed(s, gl, tp, findTeam, GROUPS)) }));
  const rightRes = RIGHT_R32.map((m) => ({ id: m.id, seeds: m.s, teams: m.s.map((s) => resolveSeed(s, gl, tp, findTeam, GROUPS)) }));
  const leftD = deriveRounds(leftRes, ko);
  const rightD = deriveRounds(rightRes, ko);

  const leftSfTeams = (leftD.qf || []).map((q) => {
    if (!q) return null;
    const ts = [q.t1, q.t2].filter((x) => x && x.n);
    return ts.find((t) => ko.qf.includes(t.n)) || null;
  });
  const rightSfTeams = (rightD.qf || []).map((q) => {
    if (!q) return null;
    const ts = [q.t1, q.t2].filter((x) => x && x.n);
    return ts.find((t) => ko.qf.includes(t.n)) || null;
  });
  const leftSfW = leftSfTeams.filter(Boolean).find((t) => ko.sf.includes(t.n)) || null;
  const rightSfW = rightSfTeams.filter(Boolean).find((t) => ko.sf.includes(t.n)) || null;

  const ctx = { ko, des, gl, tp, readonly, onAdvance, onSetGroup, onPick3rd };

  return (
    <div style={{ overflowX: 'auto', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 520, minWidth: 1060 }}>
        <R32Col matches={leftRes} ctx={ctx} />
        <ConnLines n={4} dir="R" />
        <SlotCol items={leftD.r16} stage="r16" ctx={ctx} />
        <ConnLines n={2} dir="R" />
        <SlotCol items={leftD.qf} stage="qf" ctx={ctx} accent={T.amb} />
        <ConnLines n={1} dir="R" />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 100 }}>
          <SfSlot teams={leftSfTeams} ctx={ctx} label="SF1" />
        </div>
        <ConnLines n={1} dir="R" />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 115, padding: '0 4px' }}>
          <FinalBox ctx={ctx} />
        </div>
        <ConnLines n={1} dir="L" />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 100 }}>
          <SfSlot teams={rightSfTeams} ctx={ctx} label="SF2" />
        </div>
        <ConnLines n={1} dir="L" />
        <SlotCol items={rightD.qf} stage="qf" ctx={ctx} accent={T.amb} />
        <ConnLines n={2} dir="L" />
        <SlotCol items={rightD.r16} stage="r16" ctx={ctx} />
        <ConnLines n={4} dir="L" />
        <R32Col matches={rightRes} ctx={ctx} />
      </div>
    </div>
  );
}

/* ── helpers ── */
function deriveRounds(r32, ko) {
  const empty = {
    r16: [{t1:null,t2:null},{t1:null,t2:null},{t1:null,t2:null},{t1:null,t2:null}],
    qf: [{t1:null,t2:null},{t1:null,t2:null}],
  };
  if (!r32 || r32.length < 8) return empty;
  try {
    const r16 = [];
    for (let i = 0; i < 8; i += 2) {
      const t1s = (r32[i]?.teams || []).filter((t) => t && t.n && !t.tbd);
      const t2s = (r32[i+1]?.teams || []).filter((t) => t && t.n && !t.tbd);
      r16.push({
        t1: t1s.find((t) => ko.r32.includes(t.n)) || null,
        t2: t2s.find((t) => ko.r32.includes(t.n)) || null,
      });
    }
    const qf = [];
    for (let j = 0; j < 4; j += 2) {
      const a = [r16[j].t1, r16[j].t2].filter((x) => x && x.n);
      const b = [r16[j+1].t1, r16[j+1].t2].filter((x) => x && x.n);
      qf.push({
        t1: a.find((t) => ko.r16.includes(t.n)) || null,
        t2: b.find((t) => ko.r16.includes(t.n)) || null,
      });
    }
    return { r16, qf };
  } catch {
    return empty;
  }
}

function R32Col({ matches, ctx }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 120, flexShrink: 0 }}>
      {matches.map((m) => (
        <MiniMatch key={m.id} match={m} ctx={ctx} />
      ))}
    </div>
  );
}

function MiniMatch({ match, ctx }) {
  const [open, setOpen] = useState(false);
  const has3 = match.seeds.find((s) => s.startsWith('3('));
  return (
    <div>
      <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${T.g200}`, background: T.wh }}>
        <TeamRow team={match.teams[0]} stage="r32" ctx={ctx} seed={match.seeds[0]} />
        <TeamRow team={match.teams[1]} stage="r32" ctx={ctx} seed={match.seeds[1]} />
      </div>
      {has3 && (
        <>
          <button onClick={() => setOpen(!open)} style={{
            fontSize: 7, padding: '1px 4px', borderRadius: 2, background: T.puL,
            border: `1px solid ${T.pu}25`, color: T.pu, cursor: 'pointer', marginTop: 1,
          }}>3位候補{open ? '▲' : '▼'}</button>
          {open && <ThirdPicker seed={has3} ctx={ctx} />}
        </>
      )}
    </div>
  );
}

function SlotCol({ items, stage, ctx, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 100, flexShrink: 0 }}>
      {items.map((item, i) => {
        const teams = [item.t1, item.t2].filter((x) => x && x.n);
        if (teams.length < 2) {
          return <div key={i} style={{
            border: `1px dashed ${T.g300}`, borderRadius: 4, padding: '3px 5px',
            fontSize: 8, color: T.g400, textAlign: 'center',
          }}>TBD</div>;
        }
        return (
          <div key={i} style={{ borderRadius: 4, overflow: 'hidden', border: `1.5px solid ${accent || T.g200}`, background: T.wh }}>
            <TeamRow team={item.t1} stage={stage} ctx={ctx} accent={accent} />
            <TeamRow team={item.t2} stage={stage} ctx={ctx} accent={accent} />
          </div>
        );
      })}
    </div>
  );
}

function SfSlot({ teams, ctx, label }) {
  const [t1, t2] = teams || [null, null];
  if (!t1 && !t2) {
    return (
      <div style={{ border: `1px dashed ${T.g300}`, borderRadius: 5, padding: 6, fontSize: 8, color: T.g400, textAlign: 'center' }}>
        {label}<br />TBD
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 7, fontWeight: 700, color: T.ambD }}>{label}</div>
      <div style={{ borderRadius: 5, overflow: 'hidden', border: `1.5px solid ${T.ambD}`, background: T.wh }}>
        {t1 ? <TeamRow team={t1} stage="sf" ctx={ctx} accent={T.ambD} /> : <EmptyRow />}
        {t2 ? <TeamRow team={t2} stage="sf" ctx={ctx} accent={T.ambD} /> : <EmptyRow />}
      </div>
    </div>
  );
}

function EmptyRow() {
  return <div style={{ padding: '2px 5px', fontSize: 8, color: T.g400, height: 20, borderBottom: `1px solid ${T.g100}` }}>TBD</div>;
}

function FinalBox({ ctx }) {
  const f1 = ctx.ko.sf.length >= 1 ? ctx.ko.sf[0] : null;
  const f2 = ctx.ko.sf.length >= 2 ? ctx.ko.sf[1] : null;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 8, fontWeight: 800, color: T.ambD, marginBottom: 3 }}>🏆 FINAL</div>
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `2px solid ${T.amb}`, background: T.wh }}>
        {f1 ? <FinalRow tn={f1} ctx={ctx} stage="final" /> : <div style={{ padding: 3, fontSize: 8, color: T.g400, borderBottom: `1px solid ${T.g200}` }}>SF1勝者</div>}
        {f2 ? <FinalRow tn={f2} ctx={ctx} stage="final" /> : <div style={{ padding: 3, fontSize: 8, color: T.g400 }}>SF2勝者</div>}
      </div>
      {ctx.ko.final && ctx.ko.final.length >= 1 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 7, color: T.ambD, fontWeight: 700 }}>👑 優勝</div>
          {ctx.ko.final.map((tn) => (
            <div key={tn} onClick={() => !ctx.readonly && ctx.onAdvance?.('champ', tn)} style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2,
              padding: '3px 5px',
              background: ctx.ko.champ === tn ? T.ambL : T.wh,
              border: `1.5px solid ${ctx.ko.champ === tn ? T.amb : T.g200}`,
              borderRadius: 5, cursor: ctx.readonly ? 'default' : 'pointer',
              fontSize: 9, fontWeight: 700, marginTop: 2,
            }}>
              <Flag name={tn} size={12} />{tn}{ctx.ko.champ === tn && ' 👑'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinalRow({ tn, ctx, stage }) {
  const isAdv = ctx.ko[stage].includes(tn);
  return (
    <div onClick={() => !ctx.readonly && ctx.onAdvance?.(stage, tn)} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '3px 5px', cursor: ctx.readonly ? 'default' : 'pointer',
      background: isAdv ? T.ambL : T.wh,
      borderBottom: `1px solid ${T.g200}`,
      fontSize: 9, fontWeight: isAdv ? 700 : 400,
    }}>
      <span style={{ display: 'flex', alignItems: 'center' }}><Flag name={tn} size={11} />{tn}</span>
      {isAdv && <span style={{ color: T.gn, fontSize: 8 }}>✓</span>}
    </div>
  );
}

function TeamRow({ team, stage, ctx, seed, accent }) {
  if (!team || team.tbd || !team.n) {
    const label = seed ? (seed.startsWith('3(') ? '3位' : seed) : 'TBD';
    return (
      <div
        onClick={() => {
          if (ctx.readonly) return;
          try {
            if (team?.grp) ctx.onSetGroup?.(team.grp);
            else if (seed && seed.length >= 2 && !seed.startsWith('3(')) ctx.onSetGroup?.(seed[1]);
          } catch {}
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '2px 5px', height: 20,
          borderBottom: `1px solid ${T.g100}`,
          cursor: ctx.readonly ? 'default' : 'pointer',
          color: T.g400, fontSize: 9,
        }}
      >
        <span>{label}</span>
        {!ctx.readonly && <span style={{ fontSize: 7, color: T.amb }}>設定</span>}
      </div>
    );
  }
  const koArr = ctx.ko[stage] || [];
  const isAdv = koArr.includes(team.n);
  const dk = ctx.des.A === team.n ? 'A' : ctx.des.B === team.n ? 'B' : ctx.des.C === team.n ? 'C' : null;
  return (
    <div
      onClick={() => !ctx.readonly && ctx.onAdvance?.(stage, team.n)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '2px 5px', height: 20,
        cursor: ctx.readonly ? 'default' : 'pointer',
        background: isAdv ? (accent ? T.ambL : T.gnL) : T.wh,
        borderBottom: `1px solid ${T.g100}`,
        fontWeight: isAdv ? 700 : 400, fontSize: 9,
      }}
    >
      <span style={{ color: isAdv ? T.gnD : T.g900, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <Flag name={team.n} size={10} />{team.n}{team.is3 ? '③' : ''}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {dk && <span style={{ fontSize: 6, padding: '0 2px', borderRadius: 2, background: BONUS_CFG[dk].bg, color: BONUS_CFG[dk].color, fontWeight: 700 }}>{dk}</span>}
        {isAdv && <span style={{ color: accent || T.gn, fontSize: 8 }}>✓</span>}
      </span>
    </div>
  );
}

function ThirdPicker({ seed, ctx }) {
  const candidates = getThirdCandidates(seed, ctx.gl, GROUPS);
  const cur = ctx.tp[seed] || null;
  return (
    <div style={{ background: T.puL, border: `1px solid ${T.pu}25`, borderRadius: 4, padding: 3, marginTop: 1 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {candidates.map((t) => (
          <button
            key={t.n + t.grp}
            onClick={() => !ctx.readonly && ctx.onPick3rd?.(seed, t.n)}
            style={{
              fontSize: 7, padding: '1px 4px', borderRadius: 2,
              cursor: ctx.readonly ? 'default' : 'pointer',
              background: cur === t.n ? T.pu : T.wh,
              border: `1px solid ${cur === t.n ? T.pu : T.g200}`,
              color: cur === t.n ? '#fff' : T.g700,
            }}
          >
            <Flag name={t.n} size={9} />{t.n}({t.grp})
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnLines({ n, dir }) {
  const isR = dir === 'R';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 12, flexShrink: 0 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            flex: 1, minHeight: 4, borderBottom: `1.5px solid ${T.g300}`,
            ...(isR ? { borderRight: `1.5px solid ${T.g300}` } : { borderLeft: `1.5px solid ${T.g300}` }),
          }} />
          <div style={{
            flex: 1, minHeight: 4, borderTop: `1.5px solid ${T.g300}`,
            ...(isR ? { borderRight: `1.5px solid ${T.g300}` } : { borderLeft: `1.5px solid ${T.g300}` }),
          }} />
        </div>
      ))}
    </div>
  );
}

export function ThirdPlaceMatch({ ko, des, readonly, onAdvance }) {
  const sfLosers = ko.qf.filter((tn) => !ko.sf.includes(tn));
  if (sfLosers.length < 2) return null;
  return (
    <div style={{ maxWidth: 260, marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.ambD, marginBottom: 3 }}>🥉 3位決定戦</div>
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1.5px solid ${T.ambD}`, background: T.wh }}>
        {sfLosers.map((tn) => {
          const isAdv = ko.third === tn;
          return (
            <div key={tn} onClick={() => !readonly && onAdvance?.('third', tn)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 8px', cursor: readonly ? 'default' : 'pointer',
              background: isAdv ? T.ambL : T.wh,
              borderBottom: `1px solid ${T.g200}`,
              fontSize: 11, fontWeight: isAdv ? 700 : 400,
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><Flag name={tn} size={14} />{tn}</span>
              {isAdv && <span>🥉✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
