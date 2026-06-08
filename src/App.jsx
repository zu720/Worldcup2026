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
  bg: "linear-gradient(135deg,#1e3a5f 0%,#3a6ea8 45%,#5894d2 100%)",
  card: "rgba(255,255,255,.13)",
  cardB: "rgba(255,255,255,.20)",
  gold: "#fbbf24",
  goldL: "#fde68a",
  goldD: "#b45309",
  pitchL: "#34d399",
  pitch: "#059669",
  red: "#f87171",
  redL: "#fca5a5",
  blue: "#3b82f6",
  blueL: "#93c5fd",
  purple: "#a855f7",
  purpleL: "#d8b4fe",
  txt: "#ffffff",
  txt2: "#e2e8f0",
  dim: "#a8b8cc",
  border: "rgba(255,255,255,.22)",
  glow: "0 0 24px rgba(251,191,36,.6)",
  glowS: "0 0 12px rgba(251,191,36,.45)",
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
var LR32=[{id:73,s:["2A","2B"]},{id:74,s:["1C","2F"]},{id:75,s:["1E","3(A/B/C/D/F)"]},{id:76,s:["1F","2C"]},{id:77,s:["2E","2I"]},{id:78,s:["1I","3(C/D/F/G/H)"]},{id:79,s:["1A","3(C/E/F/H/I)"]},{id:80,s:["1L","3(E/H/I/J/K)"]}];
var RR32=[{id:81,s:["1G","3(A/E/H/I/J)"]},{id:82,s:["1D","3(B/E/F/I/J)"]},{id:83,s:["1H","2J"]},{id:84,s:["2K","2L"]},{id:85,s:["1B","3(E/F/G/I/J)"]},{id:86,s:["2D","2G"]},{id:87,s:["1J","2H"]},{id:88,s:["1K","3(D/E/I/J/L)"]}];

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
        if (actualIdx === p.predictedRank && actualIdx <= 1) {
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

function shuffle(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}return a;}
function generateRandom(mode){var gl2={};Object.keys(GRP).forEach(function(g){var teams=GRP[g].slice();teams.sort(function(a,b){return a.o-b.o;});if(mode==="safe"){var second=shuffle(teams.slice(1,3))[0];gl2[g]=[teams[0].n,second.n];}else if(mode==="upset"){var weak=shuffle(teams.slice(1));gl2[g]=[weak[0].n,weak[1].n];}else{var rest=shuffle(teams.slice(1));gl2[g]=[teams[0].n,rest[0].n];}});var pool=[];Object.values(gl2).forEach(function(a){a.forEach(function(n){var t=ft(n);if(t)pool.push(t);});});var des2={A:null,B:null,C:null};if(pool.length>=3){pool.sort(function(a,b){return a.o-b.o;});var n=pool.length,picks;if(mode==="upset"){var hi=pool.slice(Math.floor(n/2));picks=shuffle(hi).slice(0,3);}else if(mode==="safe"){var lo=pool.slice(0,Math.max(6,Math.ceil(n/2)));picks=shuffle(lo).slice(0,3);}else{picks=shuffle(pool).slice(0,3);}des2.A=(picks[0]||{}).n||null;des2.B=(picks[1]||{}).n||null;des2.C=(picks[2]||{}).n||null;}return{gl:gl2,des:des2};}

// ═══════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════
export default function App() {
  var [tab, setTab] = useState("vote");
  var [nm, setNm] = useState(myNameStore.get() || "");
  var [entered, setEntered] = useState(false);
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

  var gk = Object.keys(GRP);
  var allSorted = useMemo(function () { return AT.slice().sort(function (a, b) { return a.o - b.o; }); }, []); // 優勝オッズ昇順（本命→大穴）
  var glComplete = useMemo(function () { return gk.every(function (g) { return (gl[g] || []).length >= 2; }); }, [gl, gk]);
  // 実結果が空ならシミュレーション用の自分のkoを、開始後は実結果を使う
  var liveStarted = useMemo(function () {
    var k = tour && tour.ko;
    if (!k) return false;
    return (k.r32 && k.r32.length) || (k.r16 && k.r16.length) || (k.qf && k.qf.length) || (k.sf && k.sf.length) || (k.final && k.final.length) || k.champ || k.third;
  }, [tour]);
  var scoreKo = liveStarted ? tour.ko : ko;
  var scoreGroups = (tour && tour.groups) || {};
  var score = useMemo(function () { try { return glComplete ? calcScore(gl, des, scoreKo, scoreGroups) : null; } catch (e) { return null; } }, [gl, des, scoreKo, scoreGroups, glComplete]);

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

  var leftRes = useMemo(function () { try { return LR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s2) { return resolveSeed(s2, gl, tp); }) }; }); } catch (e) { return []; } }, [gl, tp]);
  var rightRes = useMemo(function () { try { return RR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s2) { return resolveSeed(s2, gl, tp); }) }; }); } catch (e) { return []; } }, [gl, tp]);
  var leftD = useMemo(function () { return deriveRounds(leftRes, ko); }, [leftRes, ko]);
  var rightD = useMemo(function () { return deriveRounds(rightRes, ko); }, [rightRes, ko]);
  var ctx = { ko: ko, des: des, adv: adv, gl: gl, tp: tp, pick3: pick3, setAg: setAg };

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
    if (saved && !entered) {
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
        <Header tab={tab} setTab={setTab} nm={nm} score={score} logout={logout} tour={tour} openAdmin={function () { setAdminOpen(true); }} />
        <main className="main-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
          {tab === "vote" && (
            <VoteTab
              gl={gl} des={des} ko={ko} tp={tp} ag={ag} setAg={setAg}
              rankTeam={rankTeam} setDes={setDes} applyRandom={applyRandom}
              allSorted={allSorted} gk={gk} glComplete={glComplete}
              leftRes={leftRes} rightRes={rightRes} leftD={leftD} rightD={rightD}
              adv={adv} ctx={ctx} score={score} tour={tour} liveStarted={liveStarted}
            />
          )}
          {tab === "results" && <ResultsTab myName={nm} tour={tour} liveStarted={liveStarted} />}
          {tab === "live" && <LiveTab tour={tour} liveStarted={liveStarted} />}
          {adminOpen && <AdminPanel tour={tour} setTour={setTour} close={function () { setAdminOpen(false); }} />}
        </main>
        <SaveBar saveStatus={saveStatus} savedAt={savedAt} saveNow={saveNow} glComplete={glComplete} score={score} />
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
            <div style={{ fontFamily: fontH, fontSize: 13, letterSpacing: 3, color: $.gold, marginBottom: 4 }}>Road to 三幸園</div>
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

function Header({ tab, setTab, nm, score, logout, tour, openAdmin }) {
  var phase = (tour && tour.phase) || "pre";
  var phaseLabel = PHASE_LABEL[phase] || phase;
  return (
    <header style={{ background: "linear-gradient(180deg,rgba(5,7,13,.95),rgba(5,7,13,.78))", borderBottom: "1px solid " + $.border, padding: "0 20px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
      <div className="h-bar" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div className="h-logo-mark" style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg," + $.gold + "," + $.goldD + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: $.glow, flexShrink: 0 }}>⚽</div>
          <div style={{ minWidth: 0 }}>
            <div className="h-logo-sub" style={{ fontFamily: fontH, fontSize: 11, letterSpacing: 2, color: $.gold }}>Road to 三幸園</div>
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
          <button onClick={logout} title="名前を変更" className="h-rename-btn" style={{ background: "transparent", border: "1px solid " + $.border, color: $.dim, fontSize: 11, padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>名前変更</button>
          <button onClick={openAdmin} title="管理者" className="h-admin-btn" style={{ background: "transparent", border: "1px solid " + $.border, color: $.dim, fontSize: 14, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>⚙️</button>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div className="h-tab-row" style={{ display: "flex" }}>
        {[{ id: "vote", l: "🗳 予想する" }, { id: "results", l: "📊 ランキング" }, { id: "live", l: "⚽ 途中経過" }].map(function (t) {
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
function VoteTab({ gl, des, ko, tp, ag, setAg, rankTeam, setDes, applyRandom, allSorted, gk, glComplete, leftRes, rightRes, leftD, rightD, adv, ctx, score }) {
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
                        <Fl n={t.n} s={14} />{t.n}
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
                            <div style={{ fontSize: 10, color: $.dim }}>x{bsc(t.o).toFixed(1)}</div>
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
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, pointerEvents: "auto" }}>
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
function ResultsTab({ myName: myName_, tour, liveStarted }) {
  var [list, setList] = useState([]);
  var [loading, setLoading] = useState(true);
  var [err, setErr] = useState("");
  var [open, setOpen] = useState(null); // expanded player
  var [view, setView] = useState("rank"); // rank | stats

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

  var emptyKo = { r32: [], r16: [], qf: [], sf: [], final: [], champ: null, third: null };
  var koForScore = liveStarted ? (tour && tour.ko) || emptyKo : emptyKo;
  var groupsForScore = (tour && tour.groups) || {};

  var rows = useMemo(function () {
    var actualR32 = (liveStarted && tour && tour.ko && tour.ko.r32) || [];
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
        if (arr[0] && stand[0] && stand[0].n === arr[0]) hits1++;
        if (arr[1] && stand[1] && stand[1].n === arr[1]) hits2++;
      });
      return {
        name: p.name, gl: p.gl || {}, des: p.des || {}, tp: p.tp || {}, score: sc, updated_at: p.updated_at,
        hits: hits, total: picks.length,
        rank1: hasGroupsData ? hits1 : null, rank1Total: 12,
        rank2: hasGroupsData ? hits2 : null, rank2Total: 12,
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

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: $.dim, fontSize: 14 }}>読み込み中...</div>;
  }
  if (err) {
    return <div style={{ padding: 60, textAlign: "center", color: $.redL }}>エラー: {err}</div>;
  }

  return (
    <div className="fade-in">
      <Sec icon="🏅" title={view === "rank" ? "ランキング" : "投票状況サマリ"} sub={"参加者 " + rows.length + "名 — " + (hasSupabase ? "リアルタイム共有中" : "ローカル保存（端末内のみ）")} />

      {/* トグル */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[{ k: "rank", l: "🏅 ランキング" }, { k: "stats", l: "📊 投票状況" }].map(function (t) {
          var act = view === t.k;
          return (
            <button key={t.k} onClick={function () { setView(t.k); }}
              style={{ fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "1px solid " + (act ? $.gold : $.border), background: act ? "rgba(251,191,36,.18)" : "rgba(255,255,255,.03)", color: act ? $.gold : $.txt2, transition: "all .15s" }}>
              {t.l}
            </button>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: $.dim, border: "1px dashed " + $.border, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>まだ予想がありません</div>
          <p style={{ marginTop: 8, fontSize: 12 }}>「予想する」タブで予想を入れて保存してください</p>
        </div>
      )}

      {view === "stats" && rows.length > 0 && <VoteStats teamStats={teamStats} />}

      {view === "rank" && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map(function (r, i) {
          var isMe = r.name === myName_;
          var isOpen = open === r.name;
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
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", flexWrap: "wrap" }}
              >
                <div className="lb-rank" style={{ fontFamily: fontH, fontSize: 20, color: i === 0 ? $.gold : i === 1 ? "#bbb" : i === 2 ? "#cd7f32" : $.dim, width: 36, textAlign: "center", flexShrink: 0 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1)}
                </div>
                <div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexShrink: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isMe ? $.gold : $.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                  {isMe && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: $.gold, color: "#000", fontWeight: 700, flexShrink: 0 }}>あなた</span>}
                </div>
                <div className="lb-bonuses leaderboard-row-bonuses" style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {(["A", "B", "C"]).map(function (k) {
                    var n = r.des && r.des[k];
                    var cfg = DES[k];
                    if (!n) {
                      return <span key={k} className="bonus-chip" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, border: "1px dashed " + $.border, color: $.dim }}>{cfg.l}—</span>;
                    }
                    return (
                      <span key={k} className="bonus-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 8px", borderRadius: 5, background: cfg.bg, border: "1px solid " + cfg.c + "55", color: cfg.cl, fontWeight: 700 }}>
                        <span style={{ fontSize: 9, opacity: .8 }}>{cfg.l}</span>
                        <Fl n={n} s={12} />{n}
                      </span>
                    );
                  })}
                </div>
                <div className="lb-side" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, marginLeft: 6, fontSize: 12, lineHeight: 1.25, flexShrink: 0 }}>
                  <div className="lb-stats leaderboard-row-stats" style={{ display: "flex", gap: 8, fontWeight: 700 }}>
                    <span style={{ color: r.hits == null ? $.dim : r.hits > 0 ? $.pitchL : $.txt2 }}>突破{r.hits == null ? "—" : r.hits}/{r.total}</span>
                    <span style={{ color: r.rank1 == null ? $.dim : r.rank1 > 0 ? $.gold : $.txt2 }}>1位{r.rank1 == null ? "—" : r.rank1}/{r.rank1Total}</span>
                    <span style={{ color: r.rank2 == null ? $.dim : r.rank2 > 0 ? $.goldL : $.txt2 }}>2位{r.rank2 == null ? "—" : r.rank2}/{r.rank2Total}</span>
                  </div>
                  <div className="lb-score-block leaderboard-row-score" style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                    <div style={{ fontFamily: fontH, fontSize: 22, color: $.gold, lineHeight: 1 }}>{r.score.total.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: $.txt2 }}>点</div>
                  </div>
                </div>
                <div className="lb-arrow" style={{ color: $.dim, fontSize: 12, marginLeft: 4, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
              </div>
              {isOpen && (
                <div style={{ borderTop: "1px solid " + $.border, padding: 10, background: "rgba(0,0,0,.18)" }}>
                  {/* mobile-friendly bonus picks (always visible in expansion) */}
                  <div className="lb-expand-bonuses" style={{ display: "none", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {(["A", "B", "C"]).map(function (k) {
                      var n = r.des && r.des[k];
                      var cfg = DES[k];
                      if (!n) return <span key={k} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px dashed " + $.border, color: $.dim }}>{cfg.l}—</span>;
                      return (
                        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, padding: "3px 7px", borderRadius: 4, background: cfg.bg, border: "1px solid " + cfg.c + "55", color: cfg.cl, fontWeight: 700 }}>
                          <span style={{ fontSize: 9, opacity: .8 }}>{cfg.l}</span>
                          <Fl n={n} s={11} />{n}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: $.gold, marginBottom: 6, fontWeight: 700 }}>グループ予想</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 4, fontSize: 10 }}>
                    {Object.keys(GRP).map(function (g) {
                      var ranks = (r.gl && r.gl[g]) || [];
                      return (
                        <div key={g} style={{ padding: 6, background: "rgba(255,255,255,.03)", borderRadius: 5, border: "1px solid " + $.border }}>
                          <div style={{ fontSize: 10, color: $.gold, fontWeight: 700, marginBottom: 2 }}>{g}</div>
                          {ranks.length === 0 ? <span style={{ color: $.dim }}>—</span> : ranks.slice(0, 2).map(function (n, idx) {
                            return <div key={n} style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ color: $.dim, width: 10 }}>{idx + 1}</span><Fl n={n} s={11} />{n}</div>;
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Vote Stats (人気チーム投票状況サマリ)
// ═══════════════════════════════════════════════════════════
function VoteStats({ teamStats }) {
  var n = teamStats.n || 0;
  var stat = teamStats.stat;
  var pct = function (c) { return n > 0 ? Math.round((c / n) * 100) : 0; };

  var topBreakout = useMemo(function () {
    return Object.values(stat).slice().sort(function (a, b) { return b.breakout - a.breakout || b.r1 - a.r1; }).slice(0, 16);
  }, [stat]);
  var topOshi = useMemo(function () {
    return Object.values(stat).filter(function (s) { return s.oshi > 0; }).sort(function (a, b) { return b.oshi - a.oshi; }).slice(0, 12);
  }, [stat]);

  return (
    <div className="fade-in">
      {/* 突破予想ランキング */}
      <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 4 }}>🔥 突破予想が多いチーム</div>
      <div style={{ fontSize: 11, color: $.dim, marginBottom: 10 }}>各チームを1位or2位（＝突破）に予想した人数。バーは濃=1位票・淡=2位票の内訳。</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 26 }}>
        {topBreakout.map(function (s, i) {
          return (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: $.card, border: "1px solid " + $.border }}>
              <span style={{ fontFamily: fontH, fontSize: 14, color: $.dim, width: 22, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, width: 120, flexShrink: 0, fontSize: 13, fontWeight: 600 }}><Fl n={s.n} s={16} />{s.n}</span>
              <div style={{ flex: 1, display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,.06)", minWidth: 40 }}>
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
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: $.card, border: "1px solid " + $.border }}>
                <span style={{ fontFamily: fontH, fontSize: 14, color: $.dim, width: 22, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, width: 120, flexShrink: 0, fontSize: 13, fontWeight: 600 }}><Fl n={s.n} s={16} />{s.n}</span>
                <div style={{ flex: 1, display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,.06)", minWidth: 40 }}>
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
function LiveTab({ tour, liveStarted }) {
  var phase = (tour && tour.phase) || "pre";
  var groups = (tour && tour.groups) || {};
  var ko = (tour && tour.ko) || {};
  var lastUpd = tour && tour.last_api_update;

  // 実データからブラケット表示用に派生
  var liveGl = useMemo(function () { return deriveGlFromTour(groups); }, [groups]);
  var liveTp = useMemo(function () { return deriveTpFromTour(ko, groups); }, [ko, groups]);
  var liveLeftRes = useMemo(function () { try { return LR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s) { return resolveSeed(s, liveGl, liveTp); }) }; }); } catch (e) { return []; } }, [liveGl, liveTp]);
  var liveRightRes = useMemo(function () { try { return RR32.map(function (m) { return { id: m.id, seeds: m.s, teams: m.s.map(function (s) { return resolveSeed(s, liveGl, liveTp); }) }; }); } catch (e) { return []; } }, [liveGl, liveTp]);
  var liveLeftD = useMemo(function () { return deriveRounds(liveLeftRes, ko); }, [liveLeftRes, ko]);
  var liveRightD = useMemo(function () { return deriveRounds(liveRightRes, ko); }, [liveRightRes, ko]);
  // 読み取り専用 ctx（クリック無効）
  var noop = function () {};
  var liveCtx = { ko: ko, des: { A: null, B: null, C: null }, adv: noop, gl: liveGl, tp: liveTp, pick3: noop, setAg: noop };

  return (
    <div className="fade-in">
      <Sec icon="📡" title="大会途中経過" sub={"現在のフェーズ: " + (PHASE_LABEL[phase] || phase) + (lastUpd ? "　/　最終更新: " + new Date(lastUpd).toLocaleString("ja-JP") : "")} />

      {!liveStarted && (
        <div style={{ padding: 40, textAlign: "center", color: $.dim, border: "1px dashed " + $.border, borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>⚽ まだ大会開幕前です</div>
          <p style={{ fontSize: 12 }}>2026年6月11日キックオフ予定。試合が始まると、ここに結果が自動で反映されます。</p>
        </div>
      )}

      {Object.keys(groups).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 10 }}>📊 グループ星取表</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {Object.keys(GRP).map(function (g) {
              var rows = groups[g];
              if (!rows || !rows.length) return null;
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
                        <th style={{ padding: "4px 4px" }}>得失</th>
                        <th style={{ padding: "4px 8px", color: $.gold }}>勝点</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(function (r, i) {
                        var diff = (r.gf || 0) - (r.ga || 0);
                        var qual = i < 2;
                        return (
                          <tr key={r.n + i} style={{ borderTop: "1px solid " + $.border, background: qual ? "rgba(34,197,94,.06)" : "transparent" }}>
                            <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}><Fl n={r.n} s={12} />{r.n}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center", color: $.dim }}>{r.mp || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.w || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.d || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center" }}>{r.l || 0}</td>
                            <td style={{ padding: "4px 4px", textAlign: "center", color: diff > 0 ? $.pitchL : diff < 0 ? $.redL : $.dim }}>{diff > 0 ? "+" : ""}{diff}</td>
                            <td style={{ padding: "4px 8px", textAlign: "center", color: $.gold, fontWeight: 700 }}>{r.pts || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {liveStarted && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: $.gold, marginBottom: 10 }}>🏆 決勝トーナメント進行</div>
          <BView leftRes={liveLeftRes} rightRes={liveRightRes} leftD={liveLeftD} rightD={liveRightD} ko={ko} ctx={liveCtx} />
          {ko.sf && ko.sf.length >= 2 && <ThirdP ko={ko} adv={noop} />}
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
      <div className="sec-title" style={{ fontFamily: fontH, fontSize: 22, letterSpacing: 5, color: $.gold, textShadow: "0 0 12px rgba(245,197,24,.25)" }}>{title}</div>
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
  return (
    <div>
      <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid " + $.border, background: $.card }}>
        <TR t={m.teams[0]} stage="r32" ctx={ctx} seed={m.seeds[0]} />
        <TR t={m.teams[1]} stage="r32" ctx={ctx} seed={m.seeds[1]} />
      </div>
      {has3 && (
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
      @keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 24px rgba(245,197,24,.45)}50%{transform:scale(1.04);box-shadow:0 0 36px rgba(245,197,24,.7)}}
      @keyframes pulseGlow{0%,100%{text-shadow:0 0 20px rgba(245,197,24,.5)}50%{text-shadow:0 0 36px rgba(245,197,24,.85)}}
      .fade-in{animation:fadeUp .5s ease both}
      .pulse-glow{animation:pulseGlow 2.5s ease-in-out infinite}
      .qv-card:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.4)}
      .qv-chip:hover{transform:translateY(-1px);filter:brightness(1.15)}

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
      }
    ` }} />
  );
}
