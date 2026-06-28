import { useState, useMemo, useCallback, useEffect } from "react";
import {
  savePrediction,
  getPredictionByName,
  getAllPredictions,
  subscribePredictions,
  deletePrediction,
  updatePredictionRaw,
  getTournament,
  saveTournament,
  subscribeTournament,
  logVisit,
  getVisitStats,
  myName as myNameStore,
} from "./lib/api";
import { hasSupabase } from "./lib/supabase";

// ═══════════════════════════════════════════════════════════
// Theme
// ═══════════════════════════════════════════════════════════
var $ = {
  // 公式中継のようなディープネイビー基調＋上部に控えめなスタジアム光
  bg: "radial-gradient(1100px 460px at 50% -8%, rgba(56,110,170,.20), transparent 70%), #0b1524",
  panel: "#0f1c30",            // ヘッダー/モーダル等の面
  card: "rgba(255,255,255,.045)",
  cardB: "rgba(255,255,255,.085)",
  gold: "#f4c14b",
  goldL: "#ffd97a",
  goldD: "#9a7016",
  pitchL: "#3ddc97",
  pitch: "#10b981",
  red: "#f06d6d",
  redL: "#f8a3a3",
  blue: "#5b9be8",
  blueL: "#9cc3f5",
  purple: "#b07be0",
  purpleL: "#d4b3f0",
  txt: "#f3f6fb",
  txt2: "#c2cddd",
  dim: "#7e8da4",
  border: "rgba(255,255,255,.10)",
  glow: "0 8px 28px rgba(0,0,0,.45)",
  glowS: "0 3px 12px rgba(0,0,0,.32)",
};
var font = "'Rajdhani','Noto Sans JP',sans-serif";
var fontH = "'Bebas Neue','Rajdhani',sans-serif";

// ═══════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════
var FC = {"メキシコ":"mx","南アフリカ":"za","韓国":"kr","チェコ":"cz","カナダ":"ca","ボスニア":"ba","カタール":"qa","スイス":"ch","ブラジル":"br","モロッコ":"ma","ハイチ":"ht","スコットランド":"gb-sct","アメリカ":"us","パラグアイ":"py","オーストラリア":"au","トルコ":"tr","ドイツ":"de","キュラソー":"cw","コートジボワール":"ci","エクアドル":"ec","オランダ":"nl","日本":"jp","スウェーデン":"se","チュニジア":"tn","ベルギー":"be","エジプト":"eg","イラン":"ir","ニュージーランド":"nz","スペイン":"es","カーボベルデ":"cv","サウジアラビア":"sa","ウルグアイ":"uy","フランス":"fr","セネガル":"sn","イラク":"iq","ノルウェー":"no","アルゼンチン":"ar","アルジェリア":"dz","オーストリア":"at","ヨルダン":"jo","ポルトガル":"pt","DRコンゴ":"cd","ウズベキスタン":"uz","コロンビア":"co","イングランド":"gb-eng","クロアチア":"hr","ガーナ":"gh","パナマ":"pa"};

function Fl({ n, s }) {
  var c = FC[n];
  if (!c) return null;
  return <img src={"https://flagcdn.com/w80/" + c + ".png"} alt="" style={{ width: s || 16, height: Math.round((s || 16) * 0.67), objectFit: "cover", borderRadius: 3, verticalAlign: "middle", marginRight: 5, boxShadow: "0 1px 3px rgba(0,0,0,.4)" }} />;
}

// 優勝オッズ（2026年4月末 ESPN集計値）
var GRP = {
  A:[{n:"メキシコ",o:80},{n:"南アフリカ",o:1000},{n:"韓国",o:400},{n:"チェコ",o:250}],
  B:[{n:"カナダ",o:200},{n:"ボスニア",o:500},{n:"カタール",o:1500},{n:"スイス",o:65}],
  C:[{n:"ブラジル",o:9.5},{n:"モロッコ",o:50},{n:"ハイチ",o:2500},{n:"スコットランド",o:200}],
  D:[{n:"アメリカ",o:60},{n:"パラグアイ",o:300},{n:"オーストラリア",o:600},{n:"トルコ",o:90}],
  E:[{n:"ドイツ",o:14},{n:"キュラソー",o:2500},{n:"コートジボワール",o:250},{n:"エクアドル",o:80}],
  F:[{n:"オランダ",o:20},{n:"日本",o:65},{n:"スウェーデン",o:120},{n:"チュニジア",o:500}],
  G:[{n:"ベルギー",o:40},{n:"エジプト",o:300},{n:"イラン",o:700},{n:"ニュージーランド",o:1500}],
  H:[{n:"スペイン",o:4.5},{n:"カーボベルデ",o:1000},{n:"サウジアラビア",o:1000},{n:"ウルグアイ",o:65}],
  I:[{n:"フランス",o:4.75},{n:"セネガル",o:90},{n:"イラク",o:1500},{n:"ノルウェー",o:35}],
  J:[{n:"アルゼンチン",o:9},{n:"アルジェリア",o:350},{n:"オーストリア",o:150},{n:"ヨルダン",o:2500}],
  K:[{n:"ポルトガル",o:8.5},{n:"DRコンゴ",o:1000},{n:"ウズベキスタン",o:1500},{n:"コロンビア",o:40}],
  L:[{n:"イングランド",o:7},{n:"クロアチア",o:90},{n:"ガーナ",o:300},{n:"パナマ",o:1000}],
};
var AT = Object.values(GRP).flat();
var ft = function(n){ return AT.find(function(t){ return t.n===n; }) || null; };
var TEAM_GRP = {}; Object.keys(GRP).forEach(function(g){ GRP[g].forEach(function(t){ TEAM_GRP[t.n] = g; }); });
// TheSportsDB(英語)→日本語チーム名。管理画面の手動API連携で使用（ワークフローと同一）。
var NM = {"Mexico":"メキシコ","South Africa":"南アフリカ","South Korea":"韓国","Korea Republic":"韓国","Czech Republic":"チェコ","Czechia":"チェコ","Canada":"カナダ","Bosnia and Herzegovina":"ボスニア","Bosnia-Herzegovina":"ボスニア","Qatar":"カタール","Switzerland":"スイス","Brazil":"ブラジル","Morocco":"モロッコ","Haiti":"ハイチ","Scotland":"スコットランド","United States":"アメリカ","USA":"アメリカ","Paraguay":"パラグアイ","Australia":"オーストラリア","Turkey":"トルコ","Turkiye":"トルコ","Germany":"ドイツ","Curacao":"キュラソー","Curaçao":"キュラソー","Ivory Coast":"コートジボワール","Ecuador":"エクアドル","Netherlands":"オランダ","Japan":"日本","Sweden":"スウェーデン","Tunisia":"チュニジア","Belgium":"ベルギー","Egypt":"エジプト","Iran":"イラン","New Zealand":"ニュージーランド","Spain":"スペイン","Cape Verde":"カーボベルデ","Saudi Arabia":"サウジアラビア","Uruguay":"ウルグアイ","France":"フランス","Senegal":"セネガル","Iraq":"イラク","Norway":"ノルウェー","Argentina":"アルゼンチン","Algeria":"アルジェリア","Austria":"オーストリア","Jordan":"ヨルダン","Portugal":"ポルトガル","DR Congo":"DRコンゴ","Congo DR":"DRコンゴ","Uzbekistan":"ウズベキスタン","Colombia":"コロンビア","England":"イングランド","Croatia":"クロアチア","Ghana":"ガーナ","Panama":"パナマ"};
function jaTeam(n) { return NM[n] || n; }
// 公式日程フォールバック（無料APIが未配信のグループ戦カードの開催日, 会場現地日付/Wikipedia由来）。
// 実データ(API/手動)に日程が入ればそちらを優先表示。キー=チーム名の組(順不同)。
var SCHED={"DRコンゴ|ウズベキスタン":"2026-06-27","DRコンゴ|コロンビア":"2026-06-23","DRコンゴ|ポルトガル":"2026-06-17","アルジェリア|アルゼンチン":"2026-06-16","アルジェリア|オーストリア":"2026-06-27","アルジェリア|ヨルダン":"2026-06-22","アルゼンチン|オーストリア":"2026-06-22","アルゼンチン|ヨルダン":"2026-06-27","イラク|セネガル":"2026-06-26","イラク|ノルウェー":"2026-06-16","イラク|フランス":"2026-06-22","イングランド|ガーナ":"2026-06-23","イングランド|クロアチア":"2026-06-17","イングランド|パナマ":"2026-06-27","ウズベキスタン|コロンビア":"2026-06-17","ウズベキスタン|ポルトガル":"2026-06-23","ウルグアイ|カーボベルデ":"2026-06-21","ウルグアイ|サウジアラビア":"2026-06-15","ウルグアイ|スペイン":"2026-06-26","オランダ|スウェーデン":"2026-06-20","オランダ|チュニジア":"2026-06-25","オランダ|日本":"2026-06-14","オーストリア|ヨルダン":"2026-06-16","カーボベルデ|サウジアラビア":"2026-06-26","カーボベルデ|スペイン":"2026-06-15","ガーナ|クロアチア":"2026-06-27","ガーナ|パナマ":"2026-06-17","クロアチア|パナマ":"2026-06-23","コロンビア|ポルトガル":"2026-06-27","サウジアラビア|スペイン":"2026-06-21","スウェーデン|チュニジア":"2026-06-14","スウェーデン|日本":"2026-06-25","セネガル|ノルウェー":"2026-06-22","セネガル|フランス":"2026-06-16","チェコ|メキシコ":"2026-06-25","チュニジア|日本":"2026-06-20","ノルウェー|フランス":"2026-06-26"};
function schedDate(a, b) { return SCHED[[a, b].slice().sort().join("|")] || ""; }
// FIFA男子世界ランキング（2026年4月1日付 / J SPORTS）。ノルウェーは概算。
var FIFA_RANK = {"フランス":1,"スペイン":2,"アルゼンチン":3,"イングランド":4,"ポルトガル":5,"ブラジル":6,"オランダ":7,"モロッコ":8,"ベルギー":9,"ドイツ":10,"クロアチア":11,"コロンビア":13,"セネガル":14,"メキシコ":15,"アメリカ":16,"ウルグアイ":17,"日本":18,"スイス":19,"イラン":21,"トルコ":22,"エクアドル":23,"オーストリア":24,"韓国":25,"オーストラリア":27,"アルジェリア":28,"エジプト":29,"カナダ":30,"ノルウェー":32,"パナマ":33,"コートジボワール":34,"スウェーデン":38,"パラグアイ":40,"チェコ":41,"スコットランド":43,"チュニジア":44,"DRコンゴ":46,"ウズベキスタン":50,"カタール":55,"イラク":57,"南アフリカ":60,"サウジアラビア":61,"ヨルダン":63,"ボスニア":65,"カーボベルデ":69,"ガーナ":74,"キュラソー":82,"ハイチ":83,"ニュージーランド":85};
var bsc = function(o){ return Math.round(Math.pow(o,.4)*10)/10; };

// ステージ倍率（累積加算）
//   R32: 0.2  ← 48中32通過(66%)＝ハードル低
//   R16: 3.0  ← 32→16(50%)、選別が始まる「2番目に高得点」
//   QF : 5.0  ← 16→8(50%)、ベスト8到達が「最高得点」
//   SF : 2.5
//   Final: 3.0
//   Champ: 4.0  ← 優勝予想は最難関
//   Third: 1.5
var SM = { r32:.2, r16:3, qf:5, sf:2.5, final:3, champ:4, third:1.5 };
var SL = { r32:"R32", r16:"R16", qf:"QF", sf:"SF", final:"F", champ:"👑", third:"🥉" };
var DES = {
  A:{ m:2.5, fb:2,   cb:2,   l:"1推し", c:$.red,    cl:$.redL,    bg:"rgba(239,68,68,.18)" },
  B:{ m:1.8, fb:1.5, cb:1.5, l:"2推し", c:$.blue,   cl:$.blueL,   bg:"rgba(59,130,246,.18)" },
  C:{ m:1.3, fb:1.2, cb:1.2, l:"3推し", c:$.purple, cl:$.purpleL, bg:"rgba(168,85,247,.18)" },
};
// FIFA公式の決勝T組み合わせ（試合番号73-88）。配列の並び順=ブラケット木（隣接2試合がR16で対戦）。
// 左半分=準決勝1(M101)側、右半分=準決勝2(M102)側。R16: M89=W74·W77, M90=W73·W75, M91=W76·W78,
// M92=W79·W80, M93=W83·W84, M94=W81·W82, M95=W86·W88, M96=W85·W87 になるよう順序を決定。
var LR32=[{id:74,s:["1E","3(A/B/C/D/F)"]},{id:77,s:["1I","3(C/D/F/G/H)"]},{id:73,s:["2A","2B"]},{id:75,s:["1F","2C"]},{id:83,s:["2K","2L"]},{id:84,s:["1H","2J"]},{id:81,s:["1D","3(B/E/F/I/J)"]},{id:82,s:["1G","3(A/E/H/I/J)"]}];
var RR32=[{id:76,s:["1C","2F"]},{id:78,s:["2E","2I"]},{id:79,s:["1A","3(C/E/F/H/I)"]},{id:80,s:["1L","3(E/H/I/J/K)"]},{id:86,s:["1J","2H"]},{id:88,s:["2D","2G"]},{id:85,s:["1B","3(E/F/G/I/J)"]},{id:87,s:["1K","3(D/E/I/J/L)"]}];
// FIFA公式「3位チーム割当表」(Annexe C, 全495通り) — 進出8グループ(昇順)→各3位枠の割当
// 値の各文字は下記TP_SLOTSの順(FIFA試合74,77,79,80,81,82,85,87)に対応するグループ。teemula35/punditbench(規定PDFを機械検証)由来、独自に全495件をbijection/候補集合で再検証済み。
var TP_SLOTS=["3(A/B/C/D/F)","3(C/D/F/G/H)","3(C/E/F/H/I)","3(E/H/I/J/K)","3(B/E/F/I/J)","3(A/E/H/I/J)","3(E/F/G/I/J)","3(D/E/I/J/L)"];
var TP_ALLOC={ABCDEFGH:"CFHEBAGD",ABCDEFGI:"DFCIBAGE",ABCDEFGJ:"DFCJBAGE",ABCDEFGK:"DFCKBAGE",ABCDEFGL:"DFCEBAGL",ABCDEFHI:"CFHIBAED",ABCDEFHJ:"CFHEBAJD",ABCDEFHK:"CFHKBAED",ABCDEFHL:"CDHEBAFL",ABCDEFIJ:"DFCIBAJE",ABCDEFIK:"DFCKBAEI",ABCDEFIL:"DFCIBAEL",ABCDEFJK:"DFCKBAJE",ABCDEFJL:"DFCEBAJL",ABCDEFKL:"DFCKBAEL",ABCDEGHI:"CDHIBAGE",ABCDEGHJ:"CDHJBAGE",ABCDEGHK:"CDHKBAGE",ABCDEGHL:"CDHEBAGL",ABCDEGIJ:"CDEJBAGI",ABCDEGIK:"CDEKBAGI",ABCDEGIL:"CDEIBAGL",ABCDEGJK:"CDEKBAGJ",ABCDEGJL:"CDEJBAGL",ABCDEGKL:"CDEKBAGL",ABCDEHIJ:"CDHIBAJE",ABCDEHIK:"CDHKBAEI",ABCDEHIL:"CDHIBAEL",ABCDEHJK:"CDHKBAJE",ABCDEHJL:"CDHEBAJL",ABCDEHKL:"CDHKBAEL",ABCDEIJK:"CDEKBAJI",ABCDEIJL:"CDEIBAJL",ABCDEIKL:"CDEKBAIL",ABCDEJKL:"CDEKBAJL",ABCDFGHI:"CFHIBAGD",ABCDFGHJ:"CFHJBAGD",ABCDFGHK:"CFHKBAGD",ABCDFGHL:"DFCHBAGL",ABCDFGIJ:"DFCJBAGI",ABCDFGIK:"DFCKBAGI",ABCDFGIL:"DFCIBAGL",ABCDFGJK:"DFCKBAGJ",ABCDFGJL:"DFCJBAGL",ABCDFGKL:"DFCKBAGL",ABCDFHIJ:"CFHIBAJD",ABCDFHIK:"CDHKBAFI",ABCDFHIL:"CDHIBAFL",ABCDFHJK:"CFHKBAJD",ABCDFHJL:"DFCHBAJL",ABCDFHKL:"CDHKBAFL",ABCDFIJK:"DFCKBAJI",ABCDFIJL:"DFCIBAJL",ABCDFIKL:"DFCKBAIL",ABCDFJKL:"DFCKBAJL",ABCDGHIJ:"CDHJBAGI",ABCDGHIK:"CDHKBAGI",ABCDGHIL:"CDHIBAGL",ABCDGHJK:"CDHKBAGJ",ABCDGHJL:"CDHJBAGL",ABCDGHKL:"CDHKBAGL",ABCDGIJK:"DGCKBAJI",ABCDGIJL:"DGCIBAJL",ABCDGIKL:"CDIKBAGL",ABCDGJKL:"DGCKBAJL",ABCDHIJK:"CDHKBAJI",ABCDHIJL:"CDHIBAJL",ABCDHIKL:"CDHKBAIL",ABCDHJKL:"CDHKBAJL",ABCDIJKL:"CDIKBAJL",ABCEFGHI:"CFHIBAGE",ABCEFGHJ:"CFHJBAGE",ABCEFGHK:"CFHKBAGE",ABCEFGHL:"CFHEBAGL",ABCEFGIJ:"CFEJBAGI",ABCEFGIK:"CFEKBAGI",ABCEFGIL:"CFEIBAGL",ABCEFGJK:"CFEKBAGJ",ABCEFGJL:"CFEJBAGL",ABCEFGKL:"CFEKBAGL",ABCEFHIJ:"CFHIBAJE",ABCEFHIK:"CFHKBAEI",ABCEFHIL:"CFHIBAEL",ABCEFHJK:"CFHKBAJE",ABCEFHJL:"CFHEBAJL",ABCEFHKL:"CFHKBAEL",ABCEFIJK:"CFEKBAJI",ABCEFIJL:"CFEIBAJL",ABCEFIKL:"CFEKBAIL",ABCEFJKL:"CFEKBAJL",ABCEGHIJ:"CGHIBAJE",ABCEGHIK:"CHEKBAGI",ABCEGHIL:"CHEIBAGL",ABCEGHJK:"CGHKBAJE",ABCEGHJL:"CGHEBAJL",ABCEGHKL:"CHEKBAGL",ABCEGIJK:"CGEKBAJI",ABCEGIJL:"CGEIBAJL",ABCEGIKL:"ACEKBIGL",ABCEGJKL:"CGEKBAJL",ABCEHIJK:"CHEKBAJI",ABCEHIJL:"CHEIBAJL",ABCEHIKL:"CHEKBAIL",ABCEHJKL:"CHEKBAJL",ABCEIJKL:"ACEKBIJL",ABCFGHIJ:"CFHJBAGI",ABCFGHIK:"CFHKBAGI",ABCFGHIL:"CFHIBAGL",ABCFGHJK:"CFHKBAGJ",ABCFGHJL:"CFHJBAGL",ABCFGHKL:"CFHKBAGL",ABCFGIJK:"FGCKBAJI",ABCFGIJL:"FGCIBAJL",ABCFGIKL:"CFIKBAGL",ABCFGJKL:"FGCKBAJL",ABCFHIJK:"CFHKBAJI",ABCFHIJL:"CFHIBAJL",ABCFHIKL:"CFHKBAIL",ABCFHJKL:"CFHKBAJL",ABCFIJKL:"CFIKBAJL",ABCGHIJK:"CGHKBAJI",ABCGHIJL:"CGHIBAJL",ABCGHIKL:"CHIKBAGL",ABCGHJKL:"CGHKBAJL",ABCGIJKL:"CGIKBAJL",ABCHIJKL:"CHIKBAJL",ABDEFGHI:"DFHIBAGE",ABDEFGHJ:"DFHJBAGE",ABDEFGHK:"DFHKBAGE",ABDEFGHL:"DFHEBAGL",ABDEFGIJ:"DFEJBAGI",ABDEFGIK:"DFEKBAGI",ABDEFGIL:"DFEIBAGL",ABDEFGJK:"DFEKBAGJ",ABDEFGJL:"DFEJBAGL",ABDEFGKL:"DFEKBAGL",ABDEFHIJ:"DFHIBAJE",ABDEFHIK:"DFHKBAEI",ABDEFHIL:"DFHIBAEL",ABDEFHJK:"DFHKBAJE",ABDEFHJL:"DFHEBAJL",ABDEFHKL:"DFHKBAEL",ABDEFIJK:"DFEKBAJI",ABDEFIJL:"DFEIBAJL",ABDEFIKL:"DFEKBAIL",ABDEFJKL:"DFEKBAJL",ABDEGHIJ:"DGHIBAJE",ABDEGHIK:"DHEKBAGI",ABDEGHIL:"DHEIBAGL",ABDEGHJK:"DGHKBAJE",ABDEGHJL:"DGHEBAJL",ABDEGHKL:"DHEKBAGL",ABDEGIJK:"DGEKBAJI",ABDEGIJL:"DGEIBAJL",ABDEGIKL:"ADEKBIGL",ABDEGJKL:"DGEKBAJL",ABDEHIJK:"DHEKBAJI",ABDEHIJL:"DHEIBAJL",ABDEHIKL:"DHEKBAIL",ABDEHJKL:"DHEKBAJL",ABDEIJKL:"ADEKBIJL",ABDFGHIJ:"DFHJBAGI",ABDFGHIK:"DFHKBAGI",ABDFGHIL:"DFHIBAGL",ABDFGHJK:"DFHKBAGJ",ABDFGHJL:"DFHJBAGL",ABDFGHKL:"DFHKBAGL",ABDFGIJK:"DGFKBAJI",ABDFGIJL:"DGFIBAJL",ABDFGIKL:"DFIKBAGL",ABDFGJKL:"DGFKBAJL",ABDFHIJK:"DFHKBAJI",ABDFHIJL:"DFHIBAJL",ABDFHIKL:"DFHKBAIL",ABDFHJKL:"DFHKBAJL",ABDFIJKL:"DFIKBAJL",ABDGHIJK:"DGHKBAJI",ABDGHIJL:"DGHIBAJL",ABDGHIKL:"DHIKBAGL",ABDGHJKL:"DGHKBAJL",ABDGIJKL:"DGIKBAJL",ABDHIJKL:"DHIKBAJL",ABEFGHIJ:"FGHIBAJE",ABEFGHIK:"FHEKBAGI",ABEFGHIL:"FHEIBAGL",ABEFGHJK:"FGHKBAJE",ABEFGHJL:"FGHEBAJL",ABEFGHKL:"FHEKBAGL",ABEFGIJK:"FGEKBAJI",ABEFGIJL:"FGEIBAJL",ABEFGIKL:"AFEKBIGL",ABEFGJKL:"FGEKBAJL",ABEFHIJK:"FHEKBAJI",ABEFHIJL:"FHEIBAJL",ABEFHIKL:"FHEKBAIL",ABEFHJKL:"FHEKBAJL",ABEFIJKL:"AFEKBIJL",ABEGHIJK:"AGEKBHJI",ABEGHIJL:"AGEIBHJL",ABEGHIKL:"AHEKBIGL",ABEGHJKL:"AGEKBHJL",ABEGIJKL:"AGEKBIJL",ABEHIJKL:"AHEKBIJL",ABFGHIJK:"FGHKBAJI",ABFGHIJL:"FGHIBAJL",ABFGHIKL:"AFHKBIGL",ABFGHJKL:"FGHKBAJL",ABFGIJKL:"FGIKBAJL",ABFHIJKL:"AFHKBIJL",ABGHIJKL:"AGHKBIJL",ACDEFGHI:"CFHIEAGD",ACDEFGHJ:"CFHEJAGD",ACDEFGHK:"CFHKEAGD",ACDEFGHL:"CDHEFAGL",ACDEFGIJ:"DFCIJAGE",ACDEFGIK:"DFCKEAGI",ACDEFGIL:"DFCIEAGL",ACDEFGJK:"DFCKJAGE",ACDEFGJL:"DFCEJAGL",ACDEFGKL:"DFCKEAGL",ACDEFHIJ:"CFHIEAJD",ACDEFHIK:"CDHKFAEI",ACDEFHIL:"CDHIFAEL",ACDEFHJK:"CFHKEAJD",ACDEFHJL:"CDHEFAJL",ACDEFHKL:"CDHKFAEL",ACDEFIJK:"DFCKEAJI",ACDEFIJL:"DFCIEAJL",ACDEFIKL:"DFCKIAEL",ACDEFJKL:"DFCKEAJL",ACDEGHIJ:"CDHIJAGE",ACDEGHIK:"CDHKEAGI",ACDEGHIL:"CDHIEAGL",ACDEGHJK:"CDHKJAGE",ACDEGHJL:"CDHEJAGL",ACDEGHKL:"CDHKEAGL",ACDEGIJK:"CDEKJAGI",ACDEGIJL:"CDEIJAGL",ACDEGIKL:"CDEKIAGL",ACDEGJKL:"CDEKJAGL",ACDEHIJK:"CDHKEAJI",ACDEHIJL:"CDHIEAJL",ACDEHIKL:"CDHKIAEL",ACDEHJKL:"CDHKEAJL",ACDEIJKL:"CDEKIAJL",ACDFGHIJ:"CFHIJAGD",ACDFGHIK:"CDHKFAGI",ACDFGHIL:"CDHIFAGL",ACDFGHJK:"CFHKJAGD",ACDFGHJL:"DFCHJAGL",ACDFGHKL:"CDHKFAGL",ACDFGIJK:"DFCKJAGI",ACDFGIJL:"DFCIJAGL",ACDFGIKL:"DFCKIAGL",ACDFGJKL:"DFCKJAGL",ACDFHIJK:"CDHKFAJI",ACDFHIJL:"CDHIFAJL",ACDFHIKL:"CDHKIAFL",ACDFHJKL:"CDHKFAJL",ACDFIJKL:"DFCKIAJL",ACDGHIJK:"CDHKJAGI",ACDGHIJL:"CDHIJAGL",ACDGHIKL:"CDHKIAGL",ACDGHJKL:"CDHKJAGL",ACDGIJKL:"CDIKJAGL",ACDHIJKL:"CDHKIAJL",ACEFGHIJ:"CFHIJAGE",ACEFGHIK:"CFHKEAGI",ACEFGHIL:"CFHIEAGL",ACEFGHJK:"CFHKJAGE",ACEFGHJL:"CFHEJAGL",ACEFGHKL:"CFHKEAGL",ACEFGIJK:"CFEKJAGI",ACEFGIJL:"CFEIJAGL",ACEFGIKL:"CFEKIAGL",ACEFGJKL:"CFEKJAGL",ACEFHIJK:"CFHKEAJI",ACEFHIJL:"CFHIEAJL",ACEFHIKL:"CFHKIAEL",ACEFHJKL:"CFHKEAJL",ACEFIJKL:"CFEKIAJL",ACEGHIJK:"CHEKJAGI",ACEGHIJL:"CHEIJAGL",ACEGHIKL:"CHEKIAGL",ACEGHJKL:"CHEKJAGL",ACEGIJKL:"CGEKIAJL",ACEHIJKL:"CHEKIAJL",ACFGHIJK:"CFHKJAGI",ACFGHIJL:"CFHIJAGL",ACFGHIKL:"CFHKIAGL",ACFGHJKL:"CFHKJAGL",ACFGIJKL:"CFIKJAGL",ACFHIJKL:"CFHKIAJL",ACGHIJKL:"CGHKIAJL",ADEFGHIJ:"DFHIJAGE",ADEFGHIK:"DFHKEAGI",ADEFGHIL:"DFHIEAGL",ADEFGHJK:"DFHKJAGE",ADEFGHJL:"DFHEJAGL",ADEFGHKL:"DFHKEAGL",ADEFGIJK:"DFEKJAGI",ADEFGIJL:"DFEIJAGL",ADEFGIKL:"DFEKIAGL",ADEFGJKL:"DFEKJAGL",ADEFHIJK:"DFHKEAJI",ADEFHIJL:"DFHIEAJL",ADEFHIKL:"DFHKIAEL",ADEFHJKL:"DFHKEAJL",ADEFIJKL:"DFEKIAJL",ADEGHIJK:"DHEKJAGI",ADEGHIJL:"DHEIJAGL",ADEGHIKL:"DHEKIAGL",ADEGHJKL:"DHEKJAGL",ADEGIJKL:"DGEKIAJL",ADEHIJKL:"DHEKIAJL",ADFGHIJK:"DFHKJAGI",ADFGHIJL:"DFHIJAGL",ADFGHIKL:"DFHKIAGL",ADFGHJKL:"DFHKJAGL",ADFGIJKL:"DFIKJAGL",ADFHIJKL:"DFHKIAJL",ADGHIJKL:"DGHKIAJL",AEFGHIJK:"FHEKJAGI",AEFGHIJL:"FHEIJAGL",AEFGHIKL:"FHEKIAGL",AEFGHJKL:"FHEKJAGL",AEFGIJKL:"FGEKIAJL",AEFHIJKL:"FHEKIAJL",AEGHIJKL:"AGEKIHJL",AFGHIJKL:"FGHKIAJL",BCDEFGHI:"DFCIBHGE",BCDEFGHJ:"CFHEBJGD",BCDEFGHK:"DFCKBHGE",BCDEFGHL:"DFCEBHGL",BCDEFGIJ:"DFCIBJGE",BCDEFGIK:"DFCKBEGI",BCDEFGIL:"DFCIBEGL",BCDEFGJK:"DFCKBJGE",BCDEFGJL:"DFCEBJGL",BCDEFGKL:"DFCKBEGL",BCDEFHIJ:"DFCIBHJE",BCDEFHIK:"DFCKBHEI",BCDEFHIL:"DFCIBHEL",BCDEFHJK:"DFCKBHJE",BCDEFHJL:"DFCEBHJL",BCDEFHKL:"DFCKBHEL",BCDEFIJK:"DFCKBEJI",BCDEFIJL:"DFCIBEJL",BCDEFIKL:"DFCKBIEL",BCDEFJKL:"DFCKBEJL",BCDEGHIJ:"CDHIBJGE",BCDEGHIK:"CDEKBHGI",BCDEGHIL:"CDEIBHGL",BCDEGHJK:"CDHKBJGE",BCDEGHJL:"CDHEBJGL",BCDEGHKL:"CDEKBHGL",BCDEGIJK:"CDEKBJGI",BCDEGIJL:"CDEIBJGL",BCDEGIKL:"CDEKBIGL",BCDEGJKL:"CDEKBJGL",BCDEHIJK:"CDEKBHJI",BCDEHIJL:"CDEIBHJL",BCDEHIKL:"CDEKBHIL",BCDEHJKL:"CDEKBHJL",BCDEIJKL:"CDEKBIJL",BCDFGHIJ:"CFHIBJGD",BCDFGHIK:"DFCKBHGI",BCDFGHIL:"DFCIBHGL",BCDFGHJK:"CFHKBJGD",BCDFGHJL:"DFCJBHGL",BCDFGHKL:"DFCKBHGL",BCDFGIJK:"DFCKBJGI",BCDFGIJL:"DFCIBJGL",BCDFGIKL:"DFCKBIGL",BCDFGJKL:"DFCKBJGL",BCDFHIJK:"DFCKBHJI",BCDFHIJL:"DFCIBHJL",BCDFHIKL:"DFCKBHIL",BCDFHJKL:"DFCKBHJL",BCDFIJKL:"DFCKBIJL",BCDGHIJK:"CDHKBJGI",BCDGHIJL:"CDHIBJGL",BCDGHIKL:"CDHKBIGL",BCDGHJKL:"CDHKBJGL",BCDGIJKL:"CDIKBJGL",BCDHIJKL:"CDHKBIJL",BCEFGHIJ:"CFHIBJGE",BCEFGHIK:"CFEKBHGI",BCEFGHIL:"CFEIBHGL",BCEFGHJK:"CFHKBJGE",BCEFGHJL:"CFHEBJGL",BCEFGHKL:"CFEKBHGL",BCEFGIJK:"CFEKBJGI",BCEFGIJL:"CFEIBJGL",BCEFGIKL:"CFEKBIGL",BCEFGJKL:"CFEKBJGL",BCEFHIJK:"CFEKBHJI",BCEFHIJL:"CFEIBHJL",BCEFHIKL:"CFEKBHIL",BCEFHJKL:"CFEKBHJL",BCEFIJKL:"CFEKBIJL",BCEGHIJK:"CGEKBHJI",BCEGHIJL:"CGEIBHJL",BCEGHIKL:"CHEKBIGL",BCEGHJKL:"CGEKBHJL",BCEGIJKL:"CGEKBIJL",BCEHIJKL:"CHEKBIJL",BCFGHIJK:"CFHKBJGI",BCFGHIJL:"CFHIBJGL",BCFGHIKL:"CFHKBIGL",BCFGHJKL:"CFHKBJGL",BCFGIJKL:"CFIKBJGL",BCFHIJKL:"CFHKBIJL",BCGHIJKL:"CGHKBIJL",BDEFGHIJ:"DFHIBJGE",BDEFGHIK:"DFEKBHGI",BDEFGHIL:"DFEIBHGL",BDEFGHJK:"DFHKBJGE",BDEFGHJL:"DFHEBJGL",BDEFGHKL:"DFEKBHGL",BDEFGIJK:"DFEKBJGI",BDEFGIJL:"DFEIBJGL",BDEFGIKL:"DFEKBIGL",BDEFGJKL:"DFEKBJGL",BDEFHIJK:"DFEKBHJI",BDEFHIJL:"DFEIBHJL",BDEFHIKL:"DFEKBHIL",BDEFHJKL:"DFEKBHJL",BDEFIJKL:"DFEKBIJL",BDEGHIJK:"DGEKBHJI",BDEGHIJL:"DGEIBHJL",BDEGHIKL:"DHEKBIGL",BDEGHJKL:"DGEKBHJL",BDEGIJKL:"DGEKBIJL",BDEHIJKL:"DHEKBIJL",BDFGHIJK:"DFHKBJGI",BDFGHIJL:"DFHIBJGL",BDFGHIKL:"DFHKBIGL",BDFGHJKL:"DFHKBJGL",BDFGIJKL:"DFIKBJGL",BDFHIJKL:"DFHKBIJL",BDGHIJKL:"DGHKBIJL",BEFGHIJK:"FGEKBHJI",BEFGHIJL:"FGEIBHJL",BEFGHIKL:"FHEKBIGL",BEFGHJKL:"FGEKBHJL",BEFGIJKL:"FGEKBIJL",BEFHIJKL:"FHEKBIJL",BEGHIJKL:"BGEKIHJL",BFGHIJKL:"FGHKBIJL",CDEFGHIJ:"DFCIJHGE",CDEFGHIK:"DFCKEHGI",CDEFGHIL:"DFCIEHGL",CDEFGHJK:"DFCKJHGE",CDEFGHJL:"DFCEJHGL",CDEFGHKL:"DFCKEHGL",CDEFGIJK:"DFCKEJGI",CDEFGIJL:"DFCIEJGL",CDEFGIKL:"DFCKEIGL",CDEFGJKL:"DFCKEJGL",CDEFHIJK:"DFCKEHJI",CDEFHIJL:"DFCIEHJL",CDEFHIKL:"DFCKIHEL",CDEFHJKL:"DFCKEHJL",CDEFIJKL:"DFCKEIJL",CDEGHIJK:"CDEKJHGI",CDEGHIJL:"CDEIJHGL",CDEGHIKL:"CDEKIHGL",CDEGHJKL:"CDEKJHGL",CDEGIJKL:"CDEKIJGL",CDEHIJKL:"CDEKIHJL",CDFGHIJK:"DFCKJHGI",CDFGHIJL:"DFCIJHGL",CDFGHIKL:"DFCKIHGL",CDFGHJKL:"DFCKJHGL",CDFGIJKL:"DFCKIJGL",CDFHIJKL:"DFCKIHJL",CDGHIJKL:"CDHKIJGL",CEFGHIJK:"CFEKJHGI",CEFGHIJL:"CFEIJHGL",CEFGHIKL:"CFEKIHGL",CEFGHJKL:"CFEKJHGL",CEFGIJKL:"CFEKIJGL",CEFHIJKL:"CFEKIHJL",CEGHIJKL:"CGEKIHJL",CFGHIJKL:"CFHKIJGL",DEFGHIJK:"DFEKJHGI",DEFGHIJL:"DFEIJHGL",DEFGHIKL:"DFEKIHGL",DEFGHJKL:"DFEKJHGL",DEFGIJKL:"DFEKIJGL",DEFHIJKL:"DFEKIHJL",DEGHIJKL:"DGEKIHJL",DFGHIJKL:"DFHKIJGL",EFGHIJKL:"FGEKIHJL"};

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function resolveSeed(seed,gl,tp){try{if(!seed)return{n:"TBD",o:100,tbd:true};if(seed.startsWith("3(")){var p=tp?tp[seed]:null;if(p){var t=ft(p);return{n:p,o:t?t.o:100,is3:true};}return{n:"3位",o:100,is3:true,tbd:true,seed:seed};}var pos=seed[0],g=seed[1],ranks=(gl&&gl[g])||[];var idx=pos==="1"?0:1;if(!ranks||ranks.length<=idx)return{n:g+pos+"位",o:100,tbd:true,grp:g};var tn=ranks[idx];if(!tn)return{n:g+pos+"位",o:100,tbd:true,grp:g};var t2=ft(tn);return{n:tn,o:t2?t2.o:100,grp:g};}catch(e){return{n:"TBD",o:100,tbd:true};}}
function get3c(seed,gl){try{if(!seed||!seed.startsWith("3("))return[];var gs=seed.match(/[A-L]/g)||[];var r=[];gs.forEach(function(g){var ranks=(gl&&gl[g])||[];if(ranks.length>=3){var t=ft(ranks[2]);if(t)r.push({n:t.n,o:t.o,grp:g});}else{GRP[g].forEach(function(t){if(ranks.indexOf(t.n)<0)r.push({n:t.n,o:t.o,grp:g});});}});return r;}catch(e){return[];}}
// 順位的中ボーナス: 1位的中 x1.5 / 2位的中 x1.25
var RANK_BONUS = [1.5, 1.25];
function calcScore(gl, des, ko, groups) {
  try {
    var total = 0, bd = [];
    var picks = []; // [{tn, predictedRank, group}]
    Object.entries(gl || {}).forEach(function (e) {
      var g = e[0], arr = e[1];
      if (arr) arr.forEach(function (tn, i) { if (i < 2 && tn) picks.push({ tn: tn, predictedRank: i, group: g }); });
    });
    picks.forEach(function (p) {
      var tn = p.tn;
      var t = ft(tn); if (!t) return;
      var b = bsc(t.o);
      var dk = (des && des.A === tn) ? "A" : (des && des.B === tn) ? "B" : (des && des.C === tn) ? "C" : null;
      var dm = dk ? DES[dk].m : 1;
      var pts = 0, stg = [];
      Object.entries(SM).forEach(function (e) {
        var k = e[0], v = e[1];
        if (k === "champ") { if (ko && ko.champ === tn) { pts += b * v; stg.push("👑"); } }
        else if (k === "third") { if (ko && ko.third === tn) { pts += b * v; stg.push("🥉"); } }
        else { if (ko && ko[k] && ko[k].indexOf(tn) >= 0) { pts += b * v; stg.push(SL[k]); } }
      });
      var fp = pts * dm;
      if (dk && ko && ko.final && ko.final.indexOf(tn) >= 0) fp *= DES[dk].fb;
      if (dk && ko && ko.champ === tn) fp *= DES[dk].cb;
      // 順位的中ボーナス（実グループ順位が確定している場合のみ）
      var rankBonus = 1;
      var grpStandings = groups && groups[p.group];
      if (grpStandings && grpStandings.length > 0) {
        var actualIdx = grpStandings.findIndex(function (r) { return r && r.n === tn; });
        // そのグループが1試合でも消化している場合のみ順位ボーナス（試合前は無効）
        var grpPlayed = grpStandings.some(function (r) { return (r.mp || 0) > 0; });
        if (grpPlayed && actualIdx === p.predictedRank && actualIdx <= 1) {
          rankBonus = RANK_BONUS[actualIdx];
        }
      }
      // ボーナスは「グループステージで進出した分」にも適用するため、
      // グループ通過(R32)した時点で発動 (ベース × R32倍率) にも乗る
      // ここでは fp 全体に乗算
      fp *= rankBonus;
      if (fp > 0) bd.push({ tn: tn, b: b, dk: dk, pts: Math.round(fp * 100) / 100, stg: stg, rankBonus: rankBonus });
      total += fp;
    });
    return { total: Math.round(total * 100) / 100, bd: bd.sort(function (a, b) { return b.pts - a.pts; }) };
  } catch (e) { return { total: 0, bd: [] }; }
}
// 試合の重複排除: id優先、無ければチーム名の組(順不同)をキーに1件へ正規化。
// 優先順位: スコア確定 > 手動(manual) > 先着。home/away逆順の重複も1試合に畳む。
// キー: 同一ステージ(グループ=G / 各KOラウンド=K{round})× チーム名の組(順不同)。
// idの有無やhome/away順、手動/APIの差に依存せず同一カードを1件に畳む（同組は1試合のみ前提）。
function matchKey(m) { var bucket = (m.round && m.round > 3) ? ("K" + m.round) : "G"; return bucket + ":" + [m.home, m.away].slice().sort().join("|"); }
function dedupeMatches(matches) {
  var uniq = {};
  (matches || []).forEach(function (m) {
    if (!m || !m.home || !m.away) return;
    var k = matchKey(m), ex = uniq[k];
    if (!ex) { uniq[k] = m; return; }
    var mS = m.hs != null && m.as != null, eS = ex.hs != null && ex.as != null;
    if (mS && !eS) uniq[k] = m;                                 // スコアありを優先
    else if (mS === eS && m.manual && !ex.manual) uniq[k] = m;  // 同条件なら手動を優先
  });
  return Object.keys(uniq).map(function (k) { return uniq[k]; });
}
// 試合リスト（round<=3 の終了試合）からグループ星取表を計算
function computeGroups(matches, teamCards) {
  var groups = {};
  Object.keys(GRP).forEach(function (g) { groups[g] = GRP[g].map(function (t) { return { n: t.n, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, yc: 0, rc: 0, fp: 0 }; }); });
  var find = function (g, n) { return groups[g].find(function (t) { return t.n === n; }); };
  // 同一カードの二重計上を防止: id優先、無ければチーム名の組(順不同)で1件に正規化。
  // (手動入力とAPIがhome/away逆順で重複登録されても1試合として数える)
  var uniq = dedupeMatches(matches);
  uniq.forEach(function (m) {
    if ((m.round && m.round > 3) || m.hs == null || m.as == null) return;
    var g = TEAM_GRP[m.home]; if (!g || TEAM_GRP[m.away] !== g) return;
    var H = find(g, m.home), A = find(g, m.away); if (!H || !A) return;
    H.mp++; A.mp++; H.gf += m.hs; H.ga += m.as; A.gf += m.as; A.ga += m.hs;
    if (m.hs > m.as) { H.w++; A.l++; H.pts += 3; } else if (m.hs < m.as) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
    // フェアプレー: 試合に紐づくカード数を集計（手動再計算でも消えない）
    if (m.cards) { H.yc += m.cards.hy || 0; H.rc += m.cards.hr || 0; A.yc += m.cards.ay || 0; A.rc += m.cards.ar || 0; }
  });
  // チーム別カードの手動上書き（管理画面で累計枚数を直接編集）。APIより優先。
  if (teamCards) Object.keys(groups).forEach(function (g) { groups[g].forEach(function (t) { var o = teamCards[t.n]; if (o) { t.yc = Number(o.yc) || 0; t.rc = Number(o.rc) || 0; } }); });
  Object.keys(groups).forEach(function (g) { groups[g].forEach(function (t) { t.fp = -(t.yc + t.rc * 4); }); });
  Object.keys(groups).forEach(function (g) { groups[g].sort(function (a, b) { return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.fp - a.fp || (FIFA_RANK[a.n] || 999) - (FIFA_RANK[b.n] || 999); }); });
  return groups;
}

// 暫定ノックアウト: 実際の勝ち上がりが無ければ、試合消化済みグループの上位2を暫定R32とみなす
// koのブラケット配列を浅いコピー（シミュレーション初期化用）
function koCopy(k) { k = k || {}; return { r32: (k.r32 || []).slice(), r16: (k.r16 || []).slice(), qf: (k.qf || []).slice(), sf: (k.sf || []).slice(), final: (k.final || []).slice(), champ: k.champ || null, third: k.third || null }; }
function provisionalKo(tour) {
  var ko = (tour && tour.ko) || { r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null };
  var hasKO = (ko.r32 && ko.r32.length) || (ko.r16 && ko.r16.length) || (ko.qf && ko.qf.length) || (ko.sf && ko.sf.length) || (ko.final && ko.final.length) || ko.champ || ko.third;
  if (hasKO) return ko; // 実ノックアウトがあればそれを使う
  var groups = (tour && tour.groups) || {};
  var r32 = [];
  Object.keys(groups).forEach(function (g) {
    var arr = groups[g] || [];
    var played = arr.some(function (t) { return (t.mp || 0) > 0; });
    if (!played) return; // 試合前グループは暫定順位を出さない
    arr.slice(0, 2).forEach(function (t) { if (t && t.n) r32.push(t.n); });
  });
  return { r32: r32, r16: [], qf: [], sf: [], final: [], champ: null, third: null, matches: ko.matches };
}

// 投票傾向の判定（ガチガチ / バランス型 / 大穴狙い）
function votingStyle(gl, des) {
  try {
    var idxSum = 0, cnt = 0;
    Object.keys(gl || {}).forEach(function (g) {
      var arr = gl[g] || [];
      var sorted = (GRP[g] || []).slice().sort(function (a, b) { return a.o - b.o; });
      arr.slice(0, 2).forEach(function (tn) {
        var idx = sorted.findIndex(function (t) { return t.n === tn; });
        if (idx >= 0) { idxSum += idx; cnt++; }
      });
    });
    if (cnt === 0) return null;
    var avgIdx = idxSum / cnt;
    var oo = ["A", "B", "C"].map(function (k) { return des && des[k] ? des[k] : null; }).filter(Boolean).map(function (n) { var t = ft(n); return t ? t.o : 80; });
    var avgOshi = oo.length ? oo.reduce(function (a, b) { return a + b; }, 0) / oo.length : 80;
    // グループ予想の穴度(avgIdx 0〜3)を従、推し平均オッズ(対数)を主に合成
    var score = avgIdx * 0.6 + Math.log10(Math.max(avgOshi, 2));
    if (score <= 1.5) return { k: "gachi", l: "ガチガチ", emoji: "🏰", cl: $.goldL, bg: "rgba(251,191,36,.16)", bd: $.gold };
    if (score >= 2.5) return { k: "ana", l: "大穴狙い", emoji: "🔥", cl: $.redL, bg: "rgba(248,113,113,.16)", bd: $.red };
    return { k: "bal", l: "バランス型", emoji: "⚖️", cl: $.blueL, bg: "rgba(96,165,250,.16)", bd: $.blue };
  } catch (e) { return null; }
}

function deriveRounds(r32,ko){var empty={r16:[{t1:null,t2:null},{t1:null,t2:null},{t1:null,t2:null},{t1:null,t2:null}],qf:[{t1:null,t2:null},{t1:null,t2:null}]};try{if(!r32||r32.length<8||!ko)return empty;var r16=[];var koR32=ko.r32||[];for(var i=0;i<8;i+=2){var m1=r32[i],m2=r32[i+1];var t1s=(m1&&m1.teams||[]).filter(function(t){return t&&t.n&&!t.tbd;});var t2s=(m2&&m2.teams||[]).filter(function(t){return t&&t.n&&!t.tbd;});r16.push({t1:t1s.find(function(t){return koR32.indexOf(t.n)>=0;})||null,t2:t2s.find(function(t){return koR32.indexOf(t.n)>=0;})||null});}var qf=[];var koR16=ko.r16||[];for(var j=0;j<4;j+=2){var a=[r16[j].t1,r16[j].t2].filter(function(x){return x&&x.n;});var b=[r16[j+1].t1,r16[j+1].t2].filter(function(x){return x&&x.n;});qf.push({t1:a.find(function(t){return koR16.indexOf(t.n)>=0;})||null,t2:b.find(function(t){return koR16.indexOf(t.n)>=0;})||null});}return{r16:r16,qf:qf};}catch(e){return empty;}}

// 実大会データ → ブラケット表示用 gl/tp を派生
function deriveGlFromTour(groups) {
  var gl = {};
  Object.keys(GRP).forEach(function (g) {
    var arr = groups && groups[g];
    if (arr && arr.length > 0) gl[g] = arr.map(function (r) { return r.n; });
  });
  return gl;
}
function deriveTpFromTour(ko, groups) {
  var tp = {};
  var r32 = (ko && ko.r32) || [];
  var allSeeds = [].concat(LR32.flatMap(function (m) { return m.s; }), RR32.flatMap(function (m) { return m.s; })).filter(function (s) { return s && s.startsWith("3("); });
  var used = {};
  allSeeds.forEach(function (seed) {
    var cands = seed.match(/[A-L]/g) || [];
    for (var i = 0; i < cands.length; i++) {
      var stand = groups && groups[cands[i]];
      if (stand && stand.length >= 3) {
        var third = stand[2].n;
        if (r32.indexOf(third) >= 0 && !used[third]) { tp[seed] = third; used[third] = true; break; }
      }
    }
  });
  return tp;
}

// 各グループ3位の成績ランキング（勝点→得失点差→総得点→FIFAランク代用=オッズ昇順）。上位8が進出。
function thirdPlaceRanking(groups) {
  var thirds = [];
  var gcmp = function (a, b) { return (b.pts || 0) - (a.pts || 0) || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) || (b.gf || 0) - (a.gf || 0) || ((b.fp != null ? b.fp : -((b.yc || 0) + (b.rc || 0) * 4)) - (a.fp != null ? a.fp : -((a.yc || 0) + (a.rc || 0) * 4))) || (FIFA_RANK[a.n] || 999) - (FIFA_RANK[b.n] || 999); };
  Object.keys(GRP).forEach(function (g) {
    var arr0 = groups && groups[g];
    if (arr0 && arr0.length >= 3) {
      // stored順に依存せず、グループ内を確実にソートして3位を確定
      var arr = arr0.slice().sort(gcmp);
      var t = arr[2], team = ft(t.n);
      thirds.push({ n: t.n, grp: g, mp: t.mp || 0, pts: t.pts || 0, gd: (t.gf || 0) - (t.ga || 0), gf: t.gf || 0, yc: t.yc || 0, rc: t.rc || 0, fp: (t.fp != null ? t.fp : -((t.yc || 0) + (t.rc || 0) * 4)), fifa: FIFA_RANK[t.n] || 999, o: team ? team.o : 1000 });
    }
  });
  // 勝点→得失点差→総得点→フェアプレー(高い順)→FIFAランク(昇順)
  thirds.sort(function (a, b) { return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.fp - a.fp || a.fifa - b.fifa; });
  thirds.forEach(function (t, i) { t.rank = i + 1; t.top8 = i < 8; });
  return thirds;
}
// 予想の的中判定（そのグループの全試合が確定したときのみ色分け）。
// exact=順位的中 / advance=通過的中(順位違い) / third=3位通過 / out=予選敗退 / null=未確定
function predOutcome(grp, team, predPos, groups, thirdSet) {
  if (!team) return null;
  var arr = (groups && groups[grp]) || [];
  if (arr.length < 4 || !arr.every(function (t) { return (t.mp || 0) >= 3; })) return null; // 順位未確定
  var actualIdx = arr.findIndex(function (t) { return t.n === team; });
  if (actualIdx < 0) return null;
  if (actualIdx === predPos) return "exact";        // 予想順位どおり
  if (actualIdx <= 1) return "advance";             // 1・2位通過（予想順位は違う）
  if (actualIdx === 2 && thirdSet && thirdSet.has(team)) return "third"; // 3位だが上位8で通過
  return "out";                                     // 予選敗退
}
var OUTCOME = {
  exact:   { bg: "rgba(245,197,24,.22)",  c: $.gold,    l: "順位的中" },
  advance: { bg: "rgba(34,197,94,.18)",   c: $.pitchL,  l: "通過的中" },
  third:   { bg: "rgba(232,161,58,.20)",  c: "#e8a13a", l: "3位通過" },
  out:     { bg: "rgba(248,113,113,.14)", c: $.redL,    l: "予選敗退" },
};
function thirdSetOf(groups) { return new Set(thirdPlaceRanking(groups).filter(function (t) { return t.top8; }).map(function (t) { return t.n; })); }
// 上位8グループの3位を FIFA公式割当表(TP_ALLOC, 495通り)で R32 の「3(...)」枠に割当。
// 候補集合だけでは6〜72通りに分岐するため、二部マッチングでなく公式表を引く必要がある。
function deriveTpProvisional(groups) {
  var top8 = thirdPlaceRanking(groups).filter(function (t) { return t.top8; });
  if (top8.length < 8) return {}; // 12グループ分の3位が出揃うまでは未確定（枠は「A or B…」表示のまま）
  var byGroup = {}; top8.forEach(function (t) { byGroup[t.grp] = t.n; });
  var key = top8.map(function (t) { return t.grp; }).sort().join(""); // 進出8グループ(昇順)
  var asg = TP_ALLOC[key]; if (!asg) return {};
  var tp = {};
  for (var i = 0; i < TP_SLOTS.length; i++) { var g = asg[i]; if (byGroup[g]) tp[TP_SLOTS[i]] = byGroup[g]; }
  return tp;
}

// 実データから R32 を解決（左右16ずつ）。ブラケット最適化とトーナメント表で共用。
function resolveLiveR32(tour) {
  var groups = (tour && tour.groups) || {}, ko = (tour && tour.ko) || {};
  var gl = deriveGlFromTour(groups);
  var tp = (ko.r32 && ko.r32.length) ? deriveTpFromTour(ko, groups) : deriveTpProvisional(groups);
  var mk = function (arr) { return arr.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s) { return resolveSeed(s, gl, tp); }) }; }); };
  return { leftRes: mk(LR32), rightRes: mk(RR32) };
}

// あるメンバーが「最高/最低ポイント」になる決勝T結果(simKo)を木DPで算出。
// 各チームが進んだラウンドでの得点(calcScore準拠/R32定数分は最適化に無関係なので省略)を、
// 単純トーナメント木上で最大化(または最小化)する。
function optimizeBracket(member, leftRes, rightRes, groups, maximize) {
  try {
    var teams = [];
    (leftRes || []).forEach(function (m) { (m.teams || []).forEach(function (t) { teams.push(t); }); });
    (rightRes || []).forEach(function (m) { (m.teams || []).forEach(function (t) { teams.push(t); }); });
    if (teams.length !== 32) return null;
    // メンバーの予想(gl上位2)の得点情報
    var info = {};
    Object.keys(member.gl || {}).forEach(function (g) {
      ((member.gl[g]) || []).slice(0, 2).forEach(function (tn, i) {
        if (!tn) return; var t = ft(tn); if (!t) return;
        var dk = (member.des && member.des.A === tn) ? "A" : (member.des && member.des.B === tn) ? "B" : (member.des && member.des.C === tn) ? "C" : null;
        var rb = 1, st = groups && groups[g];
        if (st && st.length) { var ai = st.findIndex(function (r) { return r && r.n === tn; }); var played = st.some(function (r) { return (r.mp || 0) > 0; }); if (played && ai === i && ai <= 1) rb = RANK_BONUS[ai]; }
        info[tn] = { b: bsc(t.o), dm: dk ? DES[dk].m : 1, dk: dk, rb: rb };
      });
    });
    // level: 0=R32敗退,1=R16到達,2=QF,3=SF,4=決勝(準優勝),5=優勝。R32(.2)は定数のため省略。
    function pscore(t, level, isThird) {
      var pi = t && info[t.n]; if (!pi) return 0;
      var sum = (level >= 1 ? SM.r16 : 0) + (level >= 2 ? SM.qf : 0) + (level >= 3 ? SM.sf : 0) + (level >= 4 ? SM.final : 0) + (level >= 5 ? SM.champ : 0) + (isThird ? SM.third : 0);
      var fp = pi.b * sum * pi.dm;
      if (pi.dk && level >= 4) fp *= DES[pi.dk].fb;
      if (pi.dk && level >= 5) fp *= DES[pi.dk].cb;
      return fp * pi.rb;
    }
    var better = maximize ? function (a, b) { return a > b; } : function (a, b) { return a < b; };
    var loserLevel = { 4: 1, 8: 2, 16: 3, 32: 4 }; // node size → 敗者の到達level
    function dp(lo, hi) {
      var size = hi - lo;
      if (size === 2) { var s = {}; s[lo] = pscore(teams[lo + 1], 0, false); s[lo + 1] = pscore(teams[lo], 0, false); return { score: s, winners: [lo, lo + 1], size: 2 }; }
      var mid = (lo + hi) / 2, L = dp(lo, mid), R = dp(mid, hi), ll = loserLevel[size];
      function bestLoser(sub) { var bi = null, bv = null; sub.winners.forEach(function (x) { var v = sub.score[x] + pscore(teams[x], ll, false); if (bv === null || better(v, bv)) { bv = v; bi = x; } }); return { idx: bi, val: bv }; }
      var fromR = bestLoser(R), fromL = bestLoser(L), s = {}, choice = {};
      L.winners.forEach(function (w) { s[w] = L.score[w] + fromR.val; choice[w] = { loser: fromR.idx, side: "L" }; });
      R.winners.forEach(function (w) { s[w] = R.score[w] + fromL.val; choice[w] = { loser: fromL.idx, side: "R" }; });
      return { score: s, winners: L.winners.concat(R.winners), choice: choice, L: L, R: R, size: size };
    }
    var root = dp(0, 32), champ = null, cv = null;
    root.winners.forEach(function (w) { var v = root.score[w] + pscore(teams[w], 5, false); if (cv === null || better(v, cv)) { cv = v; champ = w; } });
    var winBySize = { 2: [], 4: [], 8: [], 16: [], 32: [] }, sfLosers = [];
    (function rec(node, w) {
      winBySize[node.size].push(w);
      if (node.size === 2) return;
      var ch = node.choice[w], loser = ch.loser;
      if (node.size === 16) sfLosers.push(loser);
      if (ch.side === "L") { rec(node.L, w); rec(node.R, loser); } else { rec(node.R, w); rec(node.L, loser); }
    })(root, champ);
    var nm = function (i) { return teams[i] && teams[i].n; };
    var third = null;
    if (sfLosers.length) { var pk = null, pv = null; sfLosers.forEach(function (i) { var v = pscore(teams[i], 3, true) - pscore(teams[i], 3, false); if (pv === null || better(v, pv)) { pv = v; pk = i; } }); third = nm(pk); }
    var sf = winBySize[16].map(nm).filter(Boolean);
    return { r32: winBySize[2].map(nm).filter(Boolean), r16: winBySize[4].map(nm).filter(Boolean), qf: winBySize[8].map(nm).filter(Boolean), sf: sf, final: sf.slice(), champ: nm(champ), third: third };
  } catch (e) { return null; }
}

function shuffle(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}return a;}
function generateRandom(mode){var gl2={};Object.keys(GRP).forEach(function(g){var teams=GRP[g].slice();teams.sort(function(a,b){return a.o-b.o;});if(mode==="safe"){var second=shuffle(teams.slice(1,3))[0];gl2[g]=[teams[0].n,second.n];}else if(mode==="upset"){var weak=shuffle(teams.slice(1));gl2[g]=[weak[0].n,weak[1].n];}else{var rest=shuffle(teams.slice(1));gl2[g]=[teams[0].n,rest[0].n];}});var pool=[];Object.values(gl2).forEach(function(a){a.forEach(function(n){var t=ft(n);if(t)pool.push(t);});});var des2={A:null,B:null,C:null};if(pool.length>=3){pool.sort(function(a,b){return a.o-b.o;});var n=pool.length,picks;if(mode==="upset"){var hi=pool.slice(Math.floor(n/2));picks=shuffle(hi).slice(0,3);}else if(mode==="safe"){var lo=pool.slice(0,Math.max(6,Math.ceil(n/2)));picks=shuffle(lo).slice(0,3);}else{picks=shuffle(pool).slice(0,3);}des2.A=(picks[0]||{}).n||null;des2.B=(picks[1]||{}).n||null;des2.C=(picks[2]||{}).n||null;}return{gl:gl2,des:des2};}

// ═══════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════
export default function App() {
  var [tab, setTab] = useState("results");
  var [nm, setNm] = useState(myNameStore.get() || "");
  var [entered, setEntered] = useState(true); // ゲート廃止: 開いたら即表示（名前は任意）
  var [gl, setGl] = useState({});
  var [des, setDesS] = useState({ A: null, B: null, C: null });
  var [tp, setTp] = useState({});
  var [ko, setKo] = useState({ r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null });
  var [ag, setAg] = useState(null);
  var [saveStatus, setSaveStatus] = useState("idle"); // idle|saving|saved|error
  var [savedAt, setSavedAt] = useState(null);
  var [loading, setLoading] = useState(false);
  var [enterErr, setEnterErr] = useState("");
  var [tour, setTour] = useState({ phase: "pre", groups: {}, ko: { r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null }, vote_locked: false }); // 実結果
  var [adminOpen, setAdminOpen] = useState(false);
  var [rulesOpen, setRulesOpen] = useState(false);

  var gk = Object.keys(GRP);
  var allSorted = useMemo(function () { return AT.slice().sort(function (a, b) { return a.o - b.o; }); }, []); // 優勝オッズ昇順（本命→大穴）
  var glComplete = useMemo(function () { return gk.every(function (g) { return (gl[g] || []).length >= 2; }); }, [gl, gk]);
  // 実結果が空ならシミュレーション用の自分のkoを、開始後は実結果を使う
  var liveStarted = useMemo(function () {
    var k = tour && tour.ko;
    if (!k) return false;
    return (k.r32 && k.r32.length) || (k.r16 && k.r16.length) || (k.qf && k.qf.length) || (k.sf && k.sf.length) || (k.final && k.final.length) || k.champ || k.third;
  }, [tour]);
  // 暫定順位込みのko（グループ戦中も暫定ポイントを反映）
  var scoreGroups = (tour && tour.groups) || {};

  var setDes = useCallback(function (tier, tn) {
    setDesS(function (p) { var n = { A: p.A, B: p.B, C: p.C }; if (n.A === tn) n.A = null; if (n.B === tn) n.B = null; if (n.C === tn) n.C = null; n[tier] = p[tier] === tn ? null : tn; return n; });
  }, []);
  var rankTeam = useCallback(function (g, tn) {
    setGl(function (p) { var cur = (p[g] || []).slice(); var idx = cur.indexOf(tn); return Object.assign({}, p, { [g]: idx >= 0 ? cur.slice(0, idx) : cur.concat(tn) }); });
  }, []);
  var pick3 = useCallback(function (seed, tn) {
    setTp(function (p) { return Object.assign({}, p, { [seed]: p[seed] === tn ? null : tn }); });
  }, []);
  var adv = useCallback(function (stage, tn) { if (!tn) return; setKo(function (prev) { try { var n = { r32: prev.r32.slice(), r16: prev.r16.slice(), qf: prev.qf.slice(), sf: prev.sf.slice(), final: prev.final.slice(), champ: prev.champ, third: prev.third }; if (stage === "champ" || stage === "third") { n[stage] = n[stage] === tn ? null : tn; return n; } var idx = n[stage].indexOf(tn); if (idx >= 0) { n[stage] = n[stage].filter(function (t) { return t !== tn; }); ["r32", "r16", "qf", "sf", "final"].forEach(function (s, si, arr) { if (si > arr.indexOf(stage)) n[s] = n[s].filter(function (t) { return t !== tn; }); }); if (n.champ === tn) n.champ = null; if (n.third === tn) n.third = null; } else { n[stage] = n[stage].concat(tn); } return n; } catch (e) { return prev; } }); }, []);
  var applyRandom = function (mode) { var r = generateRandom(mode); setGl(r.gl); setDesS(r.des); setKo({ r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null }); setTp({}); };

  // ── 決勝トーナメント・シミュレーション（端末ローカル。国名クリックで勝ち上がり、ランキングに反映） ──
  var [simKo, setSimKo] = useState({ r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null });
  var [simTouched, setSimTouched] = useState(false);
  // 未操作なら実結果(tour.ko)で初期化／追従。操作開始後はユーザーの手で固定。
  useEffect(function () { if (!simTouched) setSimKo(koCopy(tour && tour.ko)); }, [tour, simTouched]);
  var simAdv = useCallback(function (stage, tn) { if (!tn) return; setSimTouched(true); setSimKo(function (prev) { try { var n = { r32: prev.r32.slice(), r16: prev.r16.slice(), qf: prev.qf.slice(), sf: prev.sf.slice(), final: prev.final.slice(), champ: prev.champ, third: prev.third }; if (stage === "champ" || stage === "third") { n[stage] = n[stage] === tn ? null : tn; return n; } var idx = n[stage].indexOf(tn); if (idx >= 0) { n[stage] = n[stage].filter(function (t) { return t !== tn; }); ["r32", "r16", "qf", "sf", "final"].forEach(function (s, si, arr) { if (si > arr.indexOf(stage)) n[s] = n[s].filter(function (t) { return t !== tn; }); }); if (n.champ === tn) n.champ = null; if (n.third === tn) n.third = null; } else { n[stage] = n[stage].concat(tn); } return n; } catch (e) { return prev; } }); }, []);
  var resetSim = useCallback(function () { setSimKo(koCopy(tour && tour.ko)); setSimTouched(false); }, [tour]);
  var applySim = useCallback(function (ko) { if (!ko) return; setSimKo(koCopy(ko)); setSimTouched(true); }, []); // 最高/最低ポイントの試算結果を一括反映
  // シミュレーション結果をスコア用ko(到達ステージ意味)へ変換。ブラケットのko[stage]=「そのラウンドの勝者」なので1段ずらす。
  var simScoringKo = useMemo(function () {
    var groups = (tour && tour.groups) || {}, part = [];
    Object.keys(groups).forEach(function (g) { var arr = groups[g] || []; if (arr.some(function (t) { return (t.mp || 0) > 0; })) arr.slice(0, 2).forEach(function (t) { if (t && t.n) part.push(t.n); }); });
    return { r32: part, r16: simKo.r32 || [], qf: simKo.r16 || [], sf: simKo.qf || [], final: simKo.sf || [], champ: simKo.champ || null, third: simKo.third || null };
  }, [tour, simKo]);
  // 自分のスコア（ヘッダー表示）もシミュレーションを反映（ランキングと整合）
  var score = useMemo(function () { try { return glComplete ? calcScore(gl, des, simScoringKo, scoreGroups) : null; } catch (e) { return null; } }, [gl, des, simScoringKo, scoreGroups, glComplete]);

  var leftRes = useMemo(function () { try { return LR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s2) { return resolveSeed(s2, gl, tp); }) }; }); } catch (e) { return []; } }, [gl, tp]);
  var rightRes = useMemo(function () { try { return RR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s2) { return resolveSeed(s2, gl, tp); }) }; }); } catch (e) { return []; } }, [gl, tp]);
  var leftD = useMemo(function () { return deriveRounds(leftRes, ko); }, [leftRes, ko]);
  var rightD = useMemo(function () { return deriveRounds(rightRes, ko); }, [rightRes, ko]);
  var ctx = { ko: ko, des: des, adv: adv, gl: gl, tp: tp, pick3: pick3, setAg: setAg };
  // 国名 → 直近試合（予想画面の国名横に「vs相手 1-0」表示用）
  var fxByTeam = useMemo(function () {
    var map = {};
    ((tour && tour.friendlies) || []).forEach(function (m) {
      if (m.home && map[m.home] === undefined) map[m.home] = { opp: m.away, gf: m.hs, ga: m.as, date: m.date, ha: "H" };
      if (m.away && map[m.away] === undefined) map[m.away] = { opp: m.home, gf: m.as, ga: m.hs, date: m.date, ha: "A" };
    });
    return map;
  }, [tour]);

  // ──────────────────────────────────────────────────────
  // Enter / Save / Load
  // ──────────────────────────────────────────────────────
  async function enterName() {
    var t = (nm || "").trim();
    if (!t) { setEnterErr("名前を入力してください"); return; }
    setEnterErr("");
    setLoading(true);
    try {
      var existing = await getPredictionByName(t);
      if (existing) {
        setGl(existing.gl || {});
        setDesS(existing.des || { A: null, B: null, C: null });
        setTp(existing.tp || {});
      }
      myNameStore.set(t);
      setEntered(true);
    } catch (e) {
      setEnterErr("読込エラー: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  }
  async function saveNow() {
    var t = (nm || "").trim();
    if (!t) { alert("名前を入力してください"); return; }
    setSaveStatus("saving");
    try {
      await savePrediction({ name: t, gl: gl, des: des, tp: tp });
      setSaveStatus("saved");
      setSavedAt(new Date());
      setTimeout(function () { setSaveStatus(function (s) { return s === "saved" ? "idle" : s; }); }, 2400);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  }
  function logout() {
    myNameStore.clear();
    setEntered(false);
    setNm("");
    setGl({});
    setDesS({ A: null, B: null, C: null });
    setTp({});
    setKo({ r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null });
  }

  // Auto-enter if name already in localStorage
  useEffect(function () {
    var saved = myNameStore.get();
    if (saved) {
      setNm(saved);
      // wait one tick then auto-enter
      (async function () {
        try {
          var existing = await getPredictionByName(saved);
          if (existing) {
            setGl(existing.gl || {});
            setDesS(existing.des || { A: null, B: null, C: null });
            setTp(existing.tp || {});
          }
          setEntered(true);
        } catch (e) { /* ignore */ }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load + subscribe tournament (live actual results)
  useEffect(function () {
    var live = true;
    function load() {
      getTournament()
        .then(function (t) { if (live && t) setTour(t); })
        .catch(function () { /* ignore */ });
    }
    load();
    var unsub = subscribeTournament(load);
    return function () { live = false; if (unsub) unsub(); };
  }, []);

  // ページアクセスログ
  useEffect(function () {
    try {
      logVisit({
        name: myNameStore.get() || null,
        path: window.location.pathname + window.location.hash,
        ua: navigator.userAgent,
      });
    } catch (e) { /* ignore */ }
  }, []);

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────
  if (!entered) {
    return <Gate nm={nm} setNm={setNm} enter={enterName} loading={loading} err={enterErr} />;
  }

  return (
    <div>
      <Styles />
      <div style={{ fontFamily: font, background: $.bg, color: $.txt, minHeight: "100vh", paddingBottom: 100 }}>
        <div style={{ position: "fixed", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle at 1px 1px,white 1px,transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <Header tab={tab} setTab={setTab} nm={nm} score={score} logout={logout} tour={tour} openAdmin={function () { setAdminOpen(true); }} openRules={function () { setRulesOpen(true); }} />
        <main className="main-pad" style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 16px" }}>
          {tab === "vote" && (
            <VoteTab
              gl={gl} des={des} ko={ko} tp={tp} ag={ag} setAg={setAg}
              rankTeam={rankTeam} setDes={setDes} applyRandom={applyRandom}
              allSorted={allSorted} gk={gk} glComplete={glComplete}
              leftRes={leftRes} rightRes={rightRes} leftD={leftD} rightD={rightD}
              adv={adv} ctx={ctx} score={score} tour={tour} liveStarted={liveStarted} fxByTeam={fxByTeam}
            />
          )}
          {tab === "results" && <ResultsTab myName={nm} tour={tour} liveStarted={liveStarted} scoringKo={simScoringKo} simActive={simTouched} simKo={simKo} simAdv={simAdv} resetSim={resetSim} applySim={applySim} />}
          {tab === "live" && <LiveTab tour={tour} liveStarted={liveStarted} />}
          {adminOpen && <AdminPanel tour={tour} setTour={setTour} close={function () { setAdminOpen(false); }} />}
          {rulesOpen && (
            <div onClick={function () { setRulesOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto", backdropFilter: "blur(4px)" }}>
              <div onClick={function (e) { e.stopPropagation(); }} className="fade-in" style={{ width: "100%", maxWidth: 560, background: "linear-gradient(135deg,#1f3f6f,#15294a)", border: "2px solid " + $.gold + "60", borderRadius: 14, padding: 20, marginTop: 24, marginBottom: 24, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: fontH, fontSize: 20, color: $.gold, letterSpacing: 2 }}>📖 遊び方とルール</div>
                  <button onClick={function () { setRulesOpen(false); }} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, background: "transparent", border: "1px solid " + $.border, color: $.txt2, cursor: "pointer" }}>閉じる</button>
                </div>
                <RulesBody />
              </div>
            </div>
          )}
        </main>
        {tab === "vote" && <SaveBar saveStatus={saveStatus} savedAt={savedAt} saveNow={saveNow} glComplete={glComplete} score={score} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Gate (name entry screen)
// ═══════════════════════════════════════════════════════════
function Gate({ nm, setNm, enter, loading, err }) {
  return (
    <div>
      <Styles />
      <div style={{ minHeight: "100vh", background: $.bg, color: $.txt, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "radial-gradient(circle at 1px 1px,white 1px,transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -120, right: -120, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle," + $.gold + "30,transparent 60%)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", bottom: -120, left: -120, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle," + $.blue + "30,transparent 60%)", filter: "blur(10px)" }} />
        <div className="fade-in" style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 2 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 16, background: "linear-gradient(135deg," + $.gold + "," + $.goldD + ")", boxShadow: $.glow, fontSize: 38, marginBottom: 14, animation: "pulse 3s ease-in-out infinite" }}>⚽</div>
            <div style={{ fontFamily: fontH, fontSize: 13, letterSpacing: 3, color: $.gold, marginBottom: 4 }}>ROAD to 三幸園　2026.07.21</div>
            <div style={{ fontFamily: fontH, fontSize: 30, letterSpacing: 3 }}>FIFA WORLD CUP 2026</div>
          </div>
          <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))", border: "1px solid " + $.border, borderRadius: 16, padding: 28, backdropFilter: "blur(8px)", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
            <div style={{ fontFamily: fontH, fontSize: 12, letterSpacing: 4, color: $.gold, marginBottom: 6 }}>YOUR NAME</div>
            <input
              value={nm}
              onChange={function (e) { setNm(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter") enter(); }}
              placeholder="例: IZUMI"
              autoFocus
              style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: "1.5px solid " + $.border, background: "rgba(0,0,0,.25)", color: $.txt, fontSize: 16, fontFamily: font, outline: "none", boxSizing: "border-box", letterSpacing: 1 }}
            />
            <div style={{ fontSize: 11, color: $.dim, marginTop: 8, lineHeight: 1.6 }}>
              同じ名前で再訪すると予想の続きから編集できます。<br />
              {hasSupabase ? "✓ Supabase接続中（みんなで共有）" : "⚠ ローカル保存モード（端末内のみ）"}
            </div>
            {err && <div style={{ color: $.redL, fontSize: 12, marginTop: 10 }}>{err}</div>}
            <button
              onClick={enter}
              disabled={loading}
              style={{ width: "100%", marginTop: 18, padding: "14px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg," + $.gold + "," + $.goldD + ")", color: "#000", fontSize: 15, fontFamily: fontH, fontWeight: 700, letterSpacing: 4, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, boxShadow: loading ? "none" : $.glowS, transition: "all .2s" }}
            >
              {loading ? "LOADING..." : "▶ KICK OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════
var PHASE_LABEL = { pre: "開幕前", groups: "グループステージ", r32: "ベスト32", r16: "ベスト16", qf: "準々決勝", sf: "準決勝", final: "決勝", done: "閉幕" };

// ルール説明の本文（ヘッダーの📖から開くモーダルで使用）
function RulesBody() {
  return (
    <div style={{ fontSize: 12, color: $.txt, lineHeight: 1.7 }}>
      <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "linear-gradient(135deg,rgba(251,191,36,.18),rgba(251,191,36,.04))", border: "1px solid " + $.gold + "70" }}>
        <div style={{ fontFamily: fontH, fontSize: 14, letterSpacing: 2, color: $.gold, marginBottom: 6 }}>🔥 ざっくり言うと</div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          各自が事前に予想した「グループ1・2位」と「推し3チーム」が、<strong style={{ color: $.gold }}>勝ち上がるほど得点</strong>。大穴ほど高得点。最終的に合計点で競います。
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <strong style={{ color: $.gold }}>① ポイント計算</strong><br />
        <code style={{ background: "rgba(0,0,0,.3)", padding: "1px 6px", borderRadius: 3 }}>得点 = 基礎点 × ステージ倍率(累積) × 推し倍率 × 順位ボーナス（推しは決勝・優勝でさらにボーナス）</code><br />
        <span style={{ color: $.txt2 }}>基礎点</span> = オッズ調整値（大穴ほど高い）<br />
        <span style={{ color: $.txt2 }}>ステージ倍率（到達ごとに累積）</span><br />
        　ベスト32 <strong>×0.2</strong> ／ ベスト16 <strong>×3.0</strong> ／ ベスト8 <strong style={{ color: $.gold }}>×5.0(最高)</strong><br />
        　準決勝 ×2.5 ／ 決勝 ×3.0 ／ 優勝 ×4.0 ／ 3位 ×1.5<br />
        <span style={{ color: $.txt2 }}>推し倍率</span>: 1推し <strong>×2.5</strong> ／ 2推し ×1.8 ／ 3推し ×1.3（決勝・優勝でさらにボーナス）<br />
        <span style={{ color: $.pitchL, fontWeight: 700 }}>順位ボーナス</span>: グループ <strong style={{ color: $.gold }}>1位的中 ×1.5</strong> ／ <strong style={{ color: $.goldL }}>2位的中 ×1.25</strong>
      </div>
      <div style={{ marginBottom: 10 }}>
        <strong style={{ color: $.gold }}>② 得点の確認方法</strong><br />
        「📊 ランキング」で各プレイヤーをタップ → <strong>「📊 得点内訳」</strong>ボタンで、今の得点が<strong>どのチームの何で入ったか</strong>を1つずつ確認できます。
      </div>
      <div style={{ marginBottom: 10 }}>
        <strong style={{ color: $.gold }}>③ 戦略のコツ</strong><br />
        ・ベスト32は66%が通過するので配点低め<br />
        ・<strong>ベスト8到達予想が一番効く</strong>（×5.0）<br />
        ・<strong>1位を当てると更に×1.5</strong><br />
        ・大穴を「推し」に指定して当てるとスコアが跳ねる
      </div>
      <div style={{ paddingTop: 8, borderTop: "1px solid " + $.border, color: $.txt2, fontSize: 11 }}>
        <strong style={{ color: $.pitchL }}>📊 ランキング</strong>＝リアルタイム順位・各自の予想・決勝トーナメント表（勝ち上がりシミュレーション）／<strong style={{ color: $.pitchL }}>⚽ 途中経過</strong>＝グループ星取表・各組3位ランキング。試合結果が入るたび自動でスコア再計算されます。
      </div>
    </div>
  );
}

function Header({ tab, setTab, nm, score, logout, tour, openAdmin, openRules }) {
  var phase = (tour && tour.phase) || "pre";
  var phaseLabel = PHASE_LABEL[phase] || phase;
  return (
    <header style={{ background: "linear-gradient(180deg,rgba(5,7,13,.95),rgba(5,7,13,.78))", borderBottom: "1px solid " + $.border, padding: "0 20px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
      <div className="h-bar" style={{ maxWidth: 1440, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div className="h-logo-mark" style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg," + $.gold + "," + $.goldD + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: $.glow, flexShrink: 0 }}>⚽</div>
          <div style={{ minWidth: 0 }}>
            <div className="h-logo-sub" style={{ fontFamily: fontH, fontSize: 11, letterSpacing: 2, color: $.gold }}>ROAD to 三幸園　2026.07.21</div>
            <div className="h-logo-main" style={{ fontFamily: fontH, fontSize: 20, letterSpacing: 2 }}>FIFA WORLD CUP 2026</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div className="h-player-label" style={{ fontSize: 10, color: $.dim, letterSpacing: 1 }}>あなた</div>
            <div className="h-player-name" style={{ fontSize: 14, fontWeight: 700, color: $.txt, letterSpacing: 1 }}>{nm}</div>
          </div>
          {score && (
            <div style={{ textAlign: "right" }}>
              <div className="h-score-label" style={{ fontSize: 10, color: $.dim, letterSpacing: 1 }}>得点</div>
              <div className="pulse-glow h-score-val" style={{ fontFamily: fontH, fontSize: 26, color: $.gold, letterSpacing: 1, lineHeight: 1 }}>{score.total.toFixed(1)}</div>
            </div>
          )}
          <button onClick={openRules} title="ルール・遊び方" className="h-rules-btn" style={{ background: "rgba(251,191,36,.1)", border: "1px solid " + $.gold + "60", color: $.goldL, fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>📖 ルール</button>
          <button onClick={logout} title="名前を変更" className="h-rename-btn" style={{ background: "transparent", border: "1px solid " + $.border, color: $.dim, fontSize: 11, padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>名前変更</button>
          <button onClick={openAdmin} title="管理者" className="h-admin-btn" style={{ background: "transparent", border: "1px solid " + $.border, color: $.dim, fontSize: 14, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>⚙️</button>
        </div>
      </div>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div className="h-tab-row" style={{ display: "flex" }}>
        {[{ id: "results", l: "📊 ランキング" }, { id: "live", l: "⚽ 途中経過" }].map(function (t) {
          var act = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={function () { setTab(t.id); }}
              className="h-tab"
              style={{ fontSize: 13, padding: "10px 22px", cursor: "pointer", border: "none", borderBottom: act ? "2px solid " + $.gold : "2px solid transparent", background: "transparent", color: act ? $.gold : $.dim, transition: "color .2s", fontWeight: act ? 700 : 400, letterSpacing: 0.5 }}
            >
              {t.l}
            </button>
          );
        })}
        </div>
        <div className="h-phase" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: phase === "pre" ? $.dim : $.pitchL, padding: "0 10px 6px 0" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: phase === "pre" ? $.dim : $.pitchL, boxShadow: phase === "pre" ? "none" : "0 0 8px " + $.pitchL, animation: phase === "pre" ? "none" : "pulse 2s ease-in-out infinite", flexShrink: 0 }} />
          <span style={{ fontWeight: 700 }}>大会状況: {phaseLabel}</span>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════
// Vote Tab
// ═══════════════════════════════════════════════════════════
// 国名の直近試合を「vs 相手 1-0」の小タグで表示
function FxTag({ fx }) {
  if (!fx) return null;
  var res = (fx.gf == null || fx.ga == null) ? "" : (fx.gf > fx.ga ? "○" : fx.gf < fx.ga ? "●" : "△");
  var col = res === "○" ? $.pitchL : res === "●" ? $.redL : $.dim;
  return (
    <span title={"直近: vs " + fx.opp + " " + (fx.gf ?? "-") + "-" + (fx.ga ?? "-") + " (" + fx.date + ")"} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, color: $.dim, marginLeft: 6, whiteSpace: "nowrap" }}>
      {res && <span style={{ color: col, fontWeight: 700 }}>{res}</span>}
      <span style={{ opacity: 0.85 }}>vs {fx.opp} {fx.gf ?? "-"}-{fx.ga ?? "-"}</span>
    </span>
  );
}

function VoteTab({ gl, des, ko, tp, ag, setAg, rankTeam, setDes, applyRandom, allSorted, gk, glComplete, leftRes, rightRes, leftD, rightD, adv, ctx, score, fxByTeam }) {
  fxByTeam = fxByTeam || {};
  var [showRules, setShowRules] = useState(false);
  return (
    <div className="fade-in">
      {/* RULES bubble */}
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14, position: "relative" }}>
        <button
          onClick={function () { setShowRules(!showRules); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: "1px solid " + $.gold + "70", background: showRules ? "rgba(251,191,36,.18)" : "rgba(251,191,36,.08)", color: $.goldL, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
        >
          📖 ルールを見る {showRules ? "▲" : "▼"}
        </button>
        {showRules && (
          <div className="fade-in" style={{ position: "absolute", top: 44, left: 0, right: 0, zIndex: 10, background: "linear-gradient(135deg,#1f3f6f,#2a5891)", border: "2px solid " + $.gold + "60", borderRadius: 12, padding: 18, boxShadow: "0 12px 40px rgba(0,0,0,.45)" }}>
            {/* tail */}
            <div style={{ position: "absolute", top: -10, left: 30, width: 18, height: 18, background: "linear-gradient(135deg,#1f3f6f,#1f3f6f)", border: "2px solid " + $.gold + "60", borderRight: "none", borderBottom: "none", transform: "rotate(45deg)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: fontH, fontSize: 18, color: $.gold, letterSpacing: 2 }}>📖 遊び方とルール</div>
              <button onClick={function () { setShowRules(false); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, background: "transparent", border: "1px solid " + $.border, color: $.txt2, cursor: "pointer" }}>閉じる</button>
            </div>
            <div style={{ fontSize: 12, color: $.txt, lineHeight: 1.7 }}>
              {/* ここだけ読めばOK */}
              <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "linear-gradient(135deg,rgba(251,191,36,.18),rgba(251,191,36,.04))", border: "1px solid " + $.gold + "70" }}>
                <div style={{ fontFamily: fontH, fontSize: 14, letterSpacing: 2, color: $.gold, marginBottom: 6 }}>🔥 ここだけ読めばOK</div>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <div><strong style={{ color: $.gold }}>1.</strong> 各グループの <strong>1位・2位</strong> を選ぶ（12グループ分）</div>
                  <div><strong style={{ color: $.gold }}>2.</strong> <strong>推しチーム</strong> を 1番・2番・3番 と選ぶ（48チームから）</div>
                  <div><strong style={{ color: $.gold }}>3.</strong> 画面下の <strong>「🗳 予想を投票する」</strong> を押すだけ！</div>
                </div>
                <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,.15)", border: "1px solid " + $.red + "60", fontSize: 12, color: $.redL }}>
                  ⏰ <strong>投票締切: 2026年5月31日(日) 23:59</strong> ／ 6/1以降はロック
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: $.gold }}>① 遊び方（くわしく）</strong><br />
                ・各グループの<strong>1位・2位</strong>を予想（必須） — 3位・4位は任意<br />
                ・<strong>推しベスト3チーム</strong>を48チームから選ぶ（倍率がかかる）<br />
                ・決勝トーナメントは自分でシミュ可（自分のスコア試算用）<br />
                ・同じ名前で再ログインすれば、いつでも編集できます
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: $.gold }}>② ポイント計算</strong><br />
                <code style={{ background: "rgba(0,0,0,.3)", padding: "1px 6px", borderRadius: 3 }}>得点 = 基礎点 × ステージ倍率 × 推し倍率 × 順位的中ボーナス</code><br />
                <span style={{ color: $.txt2 }}>基礎点</span> = オッズ調整値（大穴ほど高い）<br />
                <span style={{ color: $.txt2 }}>ステージ倍率（累積加算）</span><br />
                　ベスト32 <strong>x0.2</strong> ／ ベスト16 <strong>x3.0</strong> ／ ベスト8 <strong style={{ color: $.gold }}>x5.0(最高)</strong><br />
                　準決勝 x2.5 ／ 決勝 x3.0 ／ 優勝 x4.0 ／ 3位 x1.5<br />
                <span style={{ color: $.txt2 }}>推し倍率</span>: 1推し <strong>x2.5</strong> ／ 2推し x1.8 ／ 3推し x1.3<br />
                <span style={{ color: $.pitchL, fontWeight: 700 }}>順位的中ボーナス</span>: グループ <strong style={{ color: $.gold }}>1位を完全的中で x1.5</strong> ／ <strong style={{ color: $.goldL }}>2位を完全的中で x1.25</strong>
                <div style={{ fontSize: 11, color: $.txt2, marginTop: 4 }}>
                  ※「通過するチームを当てる」だけでなく、<strong style={{ color: $.gold }}>「順位ピッタリ当てる」</strong>とさらに加点。1位と2位で配点が違います。
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: $.gold }}>③ 戦略のコツ</strong><br />
                ・ベスト32は48中32が通過するので的中ハードル低 → 配点低め<br />
                ・<strong>ベスト8到達予想が一番効く</strong>（x5.0）<br />
                ・<strong>1位を当てると更に x1.5</strong> 乗るので、迷ったら本命を1位に<br />
                ・大穴を「推し」に指定して当てるとスコアが跳ねる<br />
                ・上の「ランダム投票（大穴狙い／バランス／ガチガチ）」で雛形生成も可
              </div>
              <div style={{ paddingTop: 8, borderTop: "1px solid " + $.border, color: $.txt2, fontSize: 11 }}>
                <strong style={{ color: $.pitchL }}>📊 ランキング</strong> でリアルタイム順位、 <strong style={{ color: $.pitchL }}>⚽ 途中経過</strong> で実際の試合結果が見れます。
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK VOTE */}
      <div className="qv-row" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <span className="qv-row-label" style={{ fontFamily: fontH, fontSize: 13, letterSpacing: 3, color: $.gold, marginRight: 4 }}>🎲 ランダム投票:</span>
        {[
          { mode: "upset",    label: "大穴狙い",   color: $.red,  cl: $.redL },
          { mode: "balanced", label: "バランス型", color: $.blue, cl: $.blueL },
          { mode: "safe",     label: "ガチガチ",   color: $.gold, cl: $.goldL },
        ].map(function (m) {
          return (
            <button
              key={m.mode}
              onClick={function () { applyRandom(m.mode); }}
              className="qv-chip"
              style={{ fontFamily: fontH, fontSize: 13, letterSpacing: 2, padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "1px solid " + m.color + "60", background: "linear-gradient(135deg," + m.color + "20,transparent)", color: m.cl, fontWeight: 700, transition: "all .15s" }}
            >
              {m.label}
            </button>
          );
        })}
        <span className="qv-row-hint" style={{ fontSize: 11, color: $.dim }}>押すたびに別パターン</span>
      </div>

      {/* BONUS TEAMS */}
      <Sec icon="🌟" title="推しベスト3チーム" sub="3チームを選ぶと得点に倍率がかかる（1推し x2.5 / 2推し x1.8 / 3推し x1.3）" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 32 }}>
        {["A", "B", "C"].map(function (k) {
          var cfg = DES[k], picked = des[k];
          return (
            <div key={k} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid " + (picked ? cfg.c + "70" : $.border), background: $.card, boxShadow: picked ? "0 0 30px " + cfg.c + "30" : "none", transition: "all .25s" }}>
              <div style={{ padding: "12px 16px", background: picked ? cfg.bg : "rgba(255,255,255,.02)", borderBottom: "1px solid " + $.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: fontH, fontSize: 20, letterSpacing: 3, color: cfg.cl }}>{cfg.l}</span>
                  <span style={{ fontSize: 11, color: $.dim, marginLeft: 8, fontFamily: fontH }}>x{cfg.m}</span>
                </div>
                {picked && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.cl, display: "flex", alignItems: "center" }}>
                    <Fl n={picked} s={16} />{picked}
                  </span>
                )}
              </div>
              <div className="bonus-card-list" style={{ maxHeight: 280, overflowY: "auto" }}>
                {allSorted.map(function (t) {
                  var isThis = des[k] === t.n;
                  var ub = des.A === t.n ? "A" : des.B === t.n ? "B" : des.C === t.n ? "C" : null;
                  var isO = ub && ub !== k;
                  var b = bsc(t.o);
                  return (
                    <div
                      key={t.n}
                      onClick={function () { if (!isO) setDes(k, t.n); }}
                      className="bonus-team-row"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 14px", cursor: isO ? "default" : "pointer", background: isThis ? cfg.bg : "transparent", borderBottom: "1px solid rgba(255,255,255,.03)", opacity: isO ? 0.25 : 1, fontSize: 12 }}
                    >
                      <span style={{ fontWeight: isThis ? 700 : 400, color: isThis ? cfg.cl : $.txt, display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <Fl n={t.n} s={14} />{t.n}<FxTag fx={fxByTeam[t.n]} />
                      </span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        <span className="bonus-team-pt" style={{ fontSize: 14, color: $.gold, fontFamily: fontH, fontWeight: 700, minWidth: 50, textAlign: "right", letterSpacing: 1 }} title="基礎点（オッズ調整後）">x{b.toFixed(1)}</span>
                        {isO && <span style={{ fontSize: 9, color: DES[ub].cl }}>{ub}</span>}
                        {isThis && <span style={{ color: cfg.cl }}>✓</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* GROUP STAGE */}
      <Sec icon="🏟️" title="グループステージ予想" sub="各グループのカードをクリックして展開 → 順番にチームクリック（1位→2位→3位→4位）" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10, marginBottom: 28 }}>
        {gk.map(function (g) {
          var ranks = gl[g] || [];
          var done = ranks.length >= 2;
          var isOpen = ag === g;
          return (
            <div
              key={g}
              style={{
                borderRadius: 12,
                border: "1px solid " + (isOpen ? $.gold + "80" : done ? $.pitchL + "55" : $.border),
                background: isOpen
                  ? "linear-gradient(135deg,rgba(251,191,36,.14),rgba(251,191,36,.02))"
                  : done
                  ? "linear-gradient(135deg,rgba(52,211,153,.10),rgba(255,255,255,.04))"
                  : $.card,
                overflow: "hidden",
                transition: "all .2s",
                boxShadow: isOpen ? $.glowS : "none",
              }}
            >
              <div
                onClick={function () { setAg(isOpen ? null : g); }}
                style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: fontH, fontSize: 22, letterSpacing: 2, color: isOpen ? $.gold : done ? $.pitchL : $.txt }}>{g}</span>
                    {done && <span style={{ color: $.pitchL, fontSize: 13 }}>✓</span>}
                  </div>
                  {!isOpen && (
                    <div style={{ fontSize: 11, color: $.txt2, marginTop: 3, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontFamily: fontH, fontSize: 11, color: $.gold, marginRight: 1 }}>1</span>
                        {ranks[0] ? <><Fl n={ranks[0]} s={12} />{ranks[0]}</> : <span style={{ color: $.dim }}>未設定</span>}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontFamily: fontH, fontSize: 11, color: $.gold, marginRight: 1 }}>2</span>
                        {ranks[1] ? <><Fl n={ranks[1]} s={12} />{ranks[1]}</> : <span style={{ color: $.dim }}>未設定</span>}
                      </span>
                    </div>
                  )}
                </div>
                <span style={{ color: $.dim, fontSize: 13, marginLeft: 6 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen && (
                <div style={{ padding: "8px 12px 12px", borderTop: "1px solid " + $.border }}>
                  <div style={{ fontSize: 10, color: $.txt2, marginBottom: 8, lineHeight: 1.5 }}>
                    順番にクリック → 押すとやり直し。<br />
                    <span style={{ color: $.pitchL, fontWeight: 700 }}>● 1位・2位は必須</span>　<span style={{ color: $.dim }}>○ 3位・4位は任意</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {GRP[g].map(function (t) {
                      var pos = ranks.indexOf(t.n);
                      var isR = pos >= 0;
                      var isReq = pos === 0 || pos === 1;
                      var bk = des.A === t.n ? "A" : des.B === t.n ? "B" : des.C === t.n ? "C" : null;
                      var rankColor = isReq ? $.pitchL : isR ? $.txt2 : $.dim;
                      var rankBg = isReq ? "rgba(52,211,153,.16)" : isR ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)";
                      var rankBorder = isReq ? $.pitchL + "70" : isR ? "rgba(255,255,255,.20)" : $.border;
                      return (
                        <div
                          key={t.n}
                          onClick={function () { rankTeam(g, t.n); }}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid " + rankBorder, background: rankBg, transition: "all .15s" }}
                        >
                          <span style={{ fontFamily: fontH, fontSize: 16, color: rankColor, width: 18, textAlign: "center" }}>{isR ? pos + 1 : "—"}</span>
                          <Fl n={t.n} s={20} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: isR ? 700 : 400 }}>{t.n}</div>
                            <div style={{ fontSize: 10, color: $.dim, display: "flex", alignItems: "center", gap: 2 }}>x{bsc(t.o).toFixed(1)}<FxTag fx={fxByTeam[t.n]} /></div>
                          </div>
                          {bk && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: DES[bk].bg, color: DES[bk].cl, fontWeight: 700 }}>{DES[bk].l}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BRACKET */}
      {glComplete && (
        <div>
          <Sec icon="🏆" title="決勝トーナメント" sub="チーム名クリックで勝ち上がり（自分のシミュレーション用）" />
          <BView leftRes={leftRes} rightRes={rightRes} leftD={leftD} rightD={rightD} ko={ko} ctx={ctx} />
          {ko.sf.length >= 2 && <ThirdP ko={ko} adv={adv} />}
          {score && score.bd.length > 0 && <BDown score={score} />}
        </div>
      )}
      {!glComplete && (
        <div style={{ textAlign: "center", padding: 40, border: "1px dashed " + $.border, borderRadius: 12, marginTop: 12 }}>
          <div style={{ fontSize: 16, color: $.dim, fontWeight: 700 }}>12グループすべて設定すると決勝トーナメントが表示されます</div>
          <p style={{ color: $.dim, marginTop: 8, fontSize: 12 }}>上のA〜Lボタンから順位設定してください</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Save Bar (sticky bottom)
// ═══════════════════════════════════════════════════════════
function SaveBar({ saveStatus, savedAt, saveNow, glComplete, score }) {
  var label = "🗳 予想を投票する";
  var bg = "linear-gradient(135deg," + $.gold + "," + $.goldD + ")";
  var fg = "#000";
  if (saveStatus === "saving") { label = "投票中..."; }
  else if (saveStatus === "saved") { label = "✓ 投票しました"; bg = "linear-gradient(135deg," + $.pitchL + "," + $.pitch + ")"; fg = "#fff"; }
  else if (saveStatus === "error") { label = "⚠ エラー（もう一度押す）"; bg = "linear-gradient(135deg," + $.red + "," + $.redL + ")"; fg = "#fff"; }
  return (
    <div className="save-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(180deg,rgba(5,7,13,.0),rgba(5,7,13,.92) 30%)", padding: "20px 16px", zIndex: 90, pointerEvents: "none" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, pointerEvents: "auto" }}>
        <div className="save-bar-info" style={{ fontSize: 11, color: $.dim, letterSpacing: 1, minWidth: 0 }}>
          {savedAt ? <span>✓ 最終投票: {savedAt.toLocaleTimeString("ja-JP")}</span> : <span>{glComplete ? "予想完了！投票できます" : "12グループすべて設定すると投票できます"}</span>}
          {score && <span className="save-bar-info-score" style={{ marginLeft: 12, color: $.gold, fontFamily: fontH, letterSpacing: 2 }}>得点 {score.total.toFixed(1)}</span>}
        </div>
        <button
          onClick={saveNow}
          disabled={saveStatus === "saving"}
          className="save-btn"
          style={{ padding: "14px 36px", borderRadius: 10, border: "none", background: bg, color: fg, fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: saveStatus === "saving" ? "default" : "pointer", boxShadow: saveStatus === "saving" ? "none" : "0 4px 24px rgba(245,197,24,.45)", transition: "all .2s", minWidth: 220, flexShrink: 0 }}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Results Tab
// ═══════════════════════════════════════════════════════════
function ResultsTab({ myName: myName_, tour, liveStarted, scoringKo, simActive, simKo, simAdv, resetSim, applySim }) {
  var [list, setList] = useState([]);
  var [loading, setLoading] = useState(true);
  var [err, setErr] = useState("");
  var [open, setOpen] = useState(null); // expanded player
  var [bdOpen, setBdOpen] = useState(null); // 得点内訳を開いているプレイヤー

  useEffect(function () {
    var live = true;
    function load() {
      getAllPredictions()
        .then(function (data) { if (!live) return; setList(data || []); setLoading(false); })
        .catch(function (e) { if (!live) return; setErr(e.message || String(e)); setLoading(false); });
    }
    load();
    var unsub = subscribePredictions(load);
    return function () { live = false; if (unsub) unsub(); };
  }, []);

  // 通常は暫定順位、シミュレーション操作中はその結果でスコア計算（端末ローカル）
  var koForScore = scoringKo || provisionalKo(tour);
  var groupsForScore = (tour && tour.groups) || {};
  var thirdSet = thirdSetOf(groupsForScore); // 3位通過判定用（実グループ結果ベース）
  var liveR32 = useMemo(function () { return resolveLiveR32(tour); }, [tour]); // 最高/最低ポイント試算のR32解決
  // まだ可能性のある順位（最高=自分が最も伸びる勝ち上がり時の順位 / 最低=最も伸びない時の順位）
  var rankRange = useMemo(function () {
    try {
      var R = liveR32, G = groupsForScore, mem = (list || []).filter(function (m) { return m && m.gl; });
      var nteams = (R.leftRes || []).concat(R.rightRes || []).reduce(function (a, m) { return a + (m.teams || []).length; }, 0);
      if (nteams !== 32 || mem.length < 2) return {};
      function toScoring(sk) { var part = []; Object.keys(GRP).forEach(function (g) { var a = G[g] || []; if (a.some(function (t) { return (t.mp || 0) > 0; })) a.slice(0, 2).forEach(function (t) { if (t && t.n) part.push(t.n); }); }); return { r32: part, r16: sk.r32 || [], qf: sk.r16 || [], sf: sk.qf || [], final: sk.sf || [], champ: sk.champ || null, third: sk.third || null }; }
      var out = {};
      mem.forEach(function (M) {
        var koMax = optimizeBracket(M, R.leftRes, R.rightRes, G, true), koMin = optimizeBracket(M, R.leftRes, R.rightRes, G, false);
        if (!koMax || !koMin) return;
        var skMax = toScoring(koMax), skMin = toScoring(koMin);
        var mMax = calcScore(M.gl, M.des, skMax, G).total, mMin = calcScore(M.gl, M.des, skMin, G).total;
        var best = 1, worst = 1;
        mem.forEach(function (O) {
          if (O.name === M.name) return;
          if (calcScore(O.gl, O.des, skMax, G).total > mMax) best++;
          if (calcScore(O.gl, O.des, skMin, G).total > mMin) worst++;
        });
        out[M.name] = { best: best, worst: worst };
      });
      return out;
    } catch (e) { return {}; }
  }, [list, liveR32, groupsForScore]);

  var rows = useMemo(function () {
    var actualR32 = koForScore.r32 || []; // 暫定R32（試合消化グループの上位2）
    var hasGroupsData = Object.values(groupsForScore).some(function (arr) { return arr && arr.length > 0; });
    return list.map(function (p) {
      var sc = (function () {
        try { return calcScore(p.gl || {}, p.des || {}, koForScore, groupsForScore); }
        catch (e) { return { total: 0, bd: [] }; }
      })();
      // 突破予想（top2）の的中数
      var picks = [];
      Object.values(p.gl || {}).forEach(function (arr) { (arr || []).slice(0, 2).forEach(function (n) { if (n) picks.push(n); }); });
      var hits = actualR32.length ? picks.filter(function (n) { return actualR32.indexOf(n) >= 0; }).length : null;
      // 順位的中数（1位・2位）
      var hits1 = 0, hits2 = 0, total1 = 0, total2 = 0;
      Object.entries(p.gl || {}).forEach(function (e) {
        var g = e[0], arr = e[1] || [];
        if (arr[0]) total1++;
        if (arr[1]) total2++;
        var stand = groupsForScore[g];
        if (!stand || stand.length === 0) return;
        var grpPlayed = stand.some(function (t) { return (t.mp || 0) > 0; });
        if (!grpPlayed) return; // 試合前グループは暫定順位を的中扱いしない
        if (arr[0] && stand[0] && stand[0].n === arr[0]) hits1++;
        if (arr[1] && stand[1] && stand[1].n === arr[1]) hits2++;
      });
      return {
        name: p.name, gl: p.gl || {}, des: p.des || {}, tp: p.tp || {}, score: sc, updated_at: p.updated_at,
        hits: hits, total: picks.length,
        rank1: hasGroupsData ? hits1 : null, rank1Total: 12,
        rank2: hasGroupsData ? hits2 : null, rank2Total: 12,
        vstyle: votingStyle(p.gl || {}, p.des || {}),
      };
    }).sort(function (a, b) { return b.score.total - a.score.total; });
  }, [list, koForScore, groupsForScore, liveStarted, tour]);

  // チーム別 投票状況集計
  var teamStats = useMemo(function () {
    var n = list.length;
    var stat = {}; // name -> {r1,r2,oshiA,oshiB,oshiC}
    AT.forEach(function (t) { stat[t.n] = { n: t.n, o: t.o, r1: 0, r2: 0, oshiA: 0, oshiB: 0, oshiC: 0 }; });
    list.forEach(function (p) {
      Object.values(p.gl || {}).forEach(function (arr) {
        if (arr && arr[0] && stat[arr[0]]) stat[arr[0]].r1++;
        if (arr && arr[1] && stat[arr[1]]) stat[arr[1]].r2++;
      });
      var d = p.des || {};
      if (d.A && stat[d.A]) stat[d.A].oshiA++;
      if (d.B && stat[d.B]) stat[d.B].oshiB++;
      if (d.C && stat[d.C]) stat[d.C].oshiC++;
    });
    Object.values(stat).forEach(function (s) {
      s.breakout = s.r1 + s.r2;             // 突破予想された総数
      s.oshi = s.oshiA + s.oshiB + s.oshiC; // 推しに選ばれた総数
    });
    return { n: n, stat: stat };
  }, [list]);

  // ピックアップ: 確定グループの的中度から「めっちゃ当ててる/外してる/みんなが外したのに当てた人」
  // 敗退チーム（推しチップに取り消し線）: 確定グループで非進出(3位非通過・4位) ＋ KOで敗退した側
  var eliminated = useMemo(function () {
    var s = new Set();
    Object.keys(GRP).forEach(function (g) {
      var arr = groupsForScore[g] || [];
      if (arr.length === 4 && arr.every(function (t) { return (t.mp || 0) >= 3; })) {
        arr.forEach(function (t, i) { if (i === 3 || (i === 2 && !thirdSet.has(t.n))) s.add(t.n); });
      }
    });
    ((tour && tour.ko && tour.ko.matches) || []).forEach(function (m) {
      if ((m.round || 0) > 3 && m.hs != null && m.as != null) { var L = m.hs > m.as ? m.away : m.as > m.hs ? m.home : null; if (L) s.add(L); }
    });
    return s;
  }, [groupsForScore, thirdSet, tour]);
  // 各メンバーの突破的中/順位的中（確定グループのみ）
  function memberHits(m) {
    var brk = 0, pos = 0, dec = 0;
    Object.keys(GRP).forEach(function (g) {
      ((m.gl && m.gl[g]) || []).slice(0, 2).forEach(function (tn, i) {
        if (!tn) return; var oc = predOutcome(g, tn, i, groupsForScore, thirdSet);
        if (oc) { dec++; if (oc === "exact" || oc === "advance" || oc === "third") brk++; if (oc === "exact") pos++; }
      });
    });
    return { brk: brk, pos: pos, dec: dec };
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: $.dim, fontSize: 14 }}>読み込み中...</div>;
  }
  if (err) {
    return <div style={{ padding: 60, textAlign: "center", color: $.redL }}>エラー: {err}</div>;
  }

  return (
    <div className="fade-in">
      <Sec icon="🏅" title="ランキング" sub={"参加者 " + rows.length + "名 — " + (hasSupabase ? "リアルタイム共有中" : "ローカル保存（端末内のみ）") + "　/　得点の左「◯-◯位」＝まだ可能性のある最終順位"} />

      {simActive && (
        <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(168,85,247,.12)", border: "1px solid " + $.purple + "55", color: $.purpleL, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          🔮 トーナメントのシミュレーション結果を反映中（この端末だけの試算）。<span style={{ color: $.dim, fontWeight: 400 }}>「⚽ 途中経過」タブの🔄リセットで元に戻せます。</span>
        </div>
      )}


      {rows.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: $.dim, border: "1px dashed " + $.border, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>まだ予想がありません</div>
          <p style={{ marginTop: 8, fontSize: 12 }}>「予想する」タブで予想を入れて保存してください</p>
        </div>
      )}

      {rows.length > 0 && (function () {
        var renderRow = function (r, i) {
          var isMe = r.name === myName_;
          var isOpen = open === r.name;
          var h = memberHits(r);
          var rr = rankRange[r.name];
          return (
            <div
              key={r.name}
              style={{
                borderRadius: 8,
                border: "1px solid " + (isMe ? $.gold + "70" : $.border),
                background: isMe ? "linear-gradient(135deg,rgba(245,197,24,.08),transparent 60%)" : $.card,
                boxShadow: isMe ? "0 0 14px rgba(245,197,24,.15)" : "none",
                overflow: "hidden",
              }}
            >
              <div
                onClick={function () { setOpen(isOpen ? null : r.name); }}
                className="lb-row"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 10px", cursor: "pointer", flexWrap: "nowrap" }}
              >
                <div className="lb-rank" style={{ fontFamily: fontH, fontSize: 15, color: i === 0 ? $.gold : i === 1 ? "#bbb" : i === 2 ? "#cd7f32" : $.dim, width: 24, textAlign: "center", flexShrink: 0 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1)}
                </div>
                <div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flexShrink: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isMe ? $.gold : $.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                  {isMe && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: $.gold, color: "#000", fontWeight: 700, flexShrink: 0 }}>あなた</span>}
                  {h.dec > 0 && <span className="lb-hits" title="確定グループでの突破的中・うち順位的中" style={{ fontSize: 9, color: $.dim, flexShrink: 0, whiteSpace: "nowrap" }}>突破<b style={{ color: $.pitchL }}>{h.brk}</b>/順<b style={{ color: $.gold }}>{h.pos}</b></span>}
                </div>
                <div className="lb-bonuses leaderboard-row-bonuses" style={{ display: "flex", gap: 4, flex: 1, flexWrap: "nowrap", justifyContent: "flex-end", overflow: "hidden" }}>
                  {(["A", "B", "C"]).map(function (k) {
                    var n = r.des && r.des[k];
                    var cfg = DES[k];
                    if (!n) return null;
                    var out = eliminated.has(n); // 敗退チームは取り消し線
                    return (
                      <span key={k} className="bonus-chip" title={out ? n + "（敗退）" : n} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: out ? "rgba(255,255,255,.04)" : cfg.bg, border: "1px solid " + (out ? $.border : cfg.c + "55"), color: out ? $.dim : cfg.cl, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, textDecoration: out ? "line-through" : "none", opacity: out ? .7 : 1 }}>
                        <span style={{ fontSize: 8, opacity: .8, textDecoration: "none" }}>{cfg.l[0]}</span>
                        <Fl n={n} s={10} />{n}
                      </span>
                    );
                  })}
                </div>
                {rr && <span className="lb-range" title="まだ可能性のある最終順位（最高〜最低）" style={{ fontSize: 9, color: $.dim, flexShrink: 0, whiteSpace: "nowrap" }}>{rr.best === rr.worst ? rr.best + "位" : rr.best + "-" + rr.worst + "位"}</span>}
                <div className="lb-score-block leaderboard-row-score" style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
                  <div style={{ fontFamily: fontH, fontSize: 17, color: $.gold, lineHeight: 1 }}>{r.score.total.toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: $.txt2 }}>点</div>
                </div>
                <div className="lb-arrow" style={{ color: $.dim, fontSize: 11, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
              </div>
              {isOpen && (
                <div style={{ borderTop: "1px solid " + $.border, padding: 10, background: "rgba(0,0,0,.18)" }}>
                  {/* mobile-friendly bonus picks (always visible in expansion) */}
                  <div className="lb-expand-bonuses" style={{ display: "none", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {(["A", "B", "C"]).map(function (k) {
                      var n = r.des && r.des[k];
                      var cfg = DES[k];
                      if (!n) return <span key={k} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px dashed " + $.border, color: $.dim }}>{cfg.l}—</span>;
                      var out = eliminated.has(n);
                      return (
                        <span key={k} title={out ? n + "（敗退）" : n} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, padding: "3px 7px", borderRadius: 4, background: out ? "rgba(255,255,255,.04)" : cfg.bg, border: "1px solid " + (out ? $.border : cfg.c + "55"), color: out ? $.dim : cfg.cl, fontWeight: 700, textDecoration: out ? "line-through" : "none", opacity: out ? .7 : 1 }}>
                          <span style={{ fontSize: 9, opacity: .8, textDecoration: "none" }}>{cfg.l}</span>
                          <Fl n={n} s={11} />{n}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: $.gold, fontWeight: 700 }}>グループ予想</span>
                    {["exact", "advance", "third", "out"].map(function (k) {
                      return <span key={k} style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: OUTCOME[k].bg, color: OUTCOME[k].c, fontWeight: 700 }}>{OUTCOME[k].l}</span>;
                    })}
                    <span style={{ fontSize: 8, color: $.dim }}>（グループ確定後に色分け）</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 4, fontSize: 10 }}>
                    {Object.keys(GRP).map(function (g) {
                      var ranks = (r.gl && r.gl[g]) || [];
                      return (
                        <div key={g} style={{ padding: 6, background: "rgba(255,255,255,.03)", borderRadius: 5, border: "1px solid " + $.border }}>
                          <div style={{ fontSize: 10, color: $.gold, fontWeight: 700, marginBottom: 2 }}>{g}</div>
                          {ranks.length === 0 ? <span style={{ color: $.dim }}>—</span> : ranks.slice(0, 2).map(function (n, idx) {
                            var oc = predOutcome(g, n, idx, groupsForScore, thirdSet), cfg = oc ? OUTCOME[oc] : null;
                            return (
                              <div key={n} style={{ display: "flex", alignItems: "center", gap: 3, padding: cfg ? "1px 3px" : 0, borderRadius: 4, background: cfg ? cfg.bg : "transparent" }}>
                                <span style={{ color: cfg ? cfg.c : $.dim, width: 10 }}>{idx + 1}</span>
                                <Fl n={n} s={11} />
                                <span style={{ color: cfg ? cfg.c : $.txt2, textDecoration: oc === "out" ? "line-through" : "none" }}>{n}</span>
                                {cfg && <span style={{ marginLeft: "auto", fontSize: 8, color: cfg.c, fontWeight: 700, flexShrink: 0 }}>{cfg.l}</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* トーナメント試算: この人が最高／最低になる勝ち上がり */}
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: $.dim, fontWeight: 700 }}>決勝T試算:</span>
                    <button onClick={function (e) { e.stopPropagation(); var ko = optimizeBracket(r, liveR32.leftRes, liveR32.rightRes, groupsForScore, true); if (ko && applySim) applySim(ko); }}
                      style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid " + $.pitchL + "70", background: "rgba(34,197,94,.10)", color: $.pitchL }}>🔼 この人が最高得点</button>
                    <button onClick={function (e) { e.stopPropagation(); var ko = optimizeBracket(r, liveR32.leftRes, liveR32.rightRes, groupsForScore, false); if (ko && applySim) applySim(ko); }}
                      style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid " + $.red + "70", background: "rgba(248,113,113,.10)", color: $.redL }}>🔽 この人が最低得点</button>
                    <span style={{ fontSize: 9, color: $.dim }}>全試合終了時にこの人が最高/最低になる勝ち上がり。決勝T表と全員のスコアに反映（🔄で戻す）</span>
                  </div>

                  {/* 得点内訳 */}
                  <div style={{ marginTop: 10 }}>
                    <button onClick={function (e) { e.stopPropagation(); setBdOpen(bdOpen === r.name ? null : r.name); }}
                      style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid " + $.gold + "70", background: bdOpen === r.name ? "rgba(251,191,36,.18)" : "rgba(251,191,36,.06)", color: $.goldL }}>
                      📊 得点内訳 {bdOpen === r.name ? "▲" : "▼"}
                    </button>
                    {bdOpen === r.name && (
                      <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "rgba(0,0,0,.25)", border: "1px solid " + $.border, fontSize: 11, lineHeight: 1.6 }}>
                        <div style={{ color: $.txt2, marginBottom: 8 }}>
                          <code style={{ background: "rgba(255,255,255,.08)", padding: "1px 5px", borderRadius: 3, color: $.goldL }}>得点 = 基礎点 × ステージ倍率(累積) × 推し倍率 × 順位ボーナス（推しは決勝・優勝でさらにボーナス）</code>
                          <div style={{ fontSize: 10, color: $.dim, marginTop: 4 }}>
                            基礎点=オッズ調整値（大穴ほど高い）。ステージ倍率: R32×0.2 / R16×3 / QF×5 / 準決×2.5 / 決勝×3 / 優勝×4 / 3位×1.5（到達ごとに累積）。
                            推し: 1推し×2.5 / 2推し×1.8 / 3推し×1.3（決勝・優勝でさらにボーナス）。順位的中: 1位×1.5 / 2位×1.25。
                          </div>
                        </div>
                        {(r.score && r.score.bd && r.score.bd.length > 0) ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {r.score.bd.map(function (b, bi) {
                              return (
                                <div key={bi} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "4px 6px", borderRadius: 5, background: "rgba(255,255,255,.03)" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 700, minWidth: 90 }}><Fl n={b.tn} s={12} />{b.tn}</span>
                                  <span style={{ color: $.dim }}>基礎{b.b}</span>
                                  {b.stg && b.stg.length > 0 && <span style={{ color: $.pitchL }}>{b.stg.join("→")}</span>}
                                  {b.dk && <span style={{ color: DES[b.dk].cl, fontWeight: 700 }}>×{DES[b.dk].l}</span>}
                                  {b.rankBonus && b.rankBonus > 1 && <span style={{ color: $.goldL }}>×順位{b.rankBonus}</span>}
                                  <span style={{ marginLeft: "auto", fontFamily: fontH, fontSize: 14, color: $.gold }}>+{b.pts.toFixed(1)}</span>
                                </div>
                              );
                            })}
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 4, marginTop: 4, paddingTop: 6, borderTop: "1px solid " + $.border }}>
                              <span style={{ fontSize: 10, color: $.dim }}>合計</span>
                              <span style={{ fontFamily: fontH, fontSize: 20, color: $.gold }}>{r.score.total.toFixed(1)}</span><span style={{ fontSize: 10, color: $.dim }}>点</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: $.dim, fontSize: 11 }}>まだ加点はありません。予想した1位・2位チームが<strong style={{ color: $.txt2 }}>ベスト32以上に進む</strong>と加点されます（暫定順位でも反映）。</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        };
        return (
          <div className="rank-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{rows.slice(0, 17).map(function (r, idx) { return renderRow(r, idx); })}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{rows.slice(17).map(function (r, idx) { return renderRow(r, idx + 17); })}</div>
          </div>
        );
      })()}

      {/* 決勝トーナメント表（ランキングの下・クリックで勝ち上がりシミュレーション） */}
      <TournamentBracket tour={tour} simKo={simKo} simAdv={simAdv} resetSim={resetSim} simActive={simActive} />

      {/* みんなの予想（一覧マトリクス）— ランキングの下 */}
      {rows.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: $.gold, letterSpacing: 1, marginBottom: 4 }}>📋 みんなの予想一覧</div>
          <div style={{ fontSize: 11, color: $.dim, marginBottom: 12 }}>各メンバーの予想を一覧で比較。確定したグループは的中度で色分け。</div>
          <MatrixTab myName={myName_} tour={tour} list={list} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Vote Stats (人気チーム投票状況サマリ)
// ═══════════════════════════════════════════════════════════
function VoteStats({ teamStats, list }) {
  var n = teamStats.n || 0;
  var stat = teamStats.stat;
  var pct = function (c) { return n > 0 ? Math.round((c / n) * 100) : 0; };

  var topBreakout = useMemo(function () {
    return Object.values(stat).slice().sort(function (a, b) { return b.breakout - a.breakout || b.r1 - a.r1; }).slice(0, 16);
  }, [stat]);
  var topOshi = useMemo(function () {
    return Object.values(stat).filter(function (s) { return s.oshi > 0; }).sort(function (a, b) { return b.oshi - a.oshi; }).slice(0, 12);
  }, [stat]);

  // 「人と違う予想」ベスト3（選んだチームの少数派度の平均）
  var maverick = useMemo(function () {
    if (!list || n < 2) return [];
    var arr = (list || []).map(function (p) {
      var picks = [];
      Object.values(p.gl || {}).forEach(function (a) { (a || []).slice(0, 2).forEach(function (t) { if (t) picks.push(t); }); });
      if (picks.length < 4) return null;
      // 突破予想の少数派度（1 - そのチームを突破に選んだ割合）の平均
      var rare = 0;
      picks.forEach(function (t) { var s = stat[t]; var pop = s ? s.breakout / n : 0; rare += (1 - pop); });
      var gScore = rare / picks.length;
      // 推しの少数派度も加味
      var oshi = ["A", "B", "C"].map(function (k) { return p.des && p.des[k]; }).filter(Boolean);
      var score = gScore, oScore = 0;
      if (oshi.length) {
        oshi.forEach(function (t) { var s = stat[t]; var pop = s ? s.oshi / n : 0; oScore += (1 - pop); });
        score = gScore * 0.6 + (oScore / oshi.length) * 0.4;
      }
      // 最も少数派なピックを1つ（説明用）
      var rarest = null, rarestPop = 2;
      picks.concat(oshi).forEach(function (t) {
        var s = stat[t]; if (!s) return;
        var pop = (s.breakout + s.oshi) / n;
        if (pop < rarestPop) { rarestPop = pop; rarest = t; }
      });
      var rarestCount = rarest && stat[rarest] ? stat[rarest].breakout : 0;
      return { name: p.name, score: score, des: p.des || {}, rarest: rarest, rarestCount: rarestCount };
    }).filter(Boolean);
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr.slice(0, 3);
  }, [list, stat, n]);

  var medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="fade-in">
      {/* 個性派ランキング（人と違う予想ベスト3） */}
      {maverick.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 4 }}>🦄 人と違う予想 ベスト3</div>
          <div style={{ fontSize: 11, color: $.dim, marginBottom: 10 }}>みんなが選ばないチームを多く選んだ「逆張り度」ランキング。</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
            {maverick.map(function (m, i) {
              return (
                <div key={m.name} className="lift" style={{ borderRadius: 10, border: "1px solid " + (i === 0 ? $.purple + "70" : $.border), background: i === 0 ? "linear-gradient(135deg,rgba(168,85,247,.14),transparent 60%)" : $.card, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{medal[i]}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                    <span style={{ fontFamily: fontH, fontSize: 18, color: $.purpleL }}>{Math.round(m.score * 100)}</span>
                    <span style={{ fontSize: 9, color: $.dim }}>逆張度</span>
                  </div>
                  {m.rarest && (
                    <div style={{ fontSize: 10, color: $.txt2, display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ color: $.dim }}>注目:</span><Fl n={m.rarest} s={12} />{m.rarest}
                      <span style={{ color: $.dim }}>を予想（他{Math.max(0, m.rarestCount - 1)}人）</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 突破予想ランキング */}
      <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 4 }}>🔥 突破予想が多いチーム</div>
      <div style={{ fontSize: 11, color: $.dim, marginBottom: 10 }}>各チームを1位or2位（＝突破）に予想した人数。バーは濃=1位票・淡=2位票の内訳。</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 26 }}>
        {topBreakout.map(function (s, i) {
          return (
            <div key={s.n} className="lift" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: $.card, border: "1px solid " + $.border }}>
              <span style={{ fontFamily: fontH, fontSize: 14, color: $.dim, width: 22, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, width: 120, flexShrink: 0, fontSize: 13, fontWeight: 600 }}><Fl n={s.n} s={16} />{s.n}</span>
              <div className="bar-grow" style={{ flex: 1, display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,.06)", minWidth: 40 }}>
                <div title={"1位 " + s.r1 + "票"} style={{ width: pct(s.r1) + "%", background: $.gold, height: "100%" }} />
                <div title={"2位 " + s.r2 + "票"} style={{ width: pct(s.r2) + "%", background: $.gold + "55", height: "100%" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, width: 96, textAlign: "right", flexShrink: 0 }}>
                <span style={{ color: $.gold, fontSize: 14 }}>{s.breakout}</span><span style={{ color: $.dim, fontSize: 10 }}>/{n}</span>
                <span style={{ color: $.dim, fontSize: 10, marginLeft: 3 }}>(1位{s.r1}/2位{s.r2})</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* 推し人気ランキング */}
      <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 4 }}>🌟 推しに選ばれたチーム</div>
      <div style={{ fontSize: 11, color: $.dim, marginBottom: 10 }}>推しベスト3に指定された人数。色は内訳（<span style={{ color: DES.A.cl }}>赤=1推し</span>・<span style={{ color: DES.B.cl }}>青=2推し</span>・<span style={{ color: DES.C.cl }}>紫=3推し</span>）。</div>
      {topOshi.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: $.dim, fontSize: 12, border: "1px dashed " + $.border, borderRadius: 8 }}>まだ推しの投票がありません</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {topOshi.map(function (s, i) {
            return (
              <div key={s.n} className="lift" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: $.card, border: "1px solid " + $.border }}>
                <span style={{ fontFamily: fontH, fontSize: 14, color: $.dim, width: 22, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, width: 120, flexShrink: 0, fontSize: 13, fontWeight: 600 }}><Fl n={s.n} s={16} />{s.n}</span>
                <div className="bar-grow" style={{ flex: 1, display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,.06)", minWidth: 40 }}>
                  <div title={"1推し " + s.oshiA + "票"} style={{ width: pct(s.oshiA) + "%", background: DES.A.c, height: "100%" }} />
                  <div title={"2推し " + s.oshiB + "票"} style={{ width: pct(s.oshiB) + "%", background: DES.B.c, height: "100%" }} />
                  <div title={"3推し " + s.oshiC + "票"} style={{ width: pct(s.oshiC) + "%", background: DES.C.c, height: "100%" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, width: 96, textAlign: "right", flexShrink: 0 }}>
                  <span style={{ color: $.gold, fontSize: 14 }}>{s.oshi}</span><span style={{ color: $.dim, fontSize: 10 }}>人</span>
                  <span style={{ color: $.dim, fontSize: 10, marginLeft: 3 }}>(
                    {s.oshiA > 0 && <span style={{ color: DES.A.cl }}>1×{s.oshiA} </span>}
                    {s.oshiB > 0 && <span style={{ color: DES.B.cl }}>2×{s.oshiB} </span>}
                    {s.oshiC > 0 && <span style={{ color: DES.C.cl }}>3×{s.oshiC}</span>}
                  )</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Admin Panel (manual result entry)
// ═══════════════════════════════════════════════════════════
// 試合結果エディタ — グループ別に全6試合をリスト表示し、スコアを一括編集
function MatchEditor({ tour, setTour }) {
  var matches = (tour && tour.ko && tour.ko.matches) || [];
  var [grp, setGrp] = useState("A");
  var [msg, setMsg] = useState("");
  var [saving, setSaving] = useState(false);
  function findM(a, b) { return matches.find(function (m) { return (m.home === a && m.away === b) || (m.home === b && m.away === a); }); }
  function initial() {
    var o = {};
    Object.keys(GRP).forEach(function (g) {
      var ts = GRP[g].map(function (t) { return t.n; });
      for (var i = 0; i < ts.length; i++) for (var j = i + 1; j < ts.length; j++) {
        var a = ts[i], b = ts[j], mm = findM(a, b), k = [a, b].slice().sort().join("|");
        o[k] = { home: mm ? mm.home : a, away: mm ? mm.away : b, hs: (mm && mm.hs != null) ? String(mm.hs) : "", as: (mm && mm.as != null) ? String(mm.as) : "" };
      }
    });
    return o;
  }
  var [edits, setEdits] = useState(initial);
  useEffect(function () { setEdits(initial()); }, [tour && tour.ko && tour.ko.matches]); // eslint-disable-line
  function setVal(k, field, v) { setEdits(function (p) { var n = Object.assign({}, p); n[k] = Object.assign({}, n[k]); n[k][field] = v; return n; }); }
  async function save() {
    if (saving) return;
    setSaving(true); setMsg("保存中...");
    try {
      var base = initial();
      var ms = matches.slice();
      var changed = 0, invalid = 0;
      Object.keys(edits).forEach(function (k) {
        var e = edits[k], m0 = base[k] || {};
        if (String(e.hs) === String(m0.hs) && String(e.as) === String(m0.as)) return; // 変更なし
        var bothEmpty = e.hs === "" && e.as === "", bothFilled = e.hs !== "" && e.as !== "";
        if (!bothEmpty && !bothFilled) { invalid++; return; } // 片側だけはスキップ
        var idx = ms.findIndex(function (m) { return (m.home === e.home && m.away === e.away) || (m.home === e.away && m.away === e.home); });
        var prev = idx >= 0 ? ms[idx] : null;
        var entry = Object.assign({}, prev || {}, {
          home: e.home, away: e.away,
          hs: bothEmpty ? null : Number(e.hs), as: bothEmpty ? null : Number(e.as),
          status: bothEmpty ? "" : "FT", manual: true,
          date: (prev && prev.date) || schedDate(e.home, e.away) || (new Date()).toISOString().slice(0, 10),
          round: (prev && prev.round) || 1,
        });
        if (idx >= 0) ms[idx] = entry; else ms.push(entry);
        changed++;
      });
      if (!changed) { setMsg(invalid ? "✕ スコアは両方入力してください" : "変更がありません"); setSaving(false); setTimeout(function () { setMsg(""); }, 2500); return; }
      var groups = computeGroups(ms, (tour && tour.ko && tour.ko.teamCards));
      var newKo = Object.assign({}, (tour && tour.ko) || {}, { matches: ms });
      await saveTournament({ phase: "groups", groups: groups, ko: newKo });
      setTour(function (t) { return Object.assign({}, t, { phase: "groups", groups: groups, ko: newKo }); });
      setMsg("✓ " + changed + "試合を保存しました（星取表に即反映）" + (invalid ? "／" + invalid + "件は片側のみで未保存" : ""));
      setTimeout(function () { setMsg(""); }, 3000);
    } catch (e) { setMsg("✕ " + (e.message || e)); }
    setSaving(false);
  }
  // 表示するグループの6カードを日程順で
  var ts = GRP[grp].map(function (t) { return t.n; });
  var pairs = [];
  for (var i = 0; i < ts.length; i++) for (var j = i + 1; j < ts.length; j++) {
    var a = ts[i], b = ts[j], mm = findM(a, b);
    pairs.push({ k: [a, b].slice().sort().join("|"), date: (mm && mm.date) || schedDate(a, b) || "" });
  }
  pairs.sort(function (x, y) { return (x.date || "zzz").localeCompare(y.date || "zzz"); });
  var sinp = { width: 40, padding: "6px 4px", borderRadius: 6, background: "rgba(0,0,0,.3)", color: $.txt, border: "1px solid " + $.border, fontSize: 14, textAlign: "center" };
  return (
    <div style={{ marginBottom: 16, padding: 12, background: "rgba(52,211,153,.06)", borderRadius: 8, border: "1px solid " + $.pitchL + "40" }}>
      <div style={{ fontSize: 12, color: $.pitchL, fontWeight: 700, marginBottom: 4 }}>🆕 試合結果を入力（グループ別・一括）</div>
      <div style={{ fontSize: 10, color: $.dim, marginBottom: 8 }}>グループを選び、全6試合のスコアをまとめて入力→保存。手動入力は自動更新でも消えません（空欄のままは未開催）。</div>
      <select value={grp} onChange={function (e) { setGrp(e.target.value); }} style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,.3)", color: $.txt, border: "1px solid " + $.border, fontSize: 12 }}>
        {Object.keys(GRP).map(function (g) { return <option key={g} value={g}>グループ{g}</option>; })}
      </select>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {pairs.map(function (p) {
          var e = edits[p.k] || { home: "", away: "", hs: "", as: "" };
          return (
            <div key={p.k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ width: 38, fontSize: 9, color: $.dim, flexShrink: 0 }}>{p.date ? p.date.slice(5) : ""}</span>
              <span style={{ flex: 1, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}><Fl n={e.home} s={14} />{e.home}</span>
              <input type="number" min="0" value={e.hs} onChange={function (ev) { setVal(p.k, "hs", ev.target.value); }} placeholder="–" style={sinp} />
              <span style={{ color: $.dim }}>-</span>
              <input type="number" min="0" value={e.as} onChange={function (ev) { setVal(p.k, "as", ev.target.value); }} placeholder="–" style={sinp} />
              <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: 4 }}><Fl n={e.away} s={14} />{e.away}</span>
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={saving} style={{ marginTop: 10, padding: "8px 18px", border: "none", borderRadius: 6, background: saving ? $.dim : $.pitchL, color: "#000", fontWeight: 700, cursor: saving ? "wait" : "pointer", fontSize: 13 }}>グループ{grp}の結果を保存</button>
      {msg && <div style={{ fontSize: 11, marginTop: 6, color: msg.startsWith("✓") ? $.pitchL : msg.startsWith("✕") ? $.redL : $.dim }}>{msg}</div>}
    </div>
  );
}
// チーム別カード集計エディタ（フェアプレー）— チーム毎の累計枚数を直接編集
function CardEditor({ tour, setTour }) {
  var groups = (tour && tour.groups) || {};
  function initial() { var m = {}; Object.keys(GRP).forEach(function (g) { GRP[g].forEach(function (t) { var row = (groups[g] || []).find(function (x) { return x.n === t.n; }); m[t.n] = { yc: String((row && row.yc) || 0), rc: String((row && row.rc) || 0) }; }); }); return m; }
  var [edits, setEdits] = useState(initial);
  var [grp, setGrp] = useState("A");
  var [msg, setMsg] = useState("");
  var [saving, setSaving] = useState(false);
  useEffect(function () { setEdits(initial()); }, [tour && tour.groups]); // eslint-disable-line
  function setVal(team, key, v) { setEdits(function (p) { var n = Object.assign({}, p); n[team] = Object.assign({}, n[team], {}); n[team][key] = v; return n; }); }
  async function save() {
    if (saving) return;
    setSaving(true); setMsg("保存中...");
    try {
      // 変更したチームのみ上書きに追加（触っていないチームはAPI自動集計のまま維持）
      var base = initial();
      var teamCards = Object.assign({}, (tour && tour.ko && tour.ko.teamCards) || {});
      Object.keys(edits).forEach(function (t) {
        var e = edits[t], m = base[t] || { yc: "0", rc: "0" };
        if (String(e.yc) !== String(m.yc) || String(e.rc) !== String(m.rc)) teamCards[t] = { yc: Number(e.yc) || 0, rc: Number(e.rc) || 0 };
      });
      var matches = (tour && tour.ko && tour.ko.matches) || [];
      var groups2 = computeGroups(matches, teamCards);
      var newKo = Object.assign({}, (tour && tour.ko) || {}, { teamCards: teamCards });
      await saveTournament({ groups: groups2, ko: newKo });
      setTour(function (t) { return Object.assign({}, t, { groups: groups2, ko: newKo }); });
      setMsg("✓ カード集計を保存しました（星取表・3位順位に即反映）");
      setTimeout(function () { setMsg(""); }, 2500);
    } catch (e) { setMsg("✕ " + (e.message || e)); }
    setSaving(false);
  }
  var inp = { width: 44, padding: "5px", borderRadius: 6, background: "rgba(0,0,0,.3)", color: $.txt, border: "1px solid " + $.border, fontSize: 13, textAlign: "center" };
  return (
    <div style={{ marginBottom: 16, padding: 12, background: "rgba(234,179,8,.06)", borderRadius: 8, border: "1px solid " + $.gold + "40" }}>
      <div style={{ fontSize: 12, color: $.goldL, fontWeight: 700, marginBottom: 4 }}>🟨 チーム別カード集計（フェアプレー）</div>
      <div style={{ fontSize: 10, color: $.dim, marginBottom: 8 }}>チーム毎の累計カード枚数を直接編集。FP =−(🟨×1 + 🟥×4)。保存するとAPIより優先され、星取表・3位順位表に反映されます。</div>
      <select value={grp} onChange={function (e) { setGrp(e.target.value); }} style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,.3)", color: $.txt, border: "1px solid " + $.border, fontSize: 12 }}>
        {Object.keys(GRP).map(function (g) { return <option key={g} value={g}>グループ{g}</option>; })}
      </select>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {GRP[grp].map(function (t) {
          var e = edits[t.n] || { yc: "0", rc: "0" };
          var fp = -((Number(e.yc) || 0) + (Number(e.rc) || 0) * 4);
          return (
            <div key={t.n} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ width: 118, fontWeight: 700, color: $.txt, display: "inline-flex", alignItems: "center", gap: 4 }}><Fl n={t.n} s={13} />{t.n}</span>
              <span style={{ fontSize: 13 }}>🟨</span>
              <input type="number" min="0" value={e.yc} onChange={function (ev) { setVal(t.n, "yc", ev.target.value); }} style={inp} />
              <span style={{ fontSize: 13 }}>🟥</span>
              <input type="number" min="0" value={e.rc} onChange={function (ev) { setVal(t.n, "rc", ev.target.value); }} style={inp} />
              <span style={{ color: $.dim, fontSize: 11 }}>FP <b style={{ color: fp < 0 ? $.redL : $.txt }}>{fp}</b></span>
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={saving} style={{ marginTop: 10, padding: "7px 16px", border: "none", borderRadius: 6, background: saving ? $.dim : $.gold, color: "#000", fontWeight: 700, cursor: saving ? "wait" : "pointer", fontSize: 12 }}>カード集計を保存</button>
      {msg && <div style={{ fontSize: 11, marginTop: 6, color: msg.startsWith("✓") ? $.pitchL : msg.startsWith("✕") ? $.redL : $.dim }}>{msg}</div>}
    </div>
  );
}
function AdminPanel({ tour, setTour, close }) {
  var ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD || "sankoen2026";
  var [unlocked, setUnlocked] = useState(false);
  var [pw, setPw] = useState("");
  var [pwErr, setPwErr] = useState("");
  var [phase, setPhase] = useState((tour && tour.phase) || "pre");
  var [voteLocked, setVoteLocked] = useState((tour && tour.vote_locked) || false);
  var [ko, setKoL] = useState(JSON.parse(JSON.stringify((tour && tour.ko) || { r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null })));
  var [msg, setMsg] = useState("");
  var [saving, setSaving] = useState(false);
  var [syncMsg, setSyncMsg] = useState("");
  var [syncing, setSyncing] = useState(false);
  // チーム選択時に既存試合の値（スコア・カード）を読み込む
  function doUnlock() {
    if (pw === ADMIN_PW) { setUnlocked(true); setPwErr(""); }
    else setPwErr("合言葉が違います");
  }
  function toggleStage(stage, n) {
    setKoL(function (p) {
      var arr = (p[stage] || []).slice();
      var i = arr.indexOf(n);
      if (i >= 0) arr.splice(i, 1); else arr.push(n);
      return Object.assign({}, p, { [stage]: arr });
    });
  }
  function setSingle(stage, n) {
    setKoL(function (p) { return Object.assign({}, p, { [stage]: p[stage] === n ? null : n }); });
  }
  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await saveTournament({ phase: phase, vote_locked: voteLocked, ko: ko });
      setTour(function (t) { return Object.assign({}, t, { phase: phase, vote_locked: voteLocked, ko: ko }); });
      setMsg("✓ 保存しました");
      setTimeout(function () { setMsg(""); }, 2000);
    } catch (e) {
      setMsg("✕ エラー: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  }
  // 試合結果を反映: 現在の試合データを重複排除して星取表を再計算（手動修正後やAPI連携後の手動反映用）
  async function reflectResults() {
    if (syncing) return;
    setSyncing(true); setSyncMsg("反映中...");
    try {
      var orig = ((tour && tour.ko && tour.ko.matches) || []);
      var matches = dedupeMatches(orig);
      var merged = orig.length - matches.length;
      var groups = computeGroups(matches, (tour && tour.ko && tour.ko.teamCards));
      var newKo = Object.assign({}, (tour && tour.ko) || {}, { matches: matches });
      await saveTournament({ phase: (tour && tour.phase) || "groups", groups: groups, ko: newKo });
      setTour(function (t) { return Object.assign({}, t, { groups: groups, ko: newKo }); });
      setSyncMsg("✓ 星取表を再計算しました" + (merged > 0 ? "（重複" + merged + "件を統合）" : ""));
    } catch (e) { setSyncMsg("✕ " + (e.message || e)); }
    setSyncing(false);
  }

  // 最新データ取得: TheSportsDB(無料)から直接取得し、現データに統合（手動修正は保護・既存カードは維持）
  async function syncApi() {
    if (syncing) return;
    setSyncing(true); setSyncMsg("📡 最新データを取得中...");
    try {
      var L = 4429, S = 2026, base = "https://www.thesportsdb.com/api/v1/json/3";
      // 無料APIはround/season系が1回5件しか返さないため、グループ戦は日付別(eventsday)で全日程を取得。
      // KO・取りこぼし補完にラウンド/シーズン系も併用。
      var eps = [];
      for (var dd = 11; dd <= 27; dd++) eps.push("/eventsday.php?d=2026-06-" + dd + "&l=" + L); // グループ戦 6/11〜6/27
      eps.push("/eventsseason.php?id=" + L + "&s=" + S, "/eventspastleague.php?id=" + L, "/eventsnextleague.php?id=" + L);
      for (var rr = 4; rr <= 8; rr++) eps.push("/eventsround.php?id=" + L + "&r=" + rr + "&s=" + S); // KOラウンド
      var raw = [];
      var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      for (var ei = 0; ei < eps.length; ei++) {
        try { var res = await fetch(base + eps[ei]); var d = await res.json(); (d.events || d.results || []).forEach(function (e) { raw.push(e); }); } catch (e) { /* skip */ }
        if (ei % 3 === 0) setSyncMsg("📡 取得中... (" + (ei + 1) + "/" + eps.length + ")");
        await sleep(280);
      }
      if (!raw.length) { setSyncMsg("✕ APIからデータを取得できませんでした（時間をおいて再試行）"); setSyncing(false); return; }
      // 現データから開始（累積）。キーはid優先・無ければチーム組。
      var map = {};
      dedupeMatches((tour && tour.ko && tour.ko.matches) || []).forEach(function (m) { map[matchKey(m)] = m; });
      var addedCnt = 0, updCnt = 0;
      var put = function (m) {
        var k = matchKey(m), ex = map[k], hs = m.hs != null && m.as != null;
        if (!ex) { map[k] = m; addedCnt++; return; }
        if (ex.manual) { if (m.id && !ex.id) ex.id = m.id; if (m.ts && !ex.ts) ex.ts = m.ts; return; } // 手動修正は保護
        var eh = ex.hs != null && ex.as != null;
        if (hs && (!eh || ex.hs !== m.hs || ex.as !== m.as)) { if (ex.cards && !m.cards) m.cards = ex.cards; map[k] = m; updCnt++; }
        else { if (m.id && !ex.id) ex.id = m.id; if (m.ts && !ex.ts) ex.ts = m.ts; }
      };
      raw.forEach(function (e) {
        var m = {
          date: e.dateEvent || "", ts: e.strTimestamp || "", home: jaTeam(e.strHomeTeam || ""), away: jaTeam(e.strAwayTeam || ""),
          hs: (e.intHomeScore == null || e.intHomeScore === "") ? null : Number(e.intHomeScore),
          as: (e.intAwayScore == null || e.intAwayScore === "") ? null : Number(e.intAwayScore),
          round: Number(e.intRound || 0), status: e.strStatus || "", id: e.idEvent || "",
        };
        if (m.home && m.away) put(m);
      });
      var matches = Object.keys(map).map(function (k) { return map[k]; });
      var groups = computeGroups(matches, (tour && tour.ko && tour.ko.teamCards));
      var newKo = Object.assign({}, (tour && tour.ko) || {}, { matches: matches });
      await saveTournament({ phase: "groups", groups: groups, ko: newKo, last_api_update: (new Date()).toISOString() });
      setTour(function (t) { return Object.assign({}, t, { phase: "groups", groups: groups, ko: newKo, last_api_update: (new Date()).toISOString() }); });
      setSyncMsg("✓ 取得完了: " + matches.length + "試合（確定" + matches.filter(function (m) { return m.hs != null; }).length + "・新規" + addedCnt + "・更新" + updCnt + "）。カードは手動入力を維持。");
    } catch (e) { setSyncMsg("✕ 取得失敗: " + (e.message || e)); }
    setSyncing(false);
  }

  var STAGES = [
    { k: "r32", l: "ベスト32進出（16チーム想定）" },
    { k: "r16", l: "ベスト16進出（8チーム）" },
    { k: "qf",  l: "準々決勝進出（4チーム）" },
    { k: "sf",  l: "準決勝進出（2チーム）" },
    { k: "final", l: "決勝進出（2チーム）" },
  ];
  var PHASES = [
    { k: "pre", l: "開幕前" },
    { k: "groups", l: "グループ" },
    { k: "r32", l: "R32" },
    { k: "r16", l: "R16" },
    { k: "qf", l: "準々" },
    { k: "sf", l: "準決" },
    { k: "final", l: "決勝" },
    { k: "done", l: "閉幕" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto", backdropFilter: "blur(4px)" }} onClick={close}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: "100%", maxWidth: 920, background: "linear-gradient(135deg,#10172a,#0a1424)", border: "1px solid " + $.gold + "55", borderRadius: 14, padding: 20, marginTop: 30, marginBottom: 30, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: $.gold }}>🔧 管理者パネル</div>
          <button onClick={close} style={{ background: "transparent", border: "1px solid " + $.border, color: $.txt2, fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>閉じる</button>
        </div>

        {!unlocked ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: $.txt2, marginBottom: 10 }}>合言葉を入力してください</div>
            <input
              type="password"
              value={pw}
              onChange={function (e) { setPw(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter") doUnlock(); }}
              autoFocus
              style={{ width: 240, padding: "10px 14px", borderRadius: 8, border: "1px solid " + $.border, background: "rgba(0,0,0,.3)", color: $.txt, fontSize: 14, outline: "none" }}
            />
            <div>
              <button onClick={doUnlock} style={{ marginTop: 12, padding: "10px 28px", border: "none", borderRadius: 8, background: $.gold, color: "#000", fontWeight: 700, cursor: "pointer" }}>解除</button>
            </div>
            {pwErr && <div style={{ color: $.redL, marginTop: 8, fontSize: 12 }}>{pwErr}</div>}
          </div>
        ) : (
          <div>
            {/* Phase + lock */}
            <div style={{ marginBottom: 16, padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid " + $.border }}>
              <div style={{ fontSize: 12, color: $.gold, fontWeight: 700, marginBottom: 8 }}>大会フェーズ</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {PHASES.map(function (p) {
                  var act = phase === p.k;
                  return <button key={p.k} onClick={function () { setPhase(p.k); }} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid " + (act ? $.gold : $.border), background: act ? "rgba(245,197,24,.15)" : "transparent", color: act ? $.gold : $.txt2, cursor: "pointer", fontWeight: act ? 700 : 400 }}>{p.l}</button>;
                })}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: $.txt2, cursor: "pointer" }}>
                <input type="checkbox" checked={voteLocked} onChange={function (e) { setVoteLocked(e.target.checked); }} />
                投票ロック（全員編集不可）
              </label>
            </div>

            {/* 試合結果 手動入力（グループ別リストで一括編集） */}
            <MatchEditor tour={tour} setTour={setTour} />

            {/* チーム別カード集計（フェアプレー）— チーム毎の累計枚数を直接編集 */}
            <CardEditor tour={tour} setTour={setTour} />


            {/* データ同期 */}
            <div style={{ marginBottom: 16, padding: 12, background: "rgba(96,165,250,.06)", borderRadius: 8, border: "1px solid " + $.blue + "40" }}>
              <div style={{ fontSize: 12, color: $.blueL || $.blue, fontWeight: 700, marginBottom: 4 }}>🔄 データ同期</div>
              <div style={{ fontSize: 10, color: $.dim, marginBottom: 8 }}>結果がおかしい時の手動操作。手動入力した結果・カードは常に保護されます。</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <button onClick={syncApi} disabled={syncing} style={{ padding: "7px 14px", border: "none", borderRadius: 6, background: syncing ? $.dim : $.blue, color: "#fff", fontWeight: 700, cursor: syncing ? "wait" : "pointer", fontSize: 12 }}>📡 最新データを取得</button>
                <button onClick={reflectResults} disabled={syncing} style={{ padding: "7px 14px", border: "1px solid " + $.pitchL + "80", borderRadius: 6, background: "transparent", color: $.pitchL, fontWeight: 700, cursor: syncing ? "wait" : "pointer", fontSize: 12 }}>♻️ 試合結果を反映（再計算）</button>
              </div>
              <div style={{ fontSize: 9, color: $.dim, marginTop: 6 }}>
                <strong>最新データを取得</strong>＝APIに見に行き結果・日程を取り込み。<strong>反映（再計算）</strong>＝今ある試合データから星取表を作り直し（重複も自動統合）。
              </div>
              {syncMsg && <div style={{ fontSize: 11, marginTop: 6, color: syncMsg.startsWith("✓") ? $.pitchL : syncMsg.startsWith("✕") ? $.redL : $.dim }}>{syncMsg}</div>}
            </div>

            {/* KO stages */}
            {STAGES.map(function (s) {
              var picked = ko[s.k] || [];
              return (
                <div key={s.k} style={{ marginBottom: 12, padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid " + $.border }}>
                  <div style={{ fontSize: 12, color: $.gold, fontWeight: 700, marginBottom: 6 }}>{s.l}　<span style={{ color: $.dim, fontWeight: 400 }}>選択中: {picked.length}</span></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {AT.map(function (t) {
                      var on = picked.indexOf(t.n) >= 0;
                      return <button key={t.n} onClick={function () { toggleStage(s.k, t.n); }} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, border: "1px solid " + (on ? $.pitchL : $.border), background: on ? "rgba(34,197,94,.18)" : "transparent", color: on ? $.pitchL : $.txt2, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}><Fl n={t.n} s={10} />{t.n}</button>;
                    })}
                  </div>
                </div>
              );
            })}

            {/* champ + third */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[{ k: "champ", l: "👑 優勝", pool: ko.final }, { k: "third", l: "🥉 3位", pool: ko.qf }].map(function (s) {
                return (
                  <div key={s.k} style={{ padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid " + $.border }}>
                    <div style={{ fontSize: 12, color: $.gold, fontWeight: 700, marginBottom: 6 }}>{s.l}</div>
                    {(!s.pool || s.pool.length === 0) ? (
                      <div style={{ fontSize: 11, color: $.dim }}>{s.k === "champ" ? "決勝進出を先に設定" : "準々決勝進出を先に設定"}</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {s.pool.map(function (n) {
                          var on = ko[s.k] === n;
                          return <button key={n} onClick={function () { setSingle(s.k, n); }} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: "1px solid " + (on ? $.gold : $.border), background: on ? "rgba(245,197,24,.18)" : "transparent", color: on ? $.gold : $.txt2, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><Fl n={n} s={11} />{n}</button>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid " + $.border }}>
              <div style={{ fontSize: 12, color: msg.startsWith("✓") ? $.pitchL : msg ? $.redL : $.dim }}>{msg || "変更後は保存ボタンを押してください"}</div>
              <button onClick={save} disabled={saving} style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: $.gold, color: "#000", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? .6 : 1 }}>{saving ? "保存中..." : "💾 実結果を保存"}</button>
            </div>

            {/* Visit stats */}
            <AdminVisitStats />

            {/* Member predictions management */}
            <AdminMembers />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Admin: Visit stats
// ═══════════════════════════════════════════════════════════
function AdminVisitStats() {
  var [stats, setStats] = useState(null);
  var [loading, setLoading] = useState(true);
  var [err, setErr] = useState("");
  function reload() {
    setLoading(true);
    getVisitStats().then(function (s) { setStats(s); setLoading(false); setErr(""); })
      .catch(function (e) { setErr(e.message || String(e)); setLoading(false); });
  }
  useEffect(function () { reload(); }, []);

  function deviceLabel(ua) {
    if (!ua) return "—";
    if (/iPhone|iPad|iPod/i.test(ua)) return "📱 iOS";
    if (/Android/i.test(ua)) return "📱 Android";
    if (/Mac OS X/i.test(ua)) return "💻 Mac";
    if (/Windows/i.test(ua)) return "💻 Win";
    return "🖥 Other";
  }

  return (
    <div style={{ marginTop: 18, padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid " + $.border }}>
      <div style={{ fontSize: 12, color: $.gold, fontWeight: 700, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📈 アクセス統計</span>
        <button onClick={reload} style={{ background: "transparent", border: "1px solid " + $.border, color: $.txt2, fontSize: 11, padding: "3px 10px", borderRadius: 5, cursor: "pointer" }}>↻ 再読込</button>
      </div>
      {loading && <div style={{ fontSize: 11, color: $.dim }}>読込中...</div>}
      {err && <div style={{ fontSize: 11, color: $.redL }}>エラー: {err}{err && err.indexOf("visits") >= 0 && <span style={{ marginLeft: 8 }}>（visits テーブル未作成？supabase/schema.sql の最新版を再実行）</span>}</div>}
      {stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 10 }}>
            {[
              { l: "総アクセス", v: stats.total, c: $.gold },
              { l: "直近24h", v: stats.today, c: $.pitchL },
              { l: "直近7日間", v: stats.week, c: $.blueL },
              { l: "ユニーク名前", v: stats.uniqueNames, c: $.purpleL },
            ].map(function (s) {
              return (
                <div key={s.l} style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,.2)", border: "1px solid " + $.border }}>
                  <div style={{ fontSize: 10, color: $.dim }}>{s.l}</div>
                  <div style={{ fontFamily: fontH, fontSize: 22, color: s.c, lineHeight: 1.1 }}>{s.v == null ? "—" : s.v}</div>
                </div>
              );
            })}
          </div>
          <details>
            <summary style={{ fontSize: 11, color: $.txt2, cursor: "pointer", marginBottom: 6 }}>直近30件のアクセスログ</summary>
            <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 11 }}>
              {(stats.recent || []).map(function (v, i) {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 6px", borderBottom: "1px solid " + $.border, color: $.txt2 }}>
                    <span style={{ width: 130, color: $.dim, flexShrink: 0 }}>{v.created_at ? new Date(v.created_at).toLocaleString("ja-JP") : "—"}</span>
                    <span style={{ flex: 1, color: v.name ? $.gold : $.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name || "(名前未入力)"}</span>
                    <span style={{ width: 70, textAlign: "right", flexShrink: 0 }}>{deviceLabel(v.ua)}</span>
                  </div>
                );
              })}
              {(!stats.recent || stats.recent.length === 0) && <div style={{ padding: 8, color: $.dim }}>ログがまだありません</div>}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Admin: Members (edit/delete other people's predictions)
// ═══════════════════════════════════════════════════════════
function AdminMembers() {
  var [list, setList] = useState([]);
  var [loading, setLoading] = useState(true);
  var [err, setErr] = useState("");
  var [editingName, setEditingName] = useState(null);
  var [editText, setEditText] = useState("");
  var [editMsg, setEditMsg] = useState("");
  var [confirmDel, setConfirmDel] = useState(null);

  function reload() {
    setLoading(true);
    getAllPredictions()
      .then(function (d) { setList(d || []); setLoading(false); setErr(""); })
      .catch(function (e) { setErr(e.message || String(e)); setLoading(false); });
  }
  useEffect(function () { reload(); }, []);

  function startEdit(p) {
    setEditingName(p.name);
    setEditText(JSON.stringify({ gl: p.gl || {}, des: p.des || {}, tp: p.tp || {} }, null, 2));
    setEditMsg("");
  }
  async function saveEdit() {
    try {
      var parsed = JSON.parse(editText);
      await updatePredictionRaw(editingName, parsed);
      setEditMsg("✓ 更新しました");
      setTimeout(function () { setEditingName(null); reload(); }, 800);
    } catch (e) {
      setEditMsg("✕ " + (e.message || e));
    }
  }
  async function doDelete(nm) {
    try {
      await deletePrediction(nm);
      setConfirmDel(null);
      reload();
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid " + $.border }}>
      <div style={{ fontSize: 12, color: $.gold, fontWeight: 700, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>👥 メンバー予想管理</span>
        <button onClick={reload} style={{ background: "transparent", border: "1px solid " + $.border, color: $.txt2, fontSize: 11, padding: "3px 10px", borderRadius: 5, cursor: "pointer" }}>↻ 再読込</button>
      </div>
      {loading && <div style={{ fontSize: 11, color: $.dim }}>読込中...</div>}
      {err && <div style={{ fontSize: 11, color: $.redL }}>エラー: {err}</div>}
      {!loading && list.length === 0 && <div style={{ fontSize: 11, color: $.dim }}>予想がまだありません</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map(function (p) {
          var isEdit = editingName === p.name;
          var isConfirm = confirmDel === p.name;
          return (
            <div key={p.name} style={{ borderRadius: 6, border: "1px solid " + (isEdit || isConfirm ? $.gold + "60" : $.border), background: "rgba(255,255,255,.02)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: $.dim }}>更新: {p.updated_at ? new Date(p.updated_at).toLocaleString("ja-JP") : "—"}　1推し:{(p.des && p.des.A) || "—"} 2推し:{(p.des && p.des.B) || "—"} 3推し:{(p.des && p.des.C) || "—"}</div>
                </div>
                {!isEdit && !isConfirm && (
                  <>
                    <button onClick={function () { startEdit(p); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid " + $.border, background: "transparent", color: $.txt2, cursor: "pointer" }}>編集</button>
                    <button onClick={function () { setConfirmDel(p.name); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid " + $.red, background: "transparent", color: $.redL, cursor: "pointer" }}>削除</button>
                  </>
                )}
                {isConfirm && (
                  <>
                    <span style={{ fontSize: 11, color: $.redL }}>本当に削除？</span>
                    <button onClick={function () { doDelete(p.name); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "none", background: $.red, color: "#fff", cursor: "pointer", fontWeight: 700 }}>削除する</button>
                    <button onClick={function () { setConfirmDel(null); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid " + $.border, background: "transparent", color: $.txt2, cursor: "pointer" }}>取消</button>
                  </>
                )}
              </div>
              {isEdit && (
                <div style={{ padding: 10, borderTop: "1px solid " + $.border, background: "rgba(0,0,0,.2)" }}>
                  <div style={{ fontSize: 10, color: $.dim, marginBottom: 4 }}>JSON で gl/des/tp を編集できます。保存すると上書きします。</div>
                  <textarea
                    value={editText}
                    onChange={function (e) { setEditText(e.target.value); }}
                    rows={10}
                    style={{ width: "100%", fontFamily: "monospace", fontSize: 11, padding: 8, borderRadius: 6, border: "1px solid " + $.border, background: "rgba(0,0,0,.4)", color: $.txt, resize: "vertical", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: editMsg.startsWith("✓") ? $.pitchL : $.redL }}>{editMsg}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={function () { setEditingName(null); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid " + $.border, background: "transparent", color: $.txt2, cursor: "pointer" }}>取消</button>
                      <button onClick={saveEdit} style={{ fontSize: 11, padding: "4px 14px", borderRadius: 5, border: "none", background: $.gold, color: "#000", fontWeight: 700, cursor: "pointer" }}>更新</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Live Tab (actual tournament progress)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// Matrix Tab (メンバー投票一覧: 横=名前, 縦=推し/グループ選択)
// ═══════════════════════════════════════════════════════════
function MatrixTab({ myName: myName_, tour, list }) {
  list = list || [];
  // 実際の結果（正解判定用）
  var actualGroups = (tour && tour.groups) || {};
  var thirdSet = thirdSetOf(actualGroups);

  var members = useMemo(function () {
    return list.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || "", "ja"); });
  }, [list]);

  // 行定義: 推し3 + 各グループ(1位/2位)
  var rowDefs = useMemo(function () {
    var r = [
      { key: "A", label: "1推し", kind: "oshi", get: function (p) { return p.des && p.des.A; }, accent: DES.A.cl },
      { key: "B", label: "2推し", kind: "oshi", get: function (p) { return p.des && p.des.B; }, accent: DES.B.cl },
      { key: "C", label: "3推し", kind: "oshi", get: function (p) { return p.des && p.des.C; }, accent: DES.C.cl },
    ];
    Object.keys(GRP).forEach(function (g) {
      r.push({ key: g + "1", label: g + " 1位", kind: "grp", grp: g, pos: 0, get: function (p) { return (p.gl && p.gl[g] || [])[0]; } });
      r.push({ key: g + "2", label: g + " 2位", kind: "grp", grp: g, pos: 1, get: function (p) { return (p.gl && p.gl[g] || [])[1]; } });
    });
    return r;
  }, []);

  // 実際にそのグループ順位を当てているか
  function isCorrect(rowDef, team) {
    if (rowDef.kind !== "grp" || !team) return false;
    var stand = actualGroups[rowDef.grp];
    if (!stand || !stand.length) return false;
    return stand[rowDef.pos] && stand[rowDef.pos].n === team;
  }

  // 各行の最多得票（人気）
  function popularOf(rd) {
    var c = {};
    members.forEach(function (m) { var t = rd.get(m); if (t) c[t] = (c[t] || 0) + 1; });
    var best = null, bn = 0;
    Object.keys(c).forEach(function (t) { if (c[t] > bn) { bn = c[t]; best = t; } });
    return best ? { team: best, n: bn } : null;
  }

  var cellW = 96, LBL = 46, POP = 66;
  return (
    <div className="fade-in">
      {members.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "0 0 8px" }}>
          <span style={{ fontSize: 10, color: $.dim }}>グループ確定後に色分け：</span>
          {[["exact", "◎"], ["advance", "◯"], ["third", "△"], ["out", "✕"]].map(function (x) {
            return <span key={x[0]} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: OUTCOME[x[0]].bg, color: OUTCOME[x[0]].c, fontWeight: 700 }}>{x[1]} {OUTCOME[x[0]].l}</span>;
          })}
        </div>
      )}
      {members.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: $.dim, border: "1px dashed " + $.border, borderRadius: 12 }}>まだ予想がありません</div>
      ) : (
        <div style={{ overflow: "auto", maxHeight: "72vh", border: "1px solid " + $.border, borderRadius: 10 }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 11 }}>
            <thead>
              <tr>
                <th className="mx-lab" style={{ position: "sticky", left: 0, top: 0, zIndex: 4, background: "#13233f", color: $.gold, fontSize: 9, padding: "6px 4px", textAlign: "left", borderRight: "1px solid " + $.border, borderBottom: "2px solid " + $.border, minWidth: LBL, maxWidth: LBL }}>項目</th>
                <th className="mx-pop" style={{ position: "sticky", left: LBL, top: 0, zIndex: 4, background: "#1c2f17", color: $.pitchL, fontSize: 9, padding: "6px 4px", textAlign: "left", borderRight: "2px solid " + $.border, borderBottom: "2px solid " + $.border, minWidth: POP, maxWidth: POP }}>人気</th>
                {members.map(function (m) {
                  var isMe = m.name === myName_;
                  return <th key={m.name} className="mx-name" style={{ position: "sticky", top: 0, zIndex: 2, background: isMe ? "#2a3f1f" : "#13233f", color: isMe ? $.gold : $.txt, fontSize: 10, fontWeight: 700, padding: "6px 6px", borderBottom: "2px solid " + $.border, borderRight: "1px solid " + $.border, minWidth: cellW, maxWidth: cellW, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={m.name}>{m.name}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {rowDefs.map(function (rd, ri) {
                var isOshi = rd.kind === "oshi";
                var groupStart = rd.kind === "grp" && rd.pos === 0;
                var pop = popularOf(rd);
                return (
                  <tr key={rd.key}>
                    <td className="mx-lab" style={{ position: "sticky", left: 0, zIndex: 1, background: isOshi ? "rgba(251,191,36,.14)" : "#0f1d33", color: isOshi ? (rd.accent) : $.txt2, fontWeight: 700, padding: "5px 4px", borderRight: "1px solid " + $.border, borderTop: groupStart ? "2px solid " + $.border : "1px solid rgba(255,255,255,.06)", whiteSpace: "nowrap", fontSize: 9, minWidth: LBL, maxWidth: LBL }}>{rd.label}</td>
                    <td className="mx-pop" title={pop ? pop.team + " (" + pop.n + "人)" : ""} style={{ position: "sticky", left: LBL, zIndex: 1, background: "#13230f", borderRight: "2px solid " + $.border, borderTop: groupStart ? "2px solid " + $.border : "1px solid rgba(255,255,255,.06)", padding: "5px 4px", whiteSpace: "nowrap", overflow: "hidden", minWidth: POP, maxWidth: POP, fontSize: 10 }}>
                      {pop ? <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: $.txt }}><Fl n={pop.team} s={11} />{pop.team}</span> : <span style={{ color: $.dim }}>—</span>}
                    </td>
                    {members.map(function (m) {
                      var team = rd.get(m);
                      var oc = isOshi ? null : predOutcome(rd.grp, team, rd.pos, actualGroups, thirdSet);
                      var cfg = oc ? OUTCOME[oc] : null;
                      var mark = oc === "exact" ? "◎" : oc === "advance" ? "◯" : oc === "third" ? "△" : oc === "out" ? "✕" : "";
                      return (
                        <td key={m.name} className="mx-cell" title={(team || "") + (cfg ? "（" + cfg.l + "）" : "")} style={{ padding: "4px 6px", borderRight: "1px solid rgba(255,255,255,.05)", borderTop: groupStart ? "2px solid " + $.border : "1px solid rgba(255,255,255,.04)", background: isOshi ? "rgba(251,191,36,.05)" : cfg ? cfg.bg : "transparent", whiteSpace: "nowrap", color: cfg ? cfg.c : team ? $.txt : $.dim }}>
                          {team ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, textDecoration: oc === "out" ? "line-through" : "none" }}><Fl n={team} s={12} />{team}{mark && <span style={{ marginLeft: 2 }}>{mark}</span>}</span> : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 10, color: $.dim, marginTop: 8 }}>※ 横スクロールで全員。左の固定列「人気」＝各項目で最も多く選ばれたチーム。緑＝順位的中。</div>
    </div>
  );
}

// UTCタイムスタンプ → 日本時間の {date:"6/18", time:"07:00"}
function jstParts(ts) {
  if (!ts) return null;
  try {
    var d = new Date(ts.length <= 19 ? ts + "Z" : ts);
    if (isNaN(d.getTime())) return null;
    var date = d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });
    var time = d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
    return { date: date, time: time };
  } catch (e) { return null; }
}

// 各組3位ランキングを3段組（4チーム×3列）で表示。縦長を回避。
function Third3({ ranking }) {
  var head = (
    <thead>
      <tr style={{ color: $.dim, fontSize: 9 }}>
        <th style={{ padding: "3px 5px", textAlign: "left" }}>順</th>
        <th style={{ padding: "3px 4px" }}>組</th>
        <th style={{ padding: "3px 5px", textAlign: "left" }}>チーム</th>
        <th style={{ padding: "3px 3px" }}>試</th>
        <th style={{ padding: "3px 4px", color: $.gold }}>勝点</th>
        <th style={{ padding: "3px 4px" }}>得失</th>
        <th style={{ padding: "3px 4px" }}>得点</th>
        <th style={{ padding: "3px 4px" }} title="フェアプレー（黄-1/赤-4）">FP</th>
        <th style={{ padding: "3px 4px" }} title="FIFA世界ランキング(2026/4)">FIFA</th>
      </tr>
    </thead>
  );
  var row = function (t) {
    return (
      <tr key={t.grp} style={{ borderTop: "1px solid " + $.border, background: t.top8 ? "rgba(34,197,94,.12)" : "transparent" }}>
        <td style={{ padding: "4px 5px", fontFamily: fontH, fontSize: 13, color: t.top8 ? $.pitchL : $.dim }}>{t.rank}{t.top8 ? " ✓" : ""}</td>
        <td style={{ padding: "4px 4px", textAlign: "center", color: $.gold, fontWeight: 700 }}>{t.grp}</td>
        <td style={{ padding: "4px 5px", whiteSpace: "nowrap" }}><Fl n={t.n} s={12} />{t.n}</td>
        <td style={{ padding: "4px 3px", textAlign: "center", color: $.dim }}>{t.mp}</td>
        <td style={{ padding: "4px 4px", textAlign: "center", color: $.gold, fontWeight: 700 }}>{t.pts}</td>
        <td style={{ padding: "4px 4px", textAlign: "center", color: t.gd > 0 ? $.pitchL : t.gd < 0 ? $.redL : $.dim }}>{t.gd > 0 ? "+" : ""}{t.gd}</td>
        <td style={{ padding: "4px 4px", textAlign: "center" }}>{t.gf}</td>
        <td style={{ padding: "4px 4px", textAlign: "center", color: $.dim }} title={"黄" + (t.yc || 0) + " 赤" + (t.rc || 0)}>{t.fp || 0}</td>
        <td style={{ padding: "4px 4px", textAlign: "center", color: $.txt2 }}>{t.fifa && t.fifa < 999 ? t.fifa + "位" : "—"}</td>
      </tr>
    );
  };
  return (
    <div className="third-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, alignItems: "start" }}>
      {[[0, 4], [4, 8], [8, 12]].map(function (rg, ci) {
        return (
          <div key={ci} style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
              {head}
              <tbody>{ranking.slice(rg[0], rg[1]).map(row)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
// 決勝トーナメント表（クリックで勝ち上がりシミュレーション／ランキングに反映）。ランキング画面に表示。
function TournamentBracket({ tour, simKo, simAdv, resetSim, simActive }) {
  var groups = (tour && tour.groups) || {};
  var ko = (tour && tour.ko) || {};
  var simK = simKo || ko;
  var hasAnyGroup = Object.keys(groups || {}).length > 0;
  var noop = function () {};
  var liveGl = useMemo(function () { return deriveGlFromTour(groups); }, [groups]);
  var liveTp = useMemo(function () { return (ko.r32 && ko.r32.length) ? deriveTpFromTour(ko, groups) : deriveTpProvisional(groups); }, [ko, groups]);
  var leftRes = useMemo(function () { try { return LR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s) { return resolveSeed(s, liveGl, liveTp); }) }; }); } catch (e) { return []; } }, [liveGl, liveTp]);
  var rightRes = useMemo(function () { try { return RR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s) { return resolveSeed(s, liveGl, liveTp); }) }; }); } catch (e) { return []; } }, [liveGl, liveTp]);
  var leftD = useMemo(function () { return deriveRounds(leftRes, simK); }, [leftRes, simK]);
  var rightD = useMemo(function () { return deriveRounds(rightRes, simK); }, [rightRes, simK]);
  var ctx = { ko: simK, des: { A: null, B: null, C: null }, adv: simAdv || noop, gl: liveGl, tp: liveTp, pick3: noop, setAg: noop, readOnly: true };
  if (!hasAnyGroup) return null;
  return (
    <div style={{ marginTop: 30, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: $.gold, letterSpacing: 1 }}>🏆 決勝トーナメント表</div>
        <button onClick={resetSim || noop} disabled={!simActive} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: simActive ? "pointer" : "default", border: "1px solid " + (simActive ? $.gold + "70" : $.border), background: simActive ? "rgba(251,191,36,.10)" : "transparent", color: simActive ? $.goldL : $.dim }}>🔄 リセット</button>
      </div>
      <div style={{ fontSize: 11, color: simActive ? $.purpleL : $.dim, marginBottom: 10 }}>{simActive ? "🔮 シミュレーション中：結果はランキングに反映（この端末だけ）" : "国名をクリックすると勝ち上がりをシミュレーションでき、上のランキングに反映されます"}</div>
      <BView leftRes={leftRes} rightRes={rightRes} leftD={leftD} rightD={rightD} ko={simK} ctx={ctx} />
      {simK.sf && simK.sf.length >= 2 && <ThirdP ko={simK} adv={simAdv || noop} />}
    </div>
  );
}
function LiveTab({ tour, liveStarted }) {
  var phase = (tour && tour.phase) || "pre";
  var groups = (tour && tour.groups) || {};
  var ko = (tour && tour.ko) || {};
  var friendlies = (tour && tour.friendlies) || [];
  var wcMatches = (tour && tour.ko && tour.ko.matches) || [];
  var lastUpd = tour && tour.last_api_update;
  // 本戦: 終了は新しい順、未消化は近い順
  var wcFinished = wcMatches.filter(function (m) { return m.hs != null && m.as != null; }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  var wcUpcoming = wcMatches.filter(function (m) { return m.hs == null || m.as == null; }).sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });

  // 実データからブラケット表示用に派生
  var thirdRanking = useMemo(function () { return thirdPlaceRanking(groups); }, [groups]);
  var hasAnyGroup = Object.keys(groups || {}).length > 0;
  var [showGroups, setShowGroups] = useState(false); // グループ星取表は既定で折り畳み

  return (
    <div className="fade-in">
      <Sec icon="📡" title="大会途中経過" sub={"現在のフェーズ: " + (PHASE_LABEL[phase] || phase) + (lastUpd ? "　/　最終更新: " + new Date(lastUpd).toLocaleString("ja-JP") : "")} />

      {/* 3位チームランキング（上位8が進出） */}
      {hasAnyGroup && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 2 }}>🥉 各組3位ランキング</div>
          <div style={{ fontSize: 11, color: $.dim, marginBottom: 10 }}>上位8チームが決勝トーナメント進出。順位＝勝点→得失点差→総得点→（フェアプレー）→FIFAランク。</div>
          <Third3 ranking={thirdRanking} />
          <div style={{ fontSize: 10, color: $.dim, marginTop: 6 }}>緑＝暫定進出（上位8）。順位＝勝点→得失点差→総得点→フェアプレー(FP: 黄-1/赤-4)→FIFAランク(2026/4)。</div>
        </div>
      )}

      {(
        <div style={{ marginBottom: 24 }}>
          <div onClick={function () { setShowGroups(function (v) { return !v; }); }} style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: showGroups ? 10 : 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
            <span>📊 グループ星取表</span>
            <span style={{ fontSize: 11, color: $.dim, fontWeight: 400 }}>{showGroups ? "▲ 閉じる" : "▼ 全グループの星取表を開く"}</span>
          </div>
          {showGroups && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {Object.keys(GRP).map(function (g) {
              // 試合がまだのグループも枠を表示（0スタート）
              var rows0 = (groups[g] && groups[g].length) ? groups[g] : GRP[g].map(function (t) { return { n: t.n, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, yc: 0, rc: 0, fp: 0 }; });
              // 勝点→得失点差→総得点 で並べ替え（同勝点は得失点差で順位）
              var rows = rows0.slice().sort(function (a, b) {
                return (b.pts || 0) - (a.pts || 0) || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) || (b.gf || 0) - (a.gf || 0) || ((b.fp || 0) - (a.fp || 0)) || (FIFA_RANK[a.n] || 999) - (FIFA_RANK[b.n] || 999);
              });
              // このグループの試合（両国がこのグループ）
              // 全6対戦を生成し、取得済みの結果/日程と突合（取れていない試合も「未定」で必ず表示）
              var gteams = GRP[g].map(function (t) { return t.n; });
              var pairs = [];
              for (var pi = 0; pi < gteams.length; pi++) for (var pj = pi + 1; pj < gteams.length; pj++) pairs.push([gteams[pi], gteams[pj]]);
              var gms = pairs.map(function (pr) {
                var mm = wcMatches.find(function (m) { return (m.home === pr[0] && m.away === pr[1]) || (m.home === pr[1] && m.away === pr[0]); });
                // ライブ日程が無いカードは公式日程(SCHED)で開催日を補完（「未定」を解消）
                return mm || { home: pr[0], away: pr[1], hs: null, as: null, ts: "", date: schedDate(pr[0], pr[1]) };
              });
              gms.sort(function (a, b) { var ad = a.date || a.ts || "", bd = b.date || b.ts || ""; if (ad && bd) return ad.localeCompare(bd); if (ad) return -1; if (bd) return 1; return 0; });
              return (
                <div key={g} style={{ borderRadius: 10, border: "1px solid " + $.border, background: $.card, overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", background: "rgba(245,197,24,.08)", borderBottom: "1px solid " + $.border, fontWeight: 700, color: $.gold, fontSize: 13 }}>グループ {g}</div>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: $.dim }}>
                        <th style={{ padding: "4px 8px", textAlign: "left" }}>チーム</th>
                        <th style={{ padding: "4px 4px" }}>試</th>
                        <th style={{ padding: "4px 4px" }}>勝</th>
                        <th style={{ padding: "4px 4px" }}>分</th>
                        <th style={{ padding: "4px 4px" }}>敗</th>
                        <th style={{ padding: "4px 4px" }} title="総得点">得点</th>
                        <th style={{ padding: "4px 4px" }}>得失</th>
                        <th style={{ padding: "4px 6px", color: $.gold }}>勝点</th>
                        <th style={{ padding: "4px 4px" }} title="フェアプレー（黄-1/赤-4）">FP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(function (r, i) {
                        var diff = (r.gf || 0) - (r.ga || 0);
                        var qual = i < 2;
                        return (
                          <tr key={r.n + i} style={{ borderTop: "1px solid " + $.border, background: qual ? "rgba(34,197,94,.06)" : "transparent" }}>
                            <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}><Fl n={r.n} s={12} />{r.n}{(function () { var t = ft(r.n); return t ? <span style={{ marginLeft: 5, fontSize: 9, color: $.goldD, fontWeight: 700 }} title="基礎点（オッズ調整値）">x{bsc(t.o).toFixed(1)}</span> : null; })()}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center", color: $.dim }}>{r.mp || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.w || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.d || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.l || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.gf || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center", color: diff > 0 ? $.pitchL : diff < 0 ? $.redL : $.dim }}>{diff > 0 ? "+" : ""}{diff}</td>
                            <td style={{ padding: "4px 6px", textAlign: "center", color: $.gold, fontWeight: 700 }}>{r.pts || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center", color: $.dim }} title={"黄" + (r.yc || 0) + " 赤" + (r.rc || 0)}>{r.fp || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {gms.length > 0 && (
                    <div style={{ borderTop: "1px solid " + $.border, padding: "6px 10px", background: "rgba(0,0,0,.15)" }}>
                      <div style={{ fontSize: 9, color: $.dim, marginBottom: 3 }}>試合結果・日程（全6試合 / 時刻は日本時間）</div>
                      {gms.map(function (m, mi) {
                        var done = m.hs != null && m.as != null;
                        var hw = done && m.hs > m.as, aw = done && m.as > m.hs;
                        var jp = !done ? jstParts(m.ts) : null;
                        return (
                          <div key={mi} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 0", color: $.txt2 }}>
                            <span style={{ width: 40, color: $.dim, flexShrink: 0, fontSize: 9 }}>{jp ? jp.date + " " + jp.time : (m.date ? (m.date || "").slice(5) : "未定")}</span>
                            <span style={{ flex: 1, textAlign: "right", fontWeight: hw ? 700 : 400, color: hw ? $.txt : $.txt2, whiteSpace: "nowrap", overflow: "hidden" }}>{m.home}</span>
                            <span style={{ fontFamily: fontH, color: done ? $.gold : $.dim, minWidth: 28, textAlign: "center", fontSize: done ? 12 : 9 }}>{done ? m.hs + "-" + m.as : "vs"}</span>
                            <span style={{ flex: 1, textAlign: "left", fontWeight: aw ? 700 : 400, color: aw ? $.txt : $.txt2, whiteSpace: "nowrap", overflow: "hidden" }}>{m.away}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}





      <div style={{ marginTop: 24, padding: 14, fontSize: 11, color: $.dim, border: "1px dashed " + $.border, borderRadius: 8, lineHeight: 1.7 }}>
        ※ 結果は管理者が手動入力するか、API経由で自動取得されます。<br />
        ※ 実結果が反映されると、「みんなの予想」のスコアが自動で再計算されます。
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Section / Group Panel
// ═══════════════════════════════════════════════════════════
function Sec({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg," + $.gold + "60,transparent)" }} />
      </div>
      <div className="sec-title" style={{ fontFamily: fontH, fontSize: 21, letterSpacing: 2, color: $.gold, textShadow: "0 0 12px rgba(245,197,24,.25)" }}>{title}</div>
      {sub && <div className="sec-sub" style={{ fontSize: 11, color: $.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function GroupPanel({ g, gl, rankTeam, des, close }) {
  var ranks = gl[g] || [];
  return (
    <div className="fade-in" style={{ marginBottom: 16, borderRadius: 12, border: "1px solid " + $.gold + "55", background: "linear-gradient(135deg,rgba(245,197,24,.10),rgba(245,197,24,.02))", padding: 16, boxShadow: "0 0 30px rgba(245,197,24,.10)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: fontH, fontSize: 26, letterSpacing: 4, color: $.gold }}>GROUP {g}</span>
        <button onClick={close} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 4, background: "rgba(255,255,255,.06)", border: "1px solid " + $.border, cursor: "pointer", color: $.txt, fontFamily: fontH, letterSpacing: 2 }}>CLOSE</button>
      </div>
      <p style={{ fontSize: 11, color: $.txt2, marginBottom: 10, lineHeight: 1.6 }}>
        チームを順番にクリック（1位→2位→3位→4位）。押すとやり直し。<br />
        <span style={{ color: $.pitchL, fontWeight: 700 }}>● 1位・2位は必須</span>
        <span style={{ color: $.dim, marginLeft: 10 }}>○ 3位・4位は任意（3位通過予想に使用）</span>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {GRP[g].map(function (t) {
          var pos = ranks.indexOf(t.n);
          var isR = pos >= 0;
          var isReq = pos === 0 || pos === 1; // 1位/2位 = 必須
          var bk = des.A === t.n ? "A" : des.B === t.n ? "B" : des.C === t.n ? "C" : null;
          var rankColor = isReq ? $.pitchL : $.dim;
          var rankBg = isReq ? "rgba(34,197,94,.14)" : isR ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)";
          var rankBorder = isReq ? $.pitchL + "70" : isR ? $.dim + "70" : $.border;
          return (
            <div
              key={t.n}
              onClick={function () { rankTeam(g, t.n); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid " + rankBorder, background: rankBg, transition: "all .15s" }}
            >
              {isR && <span style={{ fontFamily: fontH, fontSize: 22, color: rankColor, width: 28, textAlign: "center" }}>{pos + 1}</span>}
              <Fl n={t.n} s={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: isR ? 700 : 400 }}>{t.n}</div>
                <div style={{ fontSize: 10, color: $.dim }}>x{bsc(t.o).toFixed(1)}</div>
              </div>
              {bk && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: DES[bk].bg, color: DES[bk].cl, fontWeight: 700 }}>{DES[bk].l}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, display: "flex", flexWrap: "wrap", gap: 14 }}>
        <span style={{ color: ranks[0] ? $.pitchL : $.redL, fontWeight: 700 }}>{ranks[0] ? "✓" : "●"} 1位: {ranks[0] || <span style={{ color: $.redL }}>未設定（必須）</span>}</span>
        <span style={{ color: ranks[1] ? $.pitchL : $.redL, fontWeight: 700 }}>{ranks[1] ? "✓" : "●"} 2位: {ranks[1] || <span style={{ color: $.redL }}>未設定（必須）</span>}</span>
        <span style={{ color: ranks[2] ? $.txt2 : $.dim }}>{ranks[2] ? "✓" : "○"} 3位: {ranks[2] || <span style={{ color: $.dim }}>任意</span>}</span>
        <span style={{ color: ranks[3] ? $.txt2 : $.dim }}>{ranks[3] ? "✓" : "○"} 4位: {ranks[3] || <span style={{ color: $.dim }}>任意</span>}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Bracket / Sub-components (unchanged behavior, light style polish)
// ═══════════════════════════════════════════════════════════
function BView({ leftRes, rightRes, leftD, rightD, ko, ctx }) {
  try {
    var koQf = ko.qf || [], koSf = ko.sf || [];
    var lSfT = (leftD.qf || []).map(function (q) { if (!q) return null; var ts = [q.t1, q.t2].filter(function (x) { return x && x.n; }); return ts.find(function (t) { return koQf.indexOf(t.n) >= 0; }) || null; });
    var rSfT = (rightD.qf || []).map(function (q) { if (!q) return null; var ts = [q.t1, q.t2].filter(function (x) { return x && x.n; }); return ts.find(function (t) { return koQf.indexOf(t.n) >= 0; }) || null; });
    return (
      <div style={{ overflowX: "auto", marginBottom: 12, padding: "8px 0" }}>
        <div style={{ display: "flex", alignItems: "stretch", minHeight: 520, minWidth: 1060 }}>
          <R32C ms={leftRes || []} ctx={ctx} /><CL n={4} d="R" /><SC items={leftD.r16 || []} stage="r16" ctx={ctx} /><CL n={2} d="R" /><SC items={leftD.qf || []} stage="qf" ctx={ctx} ac={$.gold} /><CL n={1} d="R" />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 105 }}><SfB teams={lSfT} ctx={ctx} label="SF1" /></div><CL n={1} d="R" />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 130, padding: "0 6px" }}><FB ko={ko} des={ctx.des} adv={ctx.adv} /></div><CL n={1} d="L" />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 105 }}><SfB teams={rSfT} ctx={ctx} label="SF2" /></div><CL n={1} d="L" />
          <SC items={rightD.qf || []} stage="qf" ctx={ctx} ac={$.gold} /><CL n={2} d="L" /><SC items={rightD.r16 || []} stage="r16" ctx={ctx} /><CL n={4} d="L" /><R32C ms={rightRes || []} ctx={ctx} />
        </div>
      </div>
    );
  } catch (e) { return <div style={{ color: $.dim, padding: 20 }}>ブラケット表示エラー</div>; }
}
function R32C({ ms, ctx }) { return <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", width: 128, flexShrink: 0 }}>{(ms || []).map(function (m) { return <MM key={m.id} m={m} ctx={ctx} />; })}</div>; }
function MM({ m, ctx }) {
  var [o, setO] = useState(false);
  var has3 = m.seeds ? m.seeds.find(function (s) { return s && s.startsWith("3("); }) : null;
  // 3位枠の候補チーム名（各候補グループの現3位）。読み取り専用バージョンで使用
  function third3Slot(seed, idx) {
    var letters = seed.match(/[A-L]/g) || [];
    var cands = letters.map(function (g) { return (ctx.gl && ctx.gl[g] || [])[2]; }).filter(Boolean);
    var label = cands.length ? cands.join(" or ") : "3位 " + letters.join("/");
    return (
      <div key={idx} style={{ padding: "3px 6px", minHeight: 22, borderBottom: idx === 0 ? "1px solid " + $.border : "none", fontSize: 8, color: $.purpleL, background: $.purple + "12", display: "flex", alignItems: "center", lineHeight: 1.25, whiteSpace: "normal" }}>{label}</div>
    );
  }
  return (
    <div>
      <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid " + $.border, background: $.card }}>
        {[0, 1].map(function (idx) {
          var sd = m.seeds[idx];
          var tm = m.teams[idx];
          // 3位枠: 割当が確定（チーム解決済み）なら実チーム表示。未確定のみ候補(or)表示
          if (ctx.readOnly && sd && sd.startsWith("3(") && (!tm || tm.tbd || !tm.n)) return third3Slot(sd, idx);
          return <TR key={idx} t={tm} stage="r32" ctx={ctx} seed={sd} />;
        })}
      </div>
      {has3 && !ctx.readOnly && (
        <div>
          <button onClick={function () { setO(!o); }} style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: $.purple + "20", border: "1px solid " + $.purple + "30", color: $.purpleL, cursor: "pointer", marginTop: 2 }}>3位{o ? "▲" : "▼"}</button>
          {o && <TP3 seed={has3} gl={ctx.gl} tp={ctx.tp} pick3={ctx.pick3} />}
        </div>
      )}
    </div>
  );
}
function SC({ items, stage, ctx, ac }) { return <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", width: 105, flexShrink: 0 }}>{(items || []).map(function (item, i) { var ts = [item.t1, item.t2].filter(function (x) { return x && x.n; }); if (ts.length < 2) return <div key={i} style={{ border: "1px dashed " + $.dim + "40", borderRadius: 5, padding: "4px 6px", fontSize: 9, color: $.dim, textAlign: "center" }}>TBD</div>; return <div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "1px solid " + (ac ? ac + "60" : $.border), background: $.card }}><TR t={item.t1} stage={stage} ctx={ctx} ac={ac} /><TR t={item.t2} stage={stage} ctx={ctx} ac={ac} /></div>; })}</div>; }
function SfB({ teams, ctx, label }) { var t1 = (teams || [])[0] || null, t2 = (teams || [])[1] || null; if (!t1 && !t2) return <div style={{ border: "1px dashed " + $.dim + "40", borderRadius: 6, padding: 8, fontSize: 9, color: $.dim, textAlign: "center" }}>{label}<br />TBD</div>; return <div><div style={{ fontFamily: fontH, fontSize: 10, letterSpacing: 2, color: $.goldD, marginBottom: 2 }}>{label}</div><div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid " + $.gold + "55", background: $.card }}>{t1 ? <TR t={t1} stage="sf" ctx={ctx} ac={$.gold} /> : <div style={{ padding: "3px 6px", fontSize: 9, color: $.dim, height: 22, borderBottom: "1px solid " + $.border }}>TBD</div>}{t2 ? <TR t={t2} stage="sf" ctx={ctx} ac={$.gold} /> : <div style={{ padding: "3px 6px", fontSize: 9, color: $.dim, height: 22 }}>TBD</div>}</div></div>; }
function TR({ t, stage, ctx, seed, ac }) {
  if (!t || t.tbd || !t.n) {
    var lbl = seed ? (seed.startsWith("3(") ? "3位" : seed) : (t && t.n) || "TBD";
    return (
      <div onClick={function () { try { if (t && t.grp) ctx.setAg(t.grp); else if (seed && seed.length >= 2 && !seed.startsWith("3(")) ctx.setAg(seed[1]); } catch (e) { } }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 6px", height: 22, borderBottom: "1px solid " + $.border, cursor: "pointer", color: $.dim, fontSize: 10 }}>
        <span>{lbl}</span><span style={{ fontSize: 8, color: $.gold }}>設定</span>
      </div>
    );
  }
  var koArr = (ctx.ko && ctx.ko[stage]) || [];
  var isAdv = koArr.indexOf(t.n) >= 0;
  var dk = (ctx.des && ctx.des.A === t.n) ? "A" : (ctx.des && ctx.des.B === t.n) ? "B" : (ctx.des && ctx.des.C === t.n) ? "C" : null;
  return (
    <div onClick={function () { ctx.adv(stage, t.n); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px", height: 22, cursor: "pointer", background: isAdv ? (ac ? "linear-gradient(90deg," + $.gold + "20,transparent)" : "linear-gradient(90deg," + $.pitchL + "20,transparent)") : "transparent", borderBottom: "1px solid " + $.border, fontWeight: isAdv ? 700 : 400, fontSize: 10 }}>
      <span style={{ color: isAdv ? $.pitchL : $.txt, display: "flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap" }}>
        <Fl n={t.n} s={12} />{t.n}{t.is3 ? "③" : ""}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        {dk && <span style={{ fontSize: 7, padding: "0 3px", borderRadius: 2, background: DES[dk].bg, color: DES[dk].cl, fontWeight: 700 }}>{dk}</span>}
        {isAdv && <span style={{ color: ac || $.pitchL, fontSize: 9 }}>✓</span>}
      </span>
    </div>
  );
}
function TP3({ seed, gl, tp, pick3 }) { var cands = get3c(seed, gl); var cur = (tp && tp[seed]) || null; return <div style={{ background: $.purple + "10", border: "1px solid " + $.purple + "25", borderRadius: 5, padding: 4, marginTop: 2 }}><div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{cands.map(function (t) { return <button key={t.n + t.grp} onClick={function () { pick3(seed, t.n); }} style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, cursor: "pointer", background: cur === t.n ? $.purple : "rgba(255,255,255,.05)", border: "1px solid " + (cur === t.n ? $.purple : $.border), color: cur === t.n ? "#fff" : $.txt2 }}><Fl n={t.n} s={9} />{t.n}({t.grp})</button>; })}</div></div>; }
function CL({ n, d }) { var isR = d === "R"; return <div style={{ display: "flex", flexDirection: "column", width: 14, flexShrink: 0 }}>{Array.from({ length: n }).map(function (_, i) { return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" }}><div style={Object.assign({ flex: 1, minHeight: 4, borderBottom: "1px solid " + $.gold + "40" }, isR ? { borderRight: "1px solid " + $.gold + "40" } : { borderLeft: "1px solid " + $.gold + "40" })} /><div style={Object.assign({ flex: 1, minHeight: 4, borderTop: "1px solid " + $.gold + "40" }, isR ? { borderRight: "1px solid " + $.gold + "40" } : { borderLeft: "1px solid " + $.gold + "40" })} /></div>; })}</div>; }
function FB({ ko, des, adv }) {
  var f1 = (ko.sf || []).length >= 1 ? ko.sf[0] : null, f2 = (ko.sf || []).length >= 2 ? ko.sf[1] : null;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: fontH, fontSize: 13, letterSpacing: 4, color: $.gold, marginBottom: 4 }}>🏆 FINAL</div>
      <div style={{ borderRadius: 10, overflow: "hidden", border: "2px solid " + $.gold, background: $.cardB, boxShadow: $.glow }}>
        {f1 ? <FRw tn={f1} ko={ko} adv={adv} /> : <div style={{ padding: 4, fontSize: 9, color: $.dim, borderBottom: "1px solid " + $.border }}>SF1</div>}
        {f2 ? <FRw tn={f2} ko={ko} adv={adv} /> : <div style={{ padding: 4, fontSize: 9, color: $.dim }}>SF2</div>}
      </div>
      {ko.final && ko.final.length >= 1 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontFamily: fontH, fontSize: 10, letterSpacing: 3, color: $.gold }}>CHAMPION</div>
          {ko.final.map(function (tn) {
            return (
              <div key={tn} onClick={function () { adv("champ", tn); }} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, padding: "5px 8px", background: ko.champ === tn ? "linear-gradient(135deg," + $.gold + "30," + $.gold + "10)" : "rgba(255,255,255,.03)", border: "1px solid " + (ko.champ === tn ? $.gold : $.border), borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, marginTop: 3, boxShadow: ko.champ === tn ? $.glow : "none" }}>
                <Fl n={tn} s={16} />{tn}{ko.champ === tn && " 👑"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function FRw({ tn, ko, adv }) { var isAdv = (ko.final || []).indexOf(tn) >= 0; return <div onClick={function () { adv("final", tn); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", cursor: "pointer", background: isAdv ? $.gold + "20" : "transparent", borderBottom: "1px solid " + $.border, fontSize: 10, fontWeight: isAdv ? 700 : 400 }}><span style={{ display: "flex", alignItems: "center" }}><Fl n={tn} s={13} />{tn}</span>{isAdv && <span style={{ color: $.pitchL, fontSize: 9 }}>✓</span>}</div>; }
function ThirdP({ ko, adv }) { var sfL = (ko.qf || []).filter(function (tn) { return (ko.sf || []).indexOf(tn) < 0; }); if (sfL.length < 2) return null; return <div style={{ maxWidth: 280, marginBottom: 16 }}><div style={{ fontFamily: fontH, fontSize: 14, letterSpacing: 3, color: $.gold, marginBottom: 4 }}>🥉 THIRD PLACE</div><div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid " + $.gold + "40", background: $.card }}>{sfL.map(function (tn) { var isAdv = ko.third === tn; return <div key={tn} onClick={function () { adv("third", tn); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", cursor: "pointer", background: isAdv ? $.gold + "20" : "transparent", borderBottom: "1px solid " + $.border, fontSize: 12, fontWeight: isAdv ? 700 : 400 }}><span style={{ display: "flex", alignItems: "center" }}><Fl n={tn} s={16} />{tn}</span>{isAdv && <span>🥉</span>}</div>; })}</div></div>; }
function BDown({ score }) { return <div style={{ borderRadius: 12, border: "1px solid " + $.border, background: $.card, padding: 16, marginTop: 12 }}><div style={{ fontFamily: fontH, fontSize: 16, letterSpacing: 3, color: $.gold, marginBottom: 10 }}>POINT BREAKDOWN</div>{score.bd.map(function (b, i) { return <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "5px 0", borderBottom: "1px solid " + $.border }}><span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Fl n={b.tn} s={14} />{b.tn}{b.dk && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: DES[b.dk].bg, color: DES[b.dk].cl, fontWeight: 700 }}>{DES[b.dk].l}</span>}</span><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: $.dim, fontSize: 10 }}>{b.stg.join(" → ")}</span><span style={{ fontFamily: fontH, fontSize: 16, color: $.pitchL }}>+{b.pts.toFixed(1)}</span></span></div>; })}<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><div style={{ fontFamily: fontH, fontSize: 28, color: $.gold, textShadow: "0 0 30px rgba(245,197,24,.4)" }}>TOTAL: {score.total.toFixed(1)}</div></div></div>; }

// ═══════════════════════════════════════════════════════════
// Global styles
// ═══════════════════════════════════════════════════════════
function Styles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;600;700&family=Noto+Sans+JP:wght@400;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:6px;height:6px}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:.65}50%{opacity:1}}
      .fade-in{animation:fadeUp .45s ease both}
      .pulse-glow{}
      button{transition:background-color .15s ease,border-color .15s ease,color .15s ease,box-shadow .2s ease,transform .15s ease}
      .qv-card:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.4)}
      .qv-chip:hover{transform:translateY(-1px);filter:brightness(1.15)}
      .lift{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
      .lift:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.32);border-color:rgba(251,191,36,.45)}
      @keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
      .bar-grow{transform-origin:left center;animation:growX .55s cubic-bezier(.22,1,.36,1) both}

      /* ─── モバイル最適化 ─── */
      @media (max-width: 640px) {
        .h-bar { height: 52px !important; padding: 0 10px !important; }
        .h-logo-mark { width: 32px !important; height: 32px !important; font-size: 17px !important; border-radius: 8px !important; }
        .h-logo-sub { font-size: 9px !important; letter-spacing: 2px !important; margin-bottom: 1px !important; }
        .h-logo-main { font-size: 16px !important; letter-spacing: 1px !important; white-space: nowrap !important; }
        .h-player-name { font-size: 12px !important; }
        .h-player-label { display: none !important; }
        .h-score-val { font-size: 20px !important; }
        .h-score-label { display: none !important; }
        .h-rename-btn { display: none !important; }
        .h-admin-btn { padding: 4px 8px !important; font-size: 13px !important; }
        .h-tab { padding: 9px 10px !important; font-size: 12px !important; letter-spacing: 0 !important; flex: 1; text-align: center; }
        .h-tab-row { width: 100% !important; }
        .h-phase { font-size: 10px !important; padding: 0 6px 4px 0 !important; }
        .h-phase span:last-child { white-space: nowrap; }
        .main-pad { padding: 14px 10px !important; }
        .sec-title { font-size: 18px !important; letter-spacing: 2px !important; }
        .sec-sub { font-size: 11px !important; }
        .qv-row { gap: 6px !important; }
        .qv-row-label { display: none !important; }
        .qv-chip { padding: 9px 12px !important; font-size: 13px !important; flex: 1; }
        .qv-row-hint { display: none !important; }
        .bonus-card-list { max-height: 260px !important; }
        .bonus-team-row { padding: 8px 12px !important; font-size: 13px !important; }
        .bonus-team-pt { font-size: 13px !important; min-width: 44px !important; }
        .group-card { font-size: 14px !important; }
        .save-bar { padding: 10px 8px !important; }
        .save-bar-info { font-size: 10px !important; }
        .save-bar-info-score { display: none !important; }
        .save-btn { padding: 12px 14px !important; min-width: 0 !important; font-size: 13px !important; letter-spacing: 1px !important; flex: 1; }
        .rule-bubble { padding: 14px !important; font-size: 12px !important; }
        .rule-bubble code { word-break: break-all; }
        /* Leaderboard mobile compact */
        .lb-row { gap: 6px !important; padding: 7px 10px !important; flex-wrap: nowrap !important; }
        .lb-rank { font-size: 16px !important; width: 26px !important; }
        .lb-name { gap: 4px !important; flex: 1 !important; min-width: 0 !important; }
        .lb-name span:first-child { font-size: 13px !important; }
        .lb-bonuses { display: none !important; }
        .lb-stats { font-size: 9px !important; gap: 4px !important; }
        .lb-stats span { white-space: nowrap; }
        .lb-side { gap: 1px !important; margin-left: 0 !important; }
        .lb-score-block > div:first-child { font-size: 18px !important; }
        .lb-arrow { font-size: 11px !important; }
        .lb-expand-bonuses { display: flex !important; }
        .rank-cols { grid-template-columns: 1fr !important; }
        .third-cols { grid-template-columns: 1fr !important; }
        /* 投票一覧マトリクスをスマホでコンパクトに */
        .mx-name, .mx-cell { min-width: 50px !important; max-width: 50px !important; font-size: 8px !important; padding: 3px 2px !important; overflow: hidden !important; }
        .mx-cell span { gap: 1px !important; }
        .mx-lab, .mx-pop { font-size: 8px !important; padding: 3px 3px !important; }
      }
    ` }} />
  );
}
