# FIFA W杯 2026 予想ゲーム 〜Road to 三幸園〜

友人グループ向けのFIFAワールドカップ2026予想ゲーム。各プレイヤーがグループステージ突破予想＋ボーナスチームを選び、実際の試合結果に応じたポイントランキングを競う。

## ✨ 機能

- **名前だけで参加** — ログイン不要、同じ名前で再訪すると予想の続きから編集可能
- **ボーナスチーム A/B/C** — 勝ち上がるほど倍率が乗算される「穴狙い」設計
- **グループ順位設定** — 12グループ各4チームの1-4位を設定
- **FIFA公式トーナメント表** — R32の対戦組み合わせは公式準拠
- **リアルタイムランキング** — 試合結果が入るたびに自動再計算
- **管理者モード** — 投票ロック／試合結果手動入力
- **API自動連携** — Football-Data.org等から試合結果を定期取得（GitHub Actions）

## 🛠 技術スタック

- React 18 + Vite
- Supabase (PostgreSQL + Realtime)
- Cloudflare Pages / Vercel
- GitHub Actions (試合結果の定期取得)

## 🚀 セットアップ

### 1. リポジトリをクローン

```bash
git clone <your-repo-url>
cd wc2026-prediction
npm install
```

### 2. Supabaseプロジェクト作成

1. https://supabase.com で新規プロジェクト作成
2. SQL Editorで `supabase/schema.sql` を実行
3. Project Settings → API から以下をコピー:
   - Project URL
   - anon / public key

### 3. 環境変数の設定

`.env` ファイルを作成（`.env.example` をコピー）:

```bash
cp .env.example .env
```

`.env` を編集:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
VITE_ADMIN_PASSWORD=sankoen2026
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:5173 で起動。

### 5. デプロイ

**Cloudflare Pages:**
1. GitHubにpush
2. Cloudflare Pages で GitHub 連携
3. Build command: `npm run build`, Output dir: `dist`
4. 環境変数をCloudflareに設定

**Vercel:**
1. GitHubにpush
2. https://vercel.com で Import Git Repository
3. 環境変数を設定

## 📊 試合結果の更新

### 方法A: 管理者画面から手動入力

1. ヘッダー右上の「⚙️」をクリック
2. 合言葉（`.env` の `VITE_ADMIN_PASSWORD`）を入力
3. グループ星取表・決勝T結果を編集

### 方法B: GitHub Actionsで自動取得

`.github/workflows/update-results.yml` を参照。Football-Data.org の無料APIキー ([取得方法](https://www.football-data.org/)) を GitHub Secrets に `FOOTBALL_DATA_TOKEN` として登録すると、毎日UTC 02:00に自動更新される。

## 📐 ポイント計算ルール

### 基礎点
`基礎点 = オッズ^0.4`（Wikipedia等のブックメーカー提示オッズから）

### ステージ倍率（累積加算 / 2026年4月改定）
| R32 | R16 | ベスト8 | ベスト4 | 決勝 | 優勝 | 3位 |
|--|--|--|--|--|--|--|
| x0.2 | **x3.0** | **x5.0** | x2.5 | x3.0 | x4.0 | x1.5 |

ベスト32は48→32（66%通過）でハードルが低いため低倍率。ベスト16・ベスト8で重み付け。

### ボーナスチーム（GL予想の24チームから各1）
| | 通常倍率 | 決勝B | 優勝B |
|--|--|--|--|
| A | x2.5 | x2.0 | x2.0 |
| B | x1.8 | x1.5 | x1.5 |
| C | x1.3 | x1.2 | x1.2 |

### 計算例
日本(基礎点3.6)をボーナスA指定でベスト8進出:
- 3.6 × (0.5+1+4) × 2.5 = **49.5 pts**

ハイチ(基礎点15.8)をボーナスAで優勝:
- 15.8 × 17.5 × 2.5 × 2 × 2 = **2,765 pts** 💥

## 🏗 ディレクトリ構成

```
.
├── src/
│   ├── App.jsx              メインアプリ
│   ├── lib/
│   │   ├── supabase.js      Supabaseクライアント
│   │   └── api.js           DB操作の抽象化層
│   ├── data/
│   │   ├── teams.js         チーム/グループ/国旗データ
│   │   ├── bracket.js       FIFA公式ブラケット構造
│   │   └── scoring.js       スコア計算ロジック
│   └── components/          UIコンポーネント
├── supabase/
│   └── schema.sql           DBスキーマ（初回実行）
├── .github/workflows/
│   └── update-results.yml   試合結果の自動更新
├── .env.example
├── vite.config.js
├── package.json
└── index.html
```

## 📝 ライセンス

Private / Internal use only.
