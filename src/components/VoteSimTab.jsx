import { useState } from 'react';
import { T, Flag, Card, Label } from './ui';
import { GROUPS, GROUP_KEYS, ALL_TEAMS, findTeam } from '../data/teams';
import { baseScore, BONUS_CFG, STAGE_MULT, STAGE_LABEL } from '../data/scoring';
import BracketView, { ThirdPlaceMatch } from './Bracket';

const allSorted = ALL_TEAMS.slice().sort((a, b) => a.n.localeCompare(b.n, 'ja'));

export default function VoteSimTab({
  gl, des, tp, ko, score,
  onRankTeam, onSetDes, onPick3rd, onAdvance,
  locked,
}) {
  const [activeGroup, setActiveGroup] = useState(null);
  const glComplete = GROUP_KEYS.every((g) => (gl[g] || []).length >= 2);

  return (
    <div>
      {locked && (
        <div style={{
          background: T.ambL, border: `1.5px solid ${T.amb}`,
          borderRadius: 8, padding: 10, marginBottom: 12,
          fontSize: 12, color: T.ambD, fontWeight: 600, textAlign: 'center',
        }}>
          🔒 投票は締め切られています（閲覧のみ可能）
        </div>
      )}

      {/* Bonus teams */}
      <Label>ボーナスチーム A / B / C（各1チーム選択）</Label>
      <p style={{ fontSize: 11, color: T.g500, margin: '0 0 8px' }}>勝ち上がるほど倍率UP。全48チームから選べます。</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {['A', 'B', 'C'].map((k) => {
          const cfg = BONUS_CFG[k];
          const picked = des[k];
          return (
            <Card key={k} style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${picked ? cfg.color : T.g200}` }}>
              <div style={{
                padding: '6px 10px',
                background: picked ? cfg.bg : T.g50,
                borderBottom: `1px solid ${picked ? cfg.color : T.g200}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>
                  {cfg.label} <span style={{ fontWeight: 500, color: T.g500 }}>x{cfg.mult}</span>
                </span>
                {picked && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, display: 'flex', alignItems: 'center' }}>
                    <Flag name={picked} size={13} />{picked}
                  </span>
                )}
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {allSorted.map((t) => {
                  const isThis = des[k] === t.n;
                  const usedBy = des.A === t.n ? 'A' : des.B === t.n ? 'B' : des.C === t.n ? 'C' : null;
                  const isOther = usedBy && usedBy !== k;
                  return (
                    <div
                      key={t.n}
                      onClick={() => { if (!isOther && !locked) onSetDes(k, t.n); }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '3px 10px',
                        cursor: (isOther || locked) ? 'default' : 'pointer',
                        background: isThis ? cfg.bg : T.wh,
                        borderBottom: `1px solid ${T.g100}`,
                        opacity: isOther ? 0.3 : 1,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ fontWeight: isThis ? 700 : 400, color: isThis ? cfg.color : T.g900, display: 'flex', alignItems: 'center' }}>
                        <Flag name={t.n} size={12} />{t.n}
                      </span>
                      <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {isOther && <span style={{ fontSize: 8, color: BONUS_CFG[usedBy].color, fontWeight: 600 }}>{usedBy}済</span>}
                        {isThis && <span style={{ color: cfg.color }}>✓</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Group ranking panel */}
      {activeGroup && !locked && (
        <GroupRankPanel
          g={activeGroup}
          gl={gl}
          onRankTeam={onRankTeam}
          des={des}
          onClose={() => setActiveGroup(null)}
        />
      )}

      <Label>グループ順位設定</Label>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {GROUP_KEYS.map((g) => {
          const ranks = gl[g] || [];
          const done = ranks.length >= 2;
          return (
            <button
              key={g}
              onClick={() => !locked && setActiveGroup(activeGroup === g ? null : g)}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 5,
                cursor: locked ? 'default' : 'pointer',
                border: `1.5px solid ${activeGroup === g ? T.amb : done ? T.gn : T.g200}`,
                background: activeGroup === g ? T.ambL : done ? T.gnL : T.wh,
                color: activeGroup === g ? T.amb : done ? T.gnD : T.g500,
                fontWeight: 700,
              }}
            >
              {g}{done ? '✓' : ''}
            </button>
          );
        })}
      </div>

      {/* Bracket */}
      {glComplete && (
        <>
          <Label>トーナメント シミュレーション</Label>
          <p style={{ fontSize: 10, color: T.g500, margin: '0 0 8px' }}>
            チーム枠クリック→勝ち上がり / グループラベルクリック→順位設定
          </p>
          <BracketView
            gl={gl} des={des} tp={tp} ko={ko}
            readonly={locked}
            onAdvance={onAdvance}
            onSetGroup={(g) => !locked && setActiveGroup(g)}
            onPick3rd={onPick3rd}
          />
          {ko.sf.length >= 2 && (
            <ThirdPlaceMatch ko={ko} des={des} readonly={locked} onAdvance={onAdvance} />
          )}
          {score && score.breakdown.length > 0 && <ScoreBreakdown score={score} />}
        </>
      )}

      {!glComplete && (
        <div style={{ textAlign: 'center', padding: 16, color: T.g400, fontSize: 11 }}>
          全12グループの順位を設定するとトーナメント表が表示されます
        </div>
      )}
    </div>
  );
}

function GroupRankPanel({ g, gl, onRankTeam, des, onClose }) {
  const ranks = gl[g] || [];
  return (
    <Card style={{ marginBottom: 10, border: `2px solid ${T.amb}`, background: T.ambL + '80' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>GROUP {g}</span>
        <button onClick={onClose} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: T.g200, border: 'none', cursor: 'pointer' }}>
          閉じる
        </button>
      </div>
      <p style={{ fontSize: 9, color: T.g700, margin: '0 0 6px' }}>
        クリック順に1位→2位→3位→4位。クリック済みチームを押すとやり直し。
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {GROUPS[g].map((t) => {
          const pos = ranks.indexOf(t.n);
          const isRanked = pos >= 0;
          const bk = des.A === t.n ? 'A' : des.B === t.n ? 'B' : des.C === t.n ? 'C' : null;
          return (
            <div
              key={t.n}
              onClick={() => onRankTeam(g, t.n)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6,
                cursor: 'pointer',
                border: `1.5px solid ${isRanked ? T.gn : T.g200}`,
                background: isRanked ? T.gnL : T.wh,
                flex: '1 1 auto', minWidth: 110,
              }}
            >
              {isRanked && (
                <span style={{ fontSize: 10, fontWeight: 800, color: T.amb, background: T.ambL, padding: '1px 5px', borderRadius: 3 }}>
                  {pos + 1}位
                </span>
              )}
              <Flag name={t.n} size={18} />
              <div>
                <div style={{ fontSize: 12, fontWeight: isRanked ? 700 : 400 }}>{t.n}</div>
                <div style={{ fontSize: 8, color: T.g400 }}>x{baseScore(t.o).toFixed(1)}</div>
              </div>
              {bk && (
                <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: BONUS_CFG[bk].bg, color: BONUS_CFG[bk].color, fontWeight: 700, marginLeft: 'auto' }}>
                  {BONUS_CFG[bk].label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {ranks.length >= 2 && (
        <div style={{ marginTop: 4, fontSize: 9, color: T.gnD }}>
          ✓ 1位:{ranks[0]} 2位:{ranks[1]}
          {ranks[2] ? ` 3位:${ranks[2]}` : ''}
          {ranks[3] ? ` 4位:${ranks[3]}` : ''}
        </div>
      )}
    </Card>
  );
}

function ScoreBreakdown({ score }) {
  return (
    <Card style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>ポイント内訳</div>
      {score.breakdown.map((b, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, padding: '3px 0', borderBottom: `1px solid ${T.g200}`,
        }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Flag name={b.team} size={12} />{b.team}
            {b.bonusKey && (
              <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: BONUS_CFG[b.bonusKey].bg, color: BONUS_CFG[b.bonusKey].color, fontWeight: 700 }}>
                {BONUS_CFG[b.bonusKey].label}
              </span>
            )}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: T.g500, fontSize: 9 }}>{b.stages.join('→')}</span>
            <span style={{ fontWeight: 800, color: T.gn }}>+{b.pts.toFixed(1)}</span>
          </span>
        </div>
      ))}
      <div style={{ textAlign: 'right', marginTop: 6, fontSize: 14, fontWeight: 900, color: T.amb }}>
        合計: {score.total.toFixed(1)} pts
      </div>
    </Card>
  );
}
