import { useMemo } from 'react';
import { T, Flag, Card, Label } from './ui';
import { GROUP_KEYS, GROUPS } from '../data/teams';
import { calcScore, BONUS_CFG } from '../data/scoring';
import BracketView, { ThirdPlaceMatch } from './Bracket';

export default function ResultsTab({ tournament, allPredictions, myName }) {
  const phase = tournament?.phase || 'pre';
  const actualKo = tournament?.ko || { r32:[], r16:[], qf:[], sf:[], final:[], champ:null, third:null };
  const actualGroups = tournament?.groups || {};

  // Build a "gl" object from actual group standings (for feeding into the bracket view)
  const actualGl = useMemo(() => {
    const out = {};
    GROUP_KEYS.forEach((g) => {
      const teams = actualGroups[g];
      if (Array.isArray(teams) && teams.length) {
        out[g] = teams.slice().sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          const aDiff = (a.gf || 0) - (a.ga || 0);
          const bDiff = (b.gf || 0) - (b.ga || 0);
          if (bDiff !== aDiff) return bDiff - aDiff;
          return (b.gf || 0) - (a.gf || 0);
        }).map((t) => t.n);
      } else {
        out[g] = [];
      }
    });
    return out;
  }, [actualGroups]);

  const leaderboard = useMemo(() => {
    return (allPredictions || [])
      .filter((p) => p.name && p.gl && Object.keys(p.gl).length > 0)
      .map((p) => {
        const s = calcScore(p.gl, p.des || {}, actualKo);
        return {
          name: p.name,
          total: s.total,
          breakdown: s.breakdown,
          des: p.des || {},
          isMe: p.name === myName,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [allPredictions, actualKo, myName]);

  const phaseLabel =
    phase === 'pre' ? '大会開幕前' :
    phase === 'groups' ? 'グループステージ進行中' :
    phase === 'done' ? '大会終了' : '決勝トーナメント進行中';

  return (
    <div>
      {/* Status */}
      <Card style={{
        marginBottom: 16, border: `2px solid ${T.amb}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            大会ステータス: <span style={{ color: T.amb }}>{phaseLabel}</span>
          </div>
          {tournament?.last_api_update && (
            <div style={{ fontSize: 10, color: T.g500, marginTop: 2 }}>
              最終更新: {new Date(tournament.last_api_update).toLocaleString('ja-JP')}
            </div>
          )}
        </div>
      </Card>

      {/* Group standings */}
      <Label>グループステージ 星取表</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginBottom: 20 }}>
        {GROUP_KEYS.map((g) => {
          const teams = (actualGroups[g] || GROUPS[g].map((t) => ({
            n: t.n, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
          })))
            .slice()
            .sort((a, b) => {
              if (b.pts !== a.pts) return b.pts - a.pts;
              const aDiff = (a.gf || 0) - (a.ga || 0);
              const bDiff = (b.gf || 0) - (b.ga || 0);
              if (bDiff !== aDiff) return bDiff - aDiff;
              return (b.gf || 0) - (a.gf || 0);
            });
          return (
            <Card key={g} style={{ padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.amb, marginBottom: 4 }}>GROUP {g}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${T.g200}` }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px', color: T.g500, fontWeight: 600 }}>チーム</th>
                    <th style={{ width: 22, textAlign: 'center', color: T.g500 }}>試</th>
                    <th style={{ width: 22, textAlign: 'center', color: T.g500 }}>勝</th>
                    <th style={{ width: 22, textAlign: 'center', color: T.g500 }}>分</th>
                    <th style={{ width: 22, textAlign: 'center', color: T.g500 }}>負</th>
                    <th style={{ width: 26, textAlign: 'center', color: T.g500 }}>得</th>
                    <th style={{ width: 26, textAlign: 'center', color: T.g500 }}>失</th>
                    <th style={{ width: 28, textAlign: 'center', color: T.g500, fontWeight: 700 }}>勝点</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => (
                    <tr key={t.n} style={{ borderBottom: `1px solid ${T.g100}`, background: i < 2 ? T.gnL + '60' : 'transparent' }}>
                      <td style={{ padding: '3px 4px', fontWeight: i < 2 ? 600 : 400, display: 'flex', alignItems: 'center' }}>
                        <Flag name={t.n} size={12} />{t.n}
                      </td>
                      <td style={{ textAlign: 'center' }}>{t.mp || 0}</td>
                      <td style={{ textAlign: 'center' }}>{t.w || 0}</td>
                      <td style={{ textAlign: 'center' }}>{t.d || 0}</td>
                      <td style={{ textAlign: 'center' }}>{t.l || 0}</td>
                      <td style={{ textAlign: 'center' }}>{t.gf || 0}</td>
                      <td style={{ textAlign: 'center' }}>{t.ga || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{t.pts || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>

      {/* Actual bracket */}
      <Label>決勝トーナメント 実績</Label>
      {phase === 'pre' ? (
        <Card style={{ textAlign: 'center', padding: 20, color: T.g400, marginBottom: 16 }}>
          大会開幕後に試合結果が自動反映されます
        </Card>
      ) : (
        <>
          <BracketView
            gl={actualGl}
            des={{ A: null, B: null, C: null }}
            tp={{}}
            ko={actualKo}
            readonly={true}
          />
          {actualKo.sf.length >= 2 && (
            <ThirdPlaceMatch ko={actualKo} des={{}} readonly={true} />
          )}
        </>
      )}

      {/* Leaderboard */}
      <Label>ポイントランキング（リアルタイム）</Label>
      <Card>
        <div style={{ fontSize: 10, color: T.g500, marginBottom: 8 }}>
          実際の試合結果に応じて自動更新されます ({leaderboard.length}人参加)
        </div>
        {leaderboard.length === 0 && (
          <div style={{ textAlign: 'center', color: T.g400, fontSize: 12, padding: 12 }}>
            まだ参加者が登録されていません
          </div>
        )}
        {leaderboard.map((p, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
          return (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px',
                borderBottom: `1px solid ${T.g200}`,
                background: p.isMe ? '#dbeafe60' : i < 3 ? T.ambL + '60' : 'transparent',
                borderLeft: p.isMe ? `3px solid ${T.bl}` : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 16, fontWeight: 900,
                  color: i < 3 ? T.amb : T.g400,
                  width: 28, textAlign: 'center',
                }}>
                  {medal || (i + 1)}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.isMe ? T.bl : T.g900 }}>
                  {p.name}{p.isMe && ' (あなた)'}
                </span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {['A', 'B', 'C'].map((k) => p.des[k] ? (
                    <span key={k} style={{
                      fontSize: 8, padding: '1px 4px', borderRadius: 2,
                      background: BONUS_CFG[k].bg, color: BONUS_CFG[k].color,
                      fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2,
                    }}>
                      <Flag name={p.des[k]} size={9} />{p.des[k]}
                    </span>
                  ) : null)}
                </div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: p.total > 0 ? T.amb : T.g400 }}>
                {p.total.toFixed(1)}
                <span style={{ fontSize: 10, color: T.g500, marginLeft: 3, fontWeight: 400 }}>pts</span>
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
