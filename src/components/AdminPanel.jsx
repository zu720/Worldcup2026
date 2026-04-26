import { useState } from 'react';
import { T, Flag, Card, Label } from './ui';
import { GROUPS, GROUP_KEYS } from '../data/teams';

export default function AdminPanel({ tournament, onSaveTournament, onClose }) {
  const [phase, setPhase] = useState(tournament?.phase || 'pre');
  const [voteLocked, setVoteLocked] = useState(tournament?.vote_locked || false);
  const [editGroup, setEditGroup] = useState(null);
  const [koText, setKoText] = useState('');
  const [msg, setMsg] = useState('');

  async function savePhase() {
    try {
      await onSaveTournament({ phase, vote_locked: voteLocked });
      setMsg('✅ 保存しました');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('❌ ' + (e.message || e));
    }
  }

  async function saveGroupResult(g, teams) {
    try {
      const currentGroups = tournament?.groups || {};
      const newGroups = { ...currentGroups, [g]: teams };
      await onSaveTournament({ groups: newGroups });
      setMsg('✅ グループ' + g + 'を保存しました');
      setEditGroup(null);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('❌ ' + (e.message || e));
    }
  }

  async function saveKoResult() {
    try {
      const parsed = JSON.parse(koText || '{}');
      await onSaveTournament({ ko: parsed });
      setMsg('✅ KO結果を保存しました');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('❌ JSON parse error: ' + (e.message || e));
    }
  }

  return (
    <Card style={{ border: `2px solid ${T.rd}`, background: '#fff5f5', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.rd }}>🔧 管理者パネル</div>
        <button onClick={onClose} style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 4,
          background: T.g200, border: 'none', cursor: 'pointer',
        }}>閉じる</button>
      </div>

      {msg && <div style={{ fontSize: 12, color: msg.startsWith('✅') ? T.gn : T.rd, marginBottom: 8, fontWeight: 600 }}>{msg}</div>}

      {/* Phase & vote lock */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.g500, marginBottom: 2 }}>大会フェーズ</div>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 5, border: `1px solid ${T.g200}`, fontSize: 12 }}
          >
            <option value="pre">開幕前</option>
            <option value="groups">グループステージ</option>
            <option value="r32">R32</option>
            <option value="r16">R16</option>
            <option value="qf">ベスト8</option>
            <option value="sf">ベスト4</option>
            <option value="final">決勝</option>
            <option value="done">大会終了</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={voteLocked}
              onChange={(e) => setVoteLocked(e.target.checked)}
            />
            🔒 投票をロック（編集不可にする）
          </label>
        </div>
        <button
          onClick={savePhase}
          style={{
            padding: '6px 16px', borderRadius: 5, border: 'none',
            background: T.amb, color: '#fff', fontWeight: 700,
            fontSize: 12, cursor: 'pointer',
          }}
        >保存</button>
      </div>

      {/* Group result editor */}
      <Label>グループ結果入力</Label>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {GROUP_KEYS.map((g) => (
          <button
            key={g}
            onClick={() => setEditGroup(editGroup === g ? null : g)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 4,
              cursor: 'pointer',
              border: `1px solid ${editGroup === g ? T.amb : T.g200}`,
              background: editGroup === g ? T.ambL : T.wh,
              color: editGroup === g ? T.amb : T.g500,
              fontWeight: 700,
            }}
          >{g}</button>
        ))}
      </div>

      {editGroup && <GroupEditor g={editGroup} tournament={tournament} onSave={saveGroupResult} />}

      {/* KO result JSON editor */}
      <div style={{ marginTop: 12 }}>
        <Label>決勝トーナメント結果（JSON）</Label>
        <p style={{ fontSize: 9, color: T.g500, margin: '0 0 6px' }}>
          形式: {'{"r32":["チーム名",...],"r16":[...],"qf":[...],"sf":[...],"final":[...],"champ":"チーム名","third":"チーム名"}'}
        </p>
        <textarea
          value={koText || JSON.stringify(tournament?.ko || {}, null, 2)}
          onChange={(e) => setKoText(e.target.value)}
          rows={6}
          style={{
            width: '100%', padding: 10, borderRadius: 6,
            border: `1px solid ${T.g200}`, fontSize: 11,
            fontFamily: 'monospace', resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={saveKoResult}
          style={{
            marginTop: 6, padding: '6px 16px', borderRadius: 5, border: 'none',
            background: T.amb, color: '#fff', fontWeight: 700,
            fontSize: 12, cursor: 'pointer',
          }}
        >KO結果を保存</button>
      </div>
    </Card>
  );
}

function GroupEditor({ g, tournament, onSave }) {
  const existing = tournament?.groups?.[g] || GROUPS[g].map((t) => ({
    n: t.n, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
  }));
  const [teams, setTeams] = useState(existing);

  function updateField(idx, field, val) {
    setTeams((prev) => {
      const next = prev.map((t, i) => {
        if (i !== idx) return t;
        const updated = { ...t, [field]: parseInt(val) || 0 };
        // Auto-calc pts from w/d
        if (['w', 'd'].includes(field)) {
          updated.pts = (updated.w || 0) * 3 + (updated.d || 0);
        }
        return updated;
      });
      return next;
    });
  }

  return (
    <Card style={{ marginBottom: 8, border: `1.5px solid ${T.amb}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>GROUP {g} 成績入力</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${T.g200}` }}>
            <th style={{ textAlign: 'left', padding: 2 }}>チーム</th>
            <th style={{ width: 35 }}>試合</th>
            <th style={{ width: 35 }}>勝</th>
            <th style={{ width: 35 }}>分</th>
            <th style={{ width: 35 }}>負</th>
            <th style={{ width: 35 }}>得</th>
            <th style={{ width: 35 }}>失</th>
            <th style={{ width: 35 }}>勝点</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.n} style={{ borderBottom: `1px solid ${T.g100}` }}>
              <td style={{ padding: 2, display: 'flex', alignItems: 'center' }}><Flag name={t.n} size={12} />{t.n}</td>
              {['mp', 'w', 'd', 'l', 'gf', 'ga'].map((f) => (
                <td key={f}>
                  <input
                    type="number"
                    value={t[f] || 0}
                    onChange={(e) => updateField(i, f, e.target.value)}
                    style={{
                      width: '100%', padding: 2, border: `1px solid ${T.g200}`,
                      borderRadius: 3, textAlign: 'center', fontSize: 10,
                    }}
                  />
                </td>
              ))}
              <td style={{ textAlign: 'center', fontWeight: 700 }}>{t.pts || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => onSave(g, teams)}
        style={{
          marginTop: 6, padding: '5px 14px', borderRadius: 5, border: 'none',
          background: T.gn, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer',
        }}
      >グループ{g}を保存</button>
    </Card>
  );
}
