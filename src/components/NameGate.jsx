import { useState } from 'react';
import { myName, getPredictionByName } from '../lib/api';
import { T } from './ui';

export default function NameGate({ onEnter }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function enter() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('名前を入力してください');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const existing = await getPredictionByName(trimmed);
      myName.set(trimmed);
      onEnter(trimmed, existing);
    } catch (e) {
      setErr('エラー: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: T.bg,
      padding: 20,
    }}>
      <div style={{
        background: T.wh,
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 24px rgba(0,0,0,.08)',
        maxWidth: 420,
        width: '100%',
      }}>
        <div style={{
          fontSize: 10,
          color: T.amb,
          fontWeight: 700,
          letterSpacing: 3,
          textAlign: 'center',
        }}>FOOTBALL PREDICTION GAME</div>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          textAlign: 'center',
          marginTop: 4,
        }}>FIFA W杯 2026 北中米大会</div>
        <div style={{
          fontSize: 13,
          color: T.g500,
          textAlign: 'center',
          marginTop: 4,
        }}>〜 Road to 三幸園 〜</div>

        <div style={{ height: 28 }} />

        <label style={{ fontSize: 12, color: T.g700, fontWeight: 600 }}>あなたの名前を入力してください</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') enter(); }}
          placeholder="例: IZUMI"
          autoFocus
          style={{
            width: '100%',
            marginTop: 6,
            padding: '12px 14px',
            borderRadius: 8,
            border: `1.5px solid ${T.g200}`,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 10, color: T.g400, marginTop: 4 }}>
          同じ名前で再訪すると予想の続きから編集できます
        </div>

        {err && <div style={{ color: T.rd, fontSize: 12, marginTop: 8 }}>{err}</div>}

        <button
          onClick={enter}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 20,
            padding: 14,
            borderRadius: 8,
            border: 'none',
            background: T.amb,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '読み込み中...' : 'はじめる →'}
        </button>
      </div>
    </div>
  );
}
