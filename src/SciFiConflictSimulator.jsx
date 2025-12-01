// ==========================
// PART 1 — IMPORTS & UTILS
// ==========================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Users,
  Cpu,
  Shield,
  Droplet,
  Heart,
  Swords,
  Handshake,
  AlertTriangle,
  Sunrise,
  CloudRain,
} from 'lucide-react';

// 초기 랜덤 범위
const INITIAL_RANGES = {
  population: [800, 1500],
  technology: [30, 80],
  military: [80, 150],
  resources: [800, 1500],
  energy: [80, 150],
  morale: [70, 95],
  aggressiveness: [40, 75],
  diplomacy: [40, 75],
  baseSurvivalInstinct: [40, 70],
  baseDevelopmentDesire: [40, 70],
};

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// 숫자 포맷
const formatNumber = (num) => {
  if (num === Infinity || isNaN(num) || num <= 0) return '0';
  if (num >= 10 ** 15) return 'SINGULARITY';

  const units = [
    { v: 10 ** 15, s: 'P' },
    { v: 10 ** 12, s: 'T' },
    { v: 10 ** 9, s: 'B' },
    { v: 10 ** 6, s: 'M' },
    { v: 10 ** 3, s: 'K' },
  ];
  for (const u of units) {
    if (num >= u.v) return (num / u.v).toFixed(1) + u.s;
  }
  return Math.round(num).toString();
};

// 기본 초기 문명 생성
const getRandomInitialCiv = (name, color, accent) => ({
  name,
  population: getRandomInt(...INITIAL_RANGES.population).toString(), // 문자열로 저장
  technology: getRandomInt(...INITIAL_RANGES.technology).toString(),
  military: getRandomInt(...INITIAL_RANGES.military).toString(),
  resources: getRandomInt(...INITIAL_RANGES.resources).toString(),
  energy: getRandomInt(...INITIAL_RANGES.energy).toString(),
  morale: getRandomInt(...INITIAL_RANGES.morale).toString(),

  aggressiveness: getRandomInt(...INITIAL_RANGES.aggressiveness).toString(),
  diplomacy: getRandomInt(...INITIAL_RANGES.diplomacy).toString(),

  baseSurvivalInstinct: getRandomInt(
    ...INITIAL_RANGES.baseSurvivalInstinct
  ).toString(),
  baseDevelopmentDesire: getRandomInt(
    ...INITIAL_RANGES.baseDevelopmentDesire
  ).toString(),

  color,
  accent,

  // runtime 값
  isSingularity: false,
  isAsteroidMining: false,
});
// ==========================
// PART 2 — MAIN SIMULATION LOGIC
// ==========================

// ---------- 이벤트 로그 관리 ----------
const MAX_LOG = 500;

const useEventLog = () => {
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((msg) => {
    setLogs((prev) => {
      const next = [...prev, msg];
      if (next.length > MAX_LOG) next.shift();
      return next;
    });
  }, []);

  return { logs, addLog };
};

// ---------- 상태 정의 ----------
const STATES = {
  PEACE: 'PEACE',
  WAR: 'WAR',
  RECON: 'RECONSTRUCTION',
};

// ---------- 강도 기반 전쟁 판단 함수 ----------
const warLikelihood = (a, b) => {
  const diffAgg = a.aggressiveness - b.diplomacy;
  if (diffAgg > 40) return 0.9;
  if (diffAgg > 25) return 0.65;
  if (diffAgg > 10) return 0.35;
  return 0.15;
};

// ---------- updateCiv (문명 변화 핵심) ----------
function updateCiv(prev, enemy, state, time, addEvent) {
  const newCiv = { ...prev };

  // 문자열 → 숫자 파싱 (입력값을 문자열로 저장했기 때문)
  let population = parseFloat(prev.population) || 0;
  let technology = parseFloat(prev.technology) || 0;
  let military = parseFloat(prev.military) || 0;
  let resources = parseFloat(prev.resources) || 0;
  let energy = parseFloat(prev.energy) || 0;
  let morale = parseFloat(prev.morale) || 0;

  let aggressiveness = parseFloat(prev.aggressiveness) || 0;
  let diplomacy = parseFloat(prev.diplomacy) || 0;

  let baseSurvivalInstinct = parseFloat(prev.baseSurvivalInstinct) || 50;
  let baseDevelopmentDesire = parseFloat(prev.baseDevelopmentDesire) || 50;

  // 안정 범위 보정
  const survivalInstinct = Math.max(10, Math.min(90, baseSurvivalInstinct));
  const developmentDesire = Math.max(10, Math.min(90, baseDevelopmentDesire));

  // ---------- 기초 자연 성질 ----------
  const totalGrowthFactor = 0.01;
  const baseProd = population * 0.05 + technology * 0.25;
  const baseCost = military * 0.28 + population * 0.015;

  // ---------- 에너지 업데이트 ----------
  let energyGain = technology * 0.03;
  let energyCost = population * 0.02 + military * 0.015;

  if (state === STATES.RECON) {
    energyGain *= 1.6;
    energyCost *= 0.85;
  }

  energy += energyGain - energyCost;
  if (energy < 0) energy = 0;

  // ---------- 자원 업데이트 ----------
  let asteroidMiningGain = 0;
  if (state === STATES.RECON && technology > 80) {
    asteroidMiningGain = Math.max(20, technology * 0.8);
    resources += asteroidMiningGain;

    if (time % 8 === 0) {
      addEvent(`[ASTEROID MINING] ${prev.name} mined ${Math.round(asteroidMiningGain)} resources.`);
    }
  }

  let finalGain = baseProd * totalGrowthFactor * developmentDesire * 0.06;

  let finalCost = baseCost / Math.sqrt(survivalInstinct);
  if (state === STATES.RECON) finalCost *= 0.65;

  resources += finalGain - finalCost;
  if (resources < 0) resources = 0;

  // ---------- 자원 부족 시 인구/군사 감소 ----------
  if (resources < 200) {
    const shortage = (200 - resources) / 200;

    const popLossRate = 0.01 + shortage * 0.025; // 1% ~ 3.5%
    const milLossRate = 0.02 + shortage * 0.05;  // 2% ~ 7%

    const popLoss = population * popLossRate;
    const milLoss = military * milLossRate;

    population = Math.max(0, population - popLoss);
    military = Math.max(0, military - milLoss);
    morale = Math.max(0, morale - (1 + shortage * 6));

    if (time % 10 === 0) {
      addEvent(
        `[RESOURCE CRISIS] ${prev.name} suffers losses (Pop -${(popLossRate*100).toFixed(1)}%, Mil -${(milLossRate*100).toFixed(1)}%).`
      );
    }
  }

  // ---------- 인구 & 기술 진화 ----------
  let popGrowthRate = 0.008 * (morale / 100);
  if (state === STATES.RECON) popGrowthRate *= 1.5;

  population += population * popGrowthRate;

  // 특이점 느리게
  let techGrowthBase = 0.03 + Math.log(1 + energy) * 0.0026;

  if (state === STATES.PEACE) techGrowthBase *= 1.15;
  if (state === STATES.RECON) techGrowthBase *= 1.4;
  if (state === STATES.WAR) techGrowthBase *= 0.8;

  technology += technology * techGrowthBase;

  // 특이점 폭주 억제
  if (technology > 250000) technology *= 0.9992;

  // ---------- 군사 업데이트 ----------
  let milGrowth = (technology / 180) * 0.06 + population * 0.0008;
  if (state === STATES.WAR) milGrowth *= 1.2;
  if (state === STATES.RECON) milGrowth *= 1.5;
  military += milGrowth;

  // ---------- 사기 ----------
  if (state === STATES.WAR) morale -= 0.25;
  if (state === STATES.RECON) morale += 0.4;
  if (state === STATES.PEACE) morale += 0.15;

  morale = Math.max(0, Math.min(100, morale));

  // ---------- 특이점 체크 ----------
  let isSingularity = technology >= 10 ** 15;

  // ---------- 숫자 → 문자열로 다시 저장 ----------
  newCiv.population = population.toString();
  newCiv.technology = technology.toString();
  newCiv.military = military.toString();
  newCiv.resources = resources.toString();
  newCiv.energy = energy.toString();
  newCiv.morale = morale.toString();

  newCiv.isSingularity = isSingularity;
  return newCiv;
}
// ==========================
// PART 3 — UI COMPONENTS
// ==========================

// -----------------------------
// 개별 문명 패널
// -----------------------------
const CivPanel = ({ civ, stateColor }) => {
  const population = parseFloat(civ.population) || 0;
  const tech = parseFloat(civ.technology) || 0;
  const mil = parseFloat(civ.military) || 0;
  const res = parseFloat(civ.resources) || 0;
  const energy = parseFloat(civ.energy) || 0;

  return (
    <div
      className="rounded-lg border border-gray-600 bg-gray-900 p-4 shadow-md
                 flex flex-col w-full max-w-xs mx-auto"
      style={{ color: civ.color }}
    >
      <div className="text-center text-lg font-bold mb-2">{civ.name}</div>

      <div className="flex justify-center mb-3">
        <span
          className="px-3 py-1 rounded text-sm font-bold"
          style={{
            backgroundColor: stateColor,
            color: "#fff",
          }}
        >
          ONLINE
        </span>
      </div>

      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span>Population</span>
          <span>{formatNumber(population)}</span>
        </div>
        <div className="flex justify-between">
          <span>Technology</span>
          <span>{formatNumber(tech)}</span>
        </div>
        <div className="flex justify-between">
          <span>Military</span>
          <span>{formatNumber(mil)}</span>
        </div>
        <div className="flex justify-between">
          <span>Resources</span>
          <span>{formatNumber(res)}</span>
        </div>
        <div className="flex justify-between">
          <span>Energy</span>
          <span>{formatNumber(energy)}</span>
        </div>
        <div className="flex justify-between">
          <span>Morale</span>
          <span>{civ.morale}</span>
        </div>
      </div>
    </div>
  );
};

// -----------------------------
// 시스템 허브(가운데 전쟁/평화 상태 패널)
// -----------------------------
const SystemHub = ({ state }) => {
  const color =
    state === STATES.WAR
      ? "#ff4444"
      : state === STATES.RECON
      ? "#44c0ff"
      : "#44ff88";

  return (
    <div
      className="rounded-lg px-6 py-4 font-bold text-xl shadow-md text-center"
      style={{
        backgroundColor: color,
        color: "#000",
      }}
    >
      {state}
    </div>
  );
};

// -----------------------------
// 발사체(미사일) 컴포넌트
// -----------------------------
const Missile = ({ x, y, color }) => {
  return (
    <div
      className="absolute h-2 w-2 rounded-full"
      style={{
        left: x,
        top: y,
        backgroundColor: color,
      }}
    />
  );
};

// -----------------------------
// 전장 컨테이너 (B안 — 반응형 축소 scale)
// -----------------------------
const Battlefield = ({
  civA,
  civB,
  missiles,
  state,
}) => {
  // 화면 크기에 따라 전장 축소비율 조정
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 480) setScale(0.6);
      else if (w < 768) setScale(0.75);
      else if (w < 1024) setScale(0.85);
      else setScale(1);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const panelColorA = civA.accent;
  const panelColorB = civB.accent;

  return (
    <div
      className="relative mx-auto my-4"
      style={{
        width: "100%",
        maxWidth: "900px",
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
    >
      {/* 양쪽 문명 패널 */}
      <div className="w-full flex justify-between items-start px-4">
        <CivPanel civ={civA} stateColor={panelColorA} />
        <CivPanel civ={civB} stateColor={panelColorB} />
      </div>

      {/* 허브 */}
      <div className="w-full flex justify-center mt-4 mb-6">
        <SystemHub state={state} />
      </div>

      {/* 미사일들 */}
      <div className="absolute inset-0 pointer-events-none">
        {missiles.map((m, i) => (
          <Missile key={i} x={m.x} y={m.y} color={m.color} />
        ))}
      </div>
    </div>
  );
};

// -----------------------------
// 통계 그래프 (SVG)
// -----------------------------
const StatsChart = ({ history }) => {
  // history는 time별 기록 배열

  if (history.length < 2) return null;

  const width = 800;
  const height = 160;
  const margin = 20;

  const xs = history.map((_, i) => i);
  const popA = history.map((h) => parseFloat(h.A.population) || 0);
  const popB = history.map((h) => parseFloat(h.B.population) || 0);

  const maxVal = Math.max(...popA, ...popB, 1);

  const scaleX = (i) => (i / history.length) * (width - margin * 2) + margin;
  const scaleY = (v) =>
    height - margin - (v / maxVal) * (height - margin * 2);

  const makePath = (arr) =>
    arr
      .map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)},${scaleY(v)}`)
      .join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* A 문명 */}
      <path d={makePath(popA)} stroke="#44aaff" fill="none" strokeWidth="2" />
      {/* B 문명 */}
      <path d={makePath(popB)} stroke="#ff6666" fill="none" strokeWidth="2" />
    </svg>
  );
};
// ==========================
// PART 4 — FULL APP COMPONENT
// ==========================

export default function SciFiConflictSimulator() {
  const { logs, addLog } = useEventLog();

  // 초기 civ state (문자열 기반)
  const [civA, setCivA] = useState(
    getRandomInitialCiv("CIV A", "#88ccff", "#3399ff")
  );
  const [civB, setCivB] = useState(
    getRandomInitialCiv("CIV B", "#ff9999", "#ff5555")
  );

  // 그래프 기록
  const [history, setHistory] = useState([]);

  // 전쟁 상태
  const [state, setState] = useState(STATES.PEACE);

  // 미사일
  const [missiles, setMissiles] = useState([]);

  // 시간
  const [time, setTime] = useState(0);

  // 실행 여부
  const [isRunning, setIsRunning] = useState(false);

  // tick 속도 (ms)
  const [speed, setSpeed] = useState(200);

  // ==========================
  // 입력 핸들러 (문자열 → 실시간 반영)
  // ==========================
  const handleCivInput = (civSetter, key, rawValue) => {
    civSetter((prev) => ({
      ...prev,
      [key]: rawValue, // 문자열 그대로 저장
    }));
  };

  // ==========================
  // 시뮬레이션 Tick
  // ==========================
  const tick = useCallback(() => {
    setTime((t) => t + 1);
  }, []);

  // ==========================
  // 메인 Loop
  // ==========================
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [isRunning, speed, tick]);

  // ==========================
  // 시간 변화에 따른 시뮬레이션
  // ==========================
  useEffect(() => {
    if (!isRunning && time !== 0) return;

    // 전쟁/평화 전환
    const A_agg = parseFloat(civA.aggressiveness) || 0;
    const B_agg = parseFloat(civB.aggressiveness) || 0;
    const A_dip = parseFloat(civA.diplomacy) || 0;
    const B_dip = parseFloat(civB.diplomacy) || 0;

    const A_likely = warLikelihood(
      { aggressiveness: A_agg, diplomacy: A_dip },
      { aggressiveness: B_agg, diplomacy: B_dip }
    );
    const B_likely = warLikelihood(
      { aggressiveness: B_agg, diplomacy: B_dip },
      { aggressiveness: A_agg, diplomacy: A_dip }
    );

    const aggregate = (A_likely + B_likely) / 2;

    if (state === STATES.PEACE && aggregate > 0.55) {
      setState(STATES.WAR);
      addLog(`[WAR] War has begun!`);
    } else if (state === STATES.WAR && aggregate < 0.25) {
      setState(STATES.RECON);
      addLog(`[RECON] Starting reconstruction.`);
    } else if (state === STATES.RECON && aggregate < 0.15) {
      setState(STATES.PEACE);
      addLog(`[PEACE] Peace restored.`);
    }

    // -------------------------
    // Civ 업데이트
    // -------------------------
    const nextA = updateCiv(civA, civB, state, time, addLog);
    const nextB = updateCiv(civB, civA, state, time, addLog);

    setCivA(nextA);
    setCivB(nextB);

    // -------------------------
    // 그래프 기록
    // -------------------------
    setHistory((h) => {
      const next = [...h, { A: nextA, B: nextB }];
      if (next.length > 800) next.shift();
      return next;
    });

    // -------------------------
    // 미사일 발사 (전쟁중일 때만)
    // -------------------------
    if (state === STATES.WAR) {
      setMissiles((prev) => {
        const newOne = {
          x: Math.random() * 300 + 100,
          y: Math.random() * 150 + 50,
          color: Math.random() < 0.5 ? civA.accent : civB.accent,
          life: 30,
        };
        return [...prev, newOne];
      });
    }

    // 미사일 이동/수명 감소
    setMissiles((prev) =>
      prev
        .map((m) => ({
          ...m,
          y: m.y + (Math.random() * 3 - 1.5),
          x: m.x + (Math.random() * 3 - 1.5),
          life: m.life - 1,
        }))
        .filter((m) => m.life > 0)
    );
  }, [time]);

  // ==========================
  // 초기화
  // ==========================
  const reset = () => {
    setCivA(getRandomInitialCiv("CIV A", "#88ccff", "#3399ff"));
    setCivB(getRandomInitialCiv("CIV B", "#ff9999", "#ff5555"));
    setHistory([]);
    setMissiles([]);
    setState(STATES.PEACE);
    setTime(0);
    addLog(`[RESET] Simulation reset.`);
  };

  // ==========================
  // 렌더링
  // ==========================
  return (
    <div className="w-full min-h-screen bg-black text-gray-200 p-4">

      {/* 상단 입력 영역 */}
      <div className="flex flex-wrap justify-center gap-6 mb-6">
        {/* CIV A 초기값 */}
        <div className="p-4 border border-gray-600 rounded-lg bg-gray-900 max-w-xs">
          <div className="text-center font-bold mb-2" style={{ color: civA.accent }}>
            CIV A SETTINGS
          </div>
          {Object.keys(civA).map((k) =>
            typeof civA[k] === "string" ? (
              <div key={k} className="flex justify-between mb-1">
                <span>{k}</span>
                <input
                  value={civA[k]}
                  onChange={(e) => handleCivInput(setCivA, k, e.target.value)}
                  className="w-20 bg-gray-800 text-right px-2 rounded border border-gray-700"
                />
              </div>
            ) : null
          )}
        </div>

        {/* CIV B 초기값 */}
        <div className="p-4 border border-gray-600 rounded-lg bg-gray-900 max-w-xs">
          <div className="text-center font-bold mb-2" style={{ color: civB.accent }}>
            CIV B SETTINGS
          </div>
          {Object.keys(civB).map((k) =>
            typeof civB[k] === "string" ? (
              <div key={k} className="flex justify-between mb-1">
                <span>{k}</span>
                <input
                  value={civB[k]}
                  onChange={(e) => handleCivInput(setCivB, k, e.target.value)}
                  className="w-20 bg-gray-800 text-right px-2 rounded border border-gray-700"
                />
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          className="px-4 py-2 bg-green-600 rounded shadow"
          onClick={() => setIsRunning(true)}
        >
          <Play className="inline-block mr-1" /> Start
        </button>

        <button
          className="px-4 py-2 bg-yellow-600 rounded shadow"
          onClick={() => setIsRunning(false)}
        >
          <Pause className="inline-block mr-1" /> Pause
        </button>

        <button
          className="px-4 py-2 bg-red-600 rounded shadow"
          onClick={reset}
        >
          <RotateCcw className="inline-block mr-1" /> Reset
        </button>
      </div>

      {/* 속도 조절 */}
      <div className="flex justify-center items-center gap-3 mb-8">
        <span>Speed:</span>
        <input
          type="range"
          min="30"
          max="800"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
        />
        <span>{speed} ms</span>
      </div>

      {/* 전장 */}
      <Battlefield
        civA={civA}
        civB={civB}
        missiles={missiles}
        state={state}
      />

      {/* 그래프 */}
      <div className="w-full max-w-3xl mx-auto my-10">
        <StatsChart history={history} />
      </div>

      {/* 로그 */}
      <div className="w-full max-w-3xl mx-auto border border-gray-700 rounded bg-gray-900 p-3 text-sm h-64 overflow-y-auto">
        {logs.map((l, i) => (
          <div key={i} className="mb-1">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
