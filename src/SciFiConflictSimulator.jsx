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

// =================================================================================
// 초기 값 범위 설정
// =================================================================================
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

const getRandomInitialCiv = (name, color, accent) => ({
  name,
  population: getRandomInt(...INITIAL_RANGES.population),
  technology: getRandomInt(...INITIAL_RANGES.technology),
  military: getRandomInt(...INITIAL_RANGES.military),
  resources: getRandomInt(...INITIAL_RANGES.resources),
  energy: getRandomInt(...INITIAL_RANGES.energy),
  morale: getRandomInt(...INITIAL_RANGES.morale),
  aggressiveness: getRandomInt(...INITIAL_RANGES.aggressiveness),
  diplomacy: getRandomInt(...INITIAL_RANGES.diplomacy),
  baseSurvivalInstinct: getRandomInt(...INITIAL_RANGES.baseSurvivalInstinct),
  baseDevelopmentDesire: getRandomInt(
    ...INITIAL_RANGES.baseDevelopmentDesire,
  ),
  color,
  accent,
  isSingularity: false,
  isAsteroidMining: false,
});

// =================================================================================
// 본능 요소 계산
// =================================================================================
const calculateInstinctFactors = (civ) => {
  const normalizedResource = Math.min(1, civ.resources / 5000);
  const normalizedMorale = civ.morale / 100;
  const normalizedTech = Math.min(1, civ.technology / 500);

  const lowStatusBoost =
    Math.max(0, 1 - normalizedResource * normalizedMorale) * 1.5;
  const highStatusBoost = Math.max(0, normalizedTech * normalizedResource) * 1.5;

  const userBaseSurvival = civ.baseSurvivalInstinct / 100;
  const userBaseDevelopment = civ.baseDevelopmentDesire / 100;

  const survivalInstinct = 1.0 + userBaseSurvival * 0.5 + lowStatusBoost;
  const developmentDesire = 1.0 + userBaseDevelopment * 0.5 + highStatusBoost;

  return { survivalInstinct, developmentDesire };
};

const getInitialState = (civ1, civ2) => {
  const factors1 = calculateInstinctFactors(civ1);
  const factors2 = calculateInstinctFactors(civ2);

  return [
    {
      time: 0,
      civ1Pop: civ1.population,
      civ2Pop: civ2.population,
      civ1Tech: civ1.technology,
      civ2Tech: civ2.technology,
      civ1Military: civ1.military,
      civ2Military: civ2.military,
      civ1Resources: civ1.resources,
      civ2Resources: civ2.resources,
      civ1Energy: civ1.energy,
      civ2Energy: civ2.energy,
      civ1Morale: civ1.morale,
      civ2Morale: civ2.morale,
      civ1SurvivalInstinct: factors1.survivalInstinct,
      civ2SurvivalInstinct: factors2.survivalInstinct,
      civ1DevelopmentDesire: factors1.developmentDesire,
      civ2DevelopmentDesire: factors2.developmentDesire,
    },
  ];
};

// 숫자 포맷
const formatNumber = (num) => {
  if (num === Infinity || isNaN(num) || num <= 0) return '0';

  if (num >= 10_000_000_000_000_000) return 'SINGULARITY';

  const units = [
    { v: 1_000_000_000_000_000, s: 'P' },
    { v: 10_000_000_000_000, s: 'T' },
    { v: 1_000_000_000_000, s: 'G' },
    { v: 1_000_000_000, s: 'B' },
    { v: 1_000_000, s: 'M' },
    { v: 1_000, s: 'K' },
  ];

  for (const u of units) {
    if (num >= u.v) return (num / u.v).toFixed(1) + u.s;
  }

  return Math.round(num).toString();
};

const SciFiConflictSimulator = () => {
  const [initialCiv1, setInitialCiv1] = useState(() =>
    getRandomInitialCiv('Civilization Aethel', '#3b82f6', 'ring-blue-500'),
  );
  const [initialCiv2, setInitialCiv2] = useState(() =>
    getRandomInitialCiv('Federation Xylo', '#ef4444', 'ring-red-500'),
  );

  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [civ1, setCiv1] = useState(initialCiv1);
  const [civ2, setCiv2] = useState(initialCiv2);
  const [history, setHistory] = useState(() =>
    getInitialState(initialCiv1, initialCiv2),
  );
  const [warStatus, setWarStatus] = useState('PEACE');
  const [events, setEvents] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [extinctCiv, setExtinctCiv] = useState(null);
  const [activeEvent, setActiveEvent] = useState({ civ1: null, civ2: null });

  const addEvent = useCallback((message, t) => {
    setEvents((prev) => [{ time: t, message }, ...prev]);
  }, []);

  // PAUSE + time 0에서만 초기값 동기화
  useEffect(() => {
    if (!isRunning && time === 0) {
      setCiv1(initialCiv1);
      setCiv2(initialCiv2);
    }
  }, [isRunning, time, initialCiv1, initialCiv2]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTime(0);
    setExtinctCiv(null);
    setEvents([]);
    setWarStatus('PEACE');
    setProjectiles([]);
    setActiveEvent({ civ1: null, civ2: null });

    const newInitialCiv1 = getRandomInitialCiv(
      'Civilization Aethel',
      '#3b82f6',
      'ring-blue-500',
    );
    const newInitialCiv2 = getRandomInitialCiv(
      'Federation Xylo',
      '#ef4444',
      'ring-red-500',
    );

    setInitialCiv1(newInitialCiv1);
    setInitialCiv2(newInitialCiv2);
    setCiv1(newInitialCiv1);
    setCiv2(newInitialCiv2);
    setHistory(getInitialState(newInitialCiv1, newInitialCiv2));
  }, []);

  const startSimulation = useCallback(() => {
    setExtinctCiv(null);
    setTime(0);
    setEvents([]);
    setWarStatus('PEACE');
    setProjectiles([]);
    setActiveEvent({ civ1: null, civ2: null });
    setHistory(getInitialState(civ1, civ2));
    setIsRunning(true);
  }, [civ1, civ2]);

  const calculateBaseMilitary = useCallback((civ) => {
    const populationBase = civ.population / 100;
    const resourceBase = civ.resources * 0.005;
    const techFactor = 1 + civ.technology / 500;

    const rawBaseStrength = (populationBase + resourceBase) * techFactor;
    const minFloor = 5;

    return Math.max(minFloor, Math.round(rawBaseStrength));
  }, []);

  // ==========================
  // 메인 시뮬레이션 루프
  // ==========================
  useEffect(() => {
    if (!isRunning || extinctCiv) return;

    const interval = setInterval(() => {
      const nextTime = time + 1;
      setTime(nextTime);

      const checkExtinction = (currentCiv) => {
        if (currentCiv.population <= 0) {
          setIsRunning(false);
          setExtinctCiv(currentCiv.name);
          addEvent(
            `[EXTINCTION] ${currentCiv.name} population reached zero. Simulation Halted.`,
            nextTime,
          );
          return true;
        }
        return false;
      };

      const updateEventState = (civKey, civ) => {
        let currentEvent = activeEvent[civKey];
        let newEvent = currentEvent;

        if (currentEvent) {
          if (currentEvent.type === 'RECON') {
            if (currentEvent.duration === 60) {
              addEvent(
                `[RECONSTRUCTION] ${civ.name}: civil infrastructure partially restored. Factories restart under tight rationing.`,
                nextTime,
              );
            } else if (currentEvent.duration === 50) {
              addEvent(
                `[RECONSTRUCTION] ${civ.name}: planetary energy grid stabilized. Power output begins to surge again.`,
                nextTime,
              );
            } else if (currentEvent.duration === 30) {
              addEvent(
                `[RECONSTRUCTION] ${civ.name}: technological networks reboot. Research hubs resume full operation.`,
                nextTime,
              );
            }
          }

          if (currentEvent.duration <= 1) {
            addEvent(
              `[STABILITY] ${civ.name} recovered from ${currentEvent.type}.`,
              nextTime,
            );
            newEvent = null;
          } else {
            newEvent = { ...currentEvent, duration: currentEvent.duration - 1 };
          }
        }

        if (!newEvent && nextTime % 25 === 0 && Math.random() < 0.15) {
          if (civ.resources < 500 && civ.morale < 50) {
            newEvent = { type: 'CRISIS', duration: 50 };
            addEvent(
              `[CRISIS] ${civ.name} suffers a resource/morale breakdown! Development severely hindered.`,
              nextTime,
            );
          } else if (civ.resources > 2000 && civ.technology > 200) {
            newEvent = { type: 'BOOM', duration: 40 };
            addEvent(
              `[BOOM] ${civ.name} enters a golden age of rapid expansion!`,
              nextTime,
            );
          }
        }

        return newEvent;
      };

      const updateCiv = (prev, other, currentEvent) => {
        if (prev.population <= 0) {
          return { ...prev, population: 0, military: 0, morale: 0 };
        }

        let newCiv = { ...prev };

        // --- 본능 계수 계산 ---
        const { survivalInstinct, developmentDesire } =
          calculateInstinctFactors(prev);
        newCiv.runtimeSurvivalInstinct = survivalInstinct;
        newCiv.runtimeDevelopmentDesire = developmentDesire;

        // 1. 특이점 로직
        const lastTech = prev.lastTech ?? prev.technology;
        const techGrowthRate = prev.technology - lastTech;

        let fastTechStreak = prev.fastTechStreak ?? 0;
        const growthThreshold = Math.max(220, prev.technology * 0.045);

        if (techGrowthRate > growthThreshold) {
          fastTechStreak += 1;
        } else {
          fastTechStreak = Math.max(0, fastTechStreak - 1);
        }

        newCiv.techGrowthRate = techGrowthRate;
        newCiv.fastTechStreak = fastTechStreak;
        newCiv.lastTech = prev.technology;

        if (!prev.isSingularity) {
          const hasHighBaseTech = prev.technology > 4800;
          const hasEnoughEnergy = prev.energy > 3200;
          const hasSustainedFastGrowth = fastTechStreak >= 70;

          if (hasHighBaseTech && hasEnoughEnergy && hasSustainedFastGrowth) {
            newCiv.isSingularity = true;
            addEvent(
              `[SINGULARITY] ${newCiv.name}'s technology escapes all conventional limits. Runaway growth phase initiated.`,
              nextTime,
            );
          }
        } else {
          newCiv.isSingularity = true;
        }

        // 2. 기본 성장/자원/에너지
        const growthMultiplier = newCiv.isSingularity ? 4.0 : 1.0;

        const popGrowthFactor = Math.min(2.0, prev.resources / 800);
        const totalGrowthFactor = growthMultiplier * popGrowthFactor;

        let popGrowth =
          prev.population *
          0.008 *
          popGrowthFactor *
          growthMultiplier *
          developmentDesire *
          (prev.morale / 80);

        let techGrowth =
          (0.3 + prev.energy / 500) * totalGrowthFactor * developmentDesire;

        let resourceGain =
          (prev.population * 0.05 + prev.technology * 0.2) *
          totalGrowthFactor *
          developmentDesire;

        const baseResourceCost =
          prev.military * 0.3 + prev.population * 0.02;

        let resourceCost =
          baseResourceCost / Math.pow(survivalInstinct, 0.5);

        let militaryGain = 0;
        let moraleBoost = 0;

        if (warStatus === 'PEACE') {
          militaryGain =
            (prev.technology * 0.05 +
              prev.resources * 0.005 +
              prev.aggressiveness * 0.05) *
            popGrowthFactor *
            survivalInstinct;
          moraleBoost = 0.2 + prev.diplomacy * 0.01;
        }

        const baseEnergyGrowth =
          prev.technology * 0.25 + prev.resources * 0.005;
        let energyGain =
          baseEnergyGrowth * developmentDesire * totalGrowthFactor;

        // 3. 소행성 채굴 로직
        const ASTEROID_TECH_THRESHOLD = 800;
        const ASTEROID_START_RESOURCE = 1200;
        let asteroidActive = prev.isAsteroidMining || false;

        if (
          !asteroidActive &&
          prev.technology >= ASTEROID_TECH_THRESHOLD &&
          prev.resources < ASTEROID_START_RESOURCE
        ) {
          asteroidActive = true;
          addEvent(
            `[ASTEROID MINING START] ${prev.name} launches continuous off-world mining fleets.`,
            nextTime,
          );
        }

        if (asteroidActive) {
          const miningEfficiency = 1.2;
          const techFactor = Math.max(
            0,
            prev.technology - ASTEROID_TECH_THRESHOLD,
          );
          const baseAsteroidGain =
            techFactor * miningEfficiency + prev.population * 0.4;
          const asteroidGain = Math.max(50, baseAsteroidGain);

          resourceGain += asteroidGain;
          resourceCost *= 0.4;

          if (nextTime % 20 === 0) {
            addEvent(
              `[ASTEROID MINING] ${prev.name} extracts off-world resources (+${Math.round(
                asteroidGain,
              )} /tick, upkeep dampened).`,
              nextTime,
            );
          }

          const targetResource = Math.max(3000, prev.population * 2.5);
          const expectedDelta = resourceGain - resourceCost;

          if (prev.resources >= targetResource && expectedDelta > 0) {
            asteroidActive = false;
            addEvent(
              `[ASTEROID MINING END] ${prev.name} winds down mining operations as reserves stabilize.`,
              nextTime,
            );
          }
        }

        newCiv.isAsteroidMining = asteroidActive;

        // 4. 이벤트 효과
        if (currentEvent) {
          if (currentEvent.type === 'CRISIS') {
            popGrowth *= 0.1;
            techGrowth *= 0.2;
            militaryGain *= 0.1;
            energyGain *= 0.1;
            newCiv.resources = Math.max(
              0,
              (newCiv.resources ?? prev.resources) - 30,
            );
            newCiv.morale = Math.max(0, prev.morale - 1.0);
          } else if (currentEvent.type === 'BOOM') {
            const boomMultiplier = 2.0;
            popGrowth *= boomMultiplier;
            resourceGain *= boomMultiplier;
            militaryGain *= 2.0;
            techGrowth *= 1.5;
            energyGain *= 1.5;
            moraleBoost += 0.5;
          } else if (currentEvent.type === 'RECON') {
            const reconGrowthBoost = 1.3;
            const reconResourceBoost = 1.5;
            const reconEnergyBoost = 2.2;

            popGrowth *= 1.2;
            resourceGain *= reconResourceBoost;
            techGrowth *= reconGrowthBoost;
            energyGain *= reconEnergyBoost;
            militaryGain *= 1.3;
            moraleBoost += 0.7;
          }
        }

        // 5. 기본 값 적용
        newCiv.population = Math.max(0, prev.population + popGrowth);
        newCiv.technology = prev.technology + techGrowth;

        // === 자원 폭주 방지: 틱당 증감 상한 ===
        {
          const currentResources = newCiv.resources ?? prev.resources;
          const maxGainPerTick = Math.max(2000, currentResources * 0.5);
          if (resourceGain > maxGainPerTick) {
            resourceGain = maxGainPerTick;
          }
          const maxLossPerTick = Math.max(2000, currentResources * 0.7);
          if (resourceCost > maxLossPerTick) {
            resourceCost = maxLossPerTick;
          }
        }

        const baseResources = newCiv.resources ?? prev.resources;
        newCiv.resources = baseResources + resourceGain - resourceCost;

        if (!Number.isFinite(newCiv.resources)) {
          newCiv.resources = 0;
        }

        newCiv.resources = Math.max(0, newCiv.resources);

        const basePopEnergyCost = prev.population * 0.01;
        const popEnergyCost =
          currentEvent?.type === 'RECON'
            ? basePopEnergyCost * 0.5
            : basePopEnergyCost;

        newCiv.energy = prev.energy + energyGain - popEnergyCost;
        newCiv.energy = Math.max(0, newCiv.energy);

        // 6. 전쟁 시 군사/인구 손실
        if (warStatus === 'WAR') {
          const techDifference = other.technology - prev.technology;
          const powerRatio = other.military / (prev.military + 1);

          const baseLoss = Math.random() * 5 + 2;
          const lossModifier = 1 + Math.max(0, powerRatio - 1) * 0.5;
          const techPenalty = Math.max(0, techDifference * 0.05);

          const militaryLoss = Math.max(
            0,
            baseLoss * lossModifier + techPenalty,
          );

          const dynamicMinMilitary = calculateBaseMilitary(prev);
          newCiv.military = Math.max(
            dynamicMinMilitary,
            prev.military - militaryLoss,
          );

          const popLoss = Math.random() * 2.5 * lossModifier;
          newCiv.population = Math.max(0, newCiv.population - popLoss);

          newCiv.resources = Math.max(
            0,
            newCiv.resources - (20 + popLoss * 5),
          );

          const moraleHit = 1.0 + popLoss * 0.1;
          newCiv.morale = Math.max(
            0,
            (newCiv.morale ?? prev.morale) - moraleHit,
          );

          if (nextTime % 15 === 0 && militaryLoss > 10) {
            addEvent(
              `[LOSSES] ${prev.name} suffered heavy military losses (${Math.round(
                militaryLoss,
              )} units). Stability declining.`,
              nextTime,
            );
          }
        } else {
          newCiv.military = prev.military + militaryGain;
          newCiv.morale = Math.min(
            100,
            (newCiv.morale ?? prev.morale) + moraleBoost,
          );
        }

        // 7. 자원 부족 시 인구/군사 감소 (완만한 형태)
        const RESOURCE_CRISIS_THRESHOLD = 200;

        if (newCiv.resources < RESOURCE_CRISIS_THRESHOLD) {
          const shortageRatio =
            (RESOURCE_CRISIS_THRESHOLD - newCiv.resources) /
            RESOURCE_CRISIS_THRESHOLD;

          const starvationRate = 0.005 * (1 + 3 * shortageRatio);
          const demobilizationRate = 0.02 * (1 + 3 * shortageRatio);

          const starvationLoss = newCiv.population * starvationRate;
          const demobilizationLoss = newCiv.military * demobilizationRate;

          if (starvationLoss > 0 || demobilizationLoss > 0) {
            newCiv.population = Math.max(
              0,
              newCiv.population - starvationLoss,
            );
            newCiv.military = Math.max(
              0,
              newCiv.military - demobilizationLoss,
            );

            const moraleDrop = 1.5 * (1 + 2.5 * shortageRatio);
            newCiv.morale = Math.max(0, newCiv.morale - moraleDrop);

            if (nextTime % 12 === 0) {
              addEvent(
                `[RESOURCE SHORTAGE] ${
                  prev.name
                } suffers controlled famine & demobilization (Pop -${Math.round(
                  starvationRate * 100,
                )}%, Mil -${Math.round(demobilizationRate * 100)}%).`,
                nextTime,
              );
            }
          }
        }

        // 8. 클램핑
        newCiv.morale = Math.min(100, Math.max(0, newCiv.morale));
        newCiv.military = Math.max(0, newCiv.military);

        return newCiv;
      };

      const event1 = updateEventState('civ1', civ1);
      const event2 = updateEventState('civ2', civ2);
      setActiveEvent({ civ1: event1, civ2: event2 });

      const newCiv1 = updateCiv(civ1, civ2, event1);
      const newCiv2 = updateCiv(civ2, civ1, event2);

      setCiv1(newCiv1);
      setCiv2(newCiv2);

      // 자원 교환
      const exchangeResources = (c1, c2) => {
        if (warStatus === 'PEACE' && c1.population > 0 && c2.population > 0) {
          const diplomacyFactor = (c1.diplomacy + c2.diplomacy) / 200;
          const baseTradeAmount = 50 * diplomacyFactor;

          let tradeC1 = 0;
          let tradeC2 = 0;

          if (c1.resources < c2.resources) {
            tradeC1 = Math.min(baseTradeAmount, c2.resources * 0.1);
            tradeC2 = -tradeC1;
          } else if (c2.resources < c1.resources) {
            tradeC2 = Math.min(baseTradeAmount, c1.resources * 0.1);
            tradeC1 = -tradeC2;
          }

          const techShare = 0.05 * diplomacyFactor;

          setCiv1((prev) => ({
            ...prev,
            resources: prev.resources + tradeC1,
            technology:
              prev.technology +
              (c2.technology > prev.technology ? techShare : 0),
          }));
          setCiv2((prev) => ({
            ...prev,
            resources: prev.resources + tradeC2,
            technology:
              prev.technology +
              (c1.technology > prev.technology ? techShare : 0),
          }));

          if ((tradeC1 !== 0 || tradeC2 !== 0) && nextTime % 50 === 0) {
            const tradeProjectiles = [];
            const MAX_PROJECTILES = 400;
            const TRADE_SCALE = 20;
            const MAX_TRADE_SHOTS = 25;

            if (tradeC1 > 0) {
              const shots = Math.min(
                MAX_TRADE_SHOTS,
                Math.max(1, Math.floor(tradeC1 / TRADE_SCALE)),
              );
              for (let i = 0; i < shots; i++) {
                tradeProjectiles.push({
                  id: Date.now() + Math.random() + `tL${i}`,
                  direction: 'left',
                  progress: 0,
                  spreadAngle: (Math.random() - 0.5) * 0.4,
                  color: '#22c55e',
                });
              }
            }

            if (tradeC2 > 0) {
              const shots = Math.min(
                MAX_TRADE_SHOTS,
                Math.max(1, Math.floor(tradeC2 / TRADE_SCALE)),
              );
              for (let i = 0; i < shots; i++) {
                tradeProjectiles.push({
                  id: Date.now() + Math.random() + `tR${i}`,
                  direction: 'right',
                  progress: 0,
                  spreadAngle: (Math.random() - 0.5) * 0.4,
                  color: '#22c55e',
                });
              }
            }

            if (tradeProjectiles.length > 0) {
              setProjectiles((prev) => {
                const combined = [...prev, ...tradeProjectiles];
                return combined.slice(-MAX_PROJECTILES);
              });
            }

            addEvent(
              `[TRADE] Resource exchange successful (Diplomacy: ${Math.round(
                diplomacyFactor * 100,
              )}).`,
              nextTime,
            );
          }
        }
      };

      exchangeResources(newCiv1, newCiv2);

      if (checkExtinction(newCiv1) || checkExtinction(newCiv2)) {
        return;
      }

      // 전쟁 선언 / 종전
      if (warStatus === 'PEACE' && nextTime % 25 === 0) {
        const aggressionSum = civ1.aggressiveness + civ2.aggressiveness;
        const diplomacyAvg = (civ1.diplomacy + civ2.diplomacy) / 2;
        const militaryRatio =
          Math.min(civ1.military, civ2.military) /
          Math.max(civ1.military, civ2.military);

        const chance =
          (aggressionSum / 200) * 0.4 -
          (diplomacyAvg / 100) * 0.2 +
          0.05 * militaryRatio;

        if (Math.random() < chance) {
          setWarStatus('WAR');
          const aggressor =
            civ1.aggressiveness > civ2.aggressiveness ? civ1 : civ2;
          addEvent(
            `[CRITICAL] ${aggressor.name} initiates hostilities (Aggro: ${Math.round(
              aggressor.aggressiveness,
            )}). WAR DECLARED.`,
            nextTime,
          );
        }
      }

      if (warStatus === 'WAR' && nextTime % 30 === 0) {
        const totalDiplomacy = civ1.diplomacy + civ2.diplomacy;
        const totalAggression = civ1.aggressiveness + civ2.aggressiveness;

        const peaceChance =
          (totalDiplomacy * 0.002) / (totalAggression * 0.002) * 0.2;

        if (Math.random() < 0.05 + peaceChance) {
          setWarStatus('PEACE');
          addEvent(
            '[DIPLOMACY] Peace Treaty Signed: Hostilities Cease.',
            nextTime,
          );
          setProjectiles([]);

          setActiveEvent((prev) => ({
            civ1:
              civ1.population > 0 ? { type: 'RECON', duration: 80 } : prev.civ1,
            civ2:
              civ2.population > 0 ? { type: 'RECON', duration: 80 } : prev.civ2,
          }));

          if (civ1.population > 0) {
            addEvent(
              `[RECONSTRUCTION] ${civ1.name} begins post-war rebuilding. Civic morale surges.`,
              nextTime,
            );
          }
          if (civ2.population > 0) {
            addEvent(
              `[RECONSTRUCTION] ${civ2.name} begins post-war rebuilding. Civic morale surges.`,
              nextTime,
            );
          }
        }
      }

      // 전쟁 중 발사체
      if (warStatus === 'WAR' && isRunning) {
        const FIRE_RATE = 5;

        if (nextTime % FIRE_RATE === 0) {
          const SCALE = 50;
          const MAX_SHOTS_PER_TICK = 50;
          const MAX_PROJECTILES = 400;

          const safeMil1 =
            Number.isFinite(civ1.military) && civ1.military > 0
              ? civ1.military
              : 0;
          const safeMil2 =
            Number.isFinite(civ2.military) && civ2.military > 0
              ? civ2.military
              : 0;

          const rawShots1 = Math.floor(safeMil1 / SCALE);
          const rawShots2 = Math.floor(safeMil2 / SCALE);

          const shots1 = Math.min(MAX_SHOTS_PER_TICK, rawShots1);
          const shots2 = Math.min(MAX_SHOTS_PER_TICK, rawShots2);

          const newProjectiles = [];

          for (let i = 0; i < shots1; i++) {
            const spreadFactor =
              safeMil1 > 0 ? Math.min(1, safeMil2 / safeMil1) : 0;
            newProjectiles.push({
              id: Date.now() + Math.random() + `a${i}`,
              direction: 'right',
              progress: 0,
              spreadAngle: (Math.random() - 0.5) * 0.5 * (1 + spreadFactor),
              color: initialCiv1.color,
            });
          }

          for (let i = 0; i < shots2; i++) {
            const spreadFactor =
              safeMil2 > 0 ? Math.min(1, safeMil1 / safeMil2) : 0;
            newProjectiles.push({
              id: Date.now() + Math.random() + `b${i}`,
              direction: 'left',
              progress: 0,
              spreadAngle: (Math.random() - 0.5) * 0.5 * (1 + spreadFactor),
              color: initialCiv2.color,
            });
          }

          if (newProjectiles.length > 0) {
            setProjectiles((prev) => {
              const combined = [...prev, ...newProjectiles];
              return combined.slice(-MAX_PROJECTILES);
            });
          }
        }
      }

      // 히스토리 업데이트 (최근 100틱, 스무딩)
      setHistory((prev) => {
        const rawEntry = {
          time: nextTime,
          civ1Pop: newCiv1.population,
          civ2Pop: newCiv2.population,
          civ1Tech: newCiv1.technology,
          civ2Tech: newCiv2.technology,
          civ1Military: newCiv1.military,
          civ2Military: newCiv2.military,
          civ1Resources: newCiv1.resources,
          civ2Resources: newCiv2.resources,
          civ1Energy: newCiv1.energy,
          civ2Energy: newCiv2.energy,
          civ1Morale: newCiv1.morale,
          civ2Morale: newCiv2.morale,
          civ1SurvivalInstinct: newCiv1.runtimeSurvivalInstinct,
          civ2SurvivalInstinct: newCiv2.runtimeSurvivalInstinct,
          civ1DevelopmentDesire: newCiv1.runtimeDevelopmentDesire,
          civ2DevelopmentDesire: newCiv2.runtimeDevelopmentDesire,
        };

        const alpha = 0.5;
        const last = prev[prev.length - 1];

        const smoothedEntry =
          last && last.time + 1 === rawEntry.time
            ? {
                time: rawEntry.time,
                civ1Pop: alpha * rawEntry.civ1Pop + (1 - alpha) * last.civ1Pop,
                civ2Pop: alpha * rawEntry.civ2Pop + (1 - alpha) * last.civ2Pop,
                civ1Tech:
                  alpha * rawEntry.civ1Tech + (1 - alpha) * last.civ1Tech,
                civ2Tech:
                  alpha * rawEntry.civ2Tech + (1 - alpha) * last.civ2Tech,
                civ1Military:
                  alpha * rawEntry.civ1Military +
                  (1 - alpha) * last.civ1Military,
                civ2Military:
                  alpha * rawEntry.civ2Military +
                  (1 - alpha) * last.civ2Military,
                civ1Resources:
                  alpha * rawEntry.civ1Resources +
                  (1 - alpha) * last.civ1Resources,
                civ2Resources:
                  alpha * rawEntry.civ2Resources +
                  (1 - alpha) * last.civ2Resources,
                civ1Energy:
                  alpha * rawEntry.civ1Energy +
                  (1 - alpha) * last.civ1Energy,
                civ2Energy:
                  alpha * rawEntry.civ2Energy +
                  (1 - alpha) * last.civ2Energy,
                civ1Morale:
                  alpha * rawEntry.civ1Morale +
                  (1 - alpha) * last.civ1Morale,
                civ2Morale:
                  alpha * rawEntry.civ2Morale +
                  (1 - alpha) * last.civ2Morale,
                civ1SurvivalInstinct:
                  alpha * (rawEntry.civ1SurvivalInstinct ?? 1) +
                  (1 - alpha) * (last.civ1SurvivalInstinct ?? 1),
                civ2SurvivalInstinct:
                  alpha * (rawEntry.civ2SurvivalInstinct ?? 1) +
                  (1 - alpha) * (last.civ2SurvivalInstinct ?? 1),
                civ1DevelopmentDesire:
                  alpha * (rawEntry.civ1DevelopmentDesire ?? 1) +
                  (1 - alpha) * (last.civ1DevelopmentDesire ?? 1),
                civ2DevelopmentDesire:
                  alpha * (rawEntry.civ2DevelopmentDesire ?? 1) +
                  (1 - alpha) * (last.civ2DevelopmentDesire ?? 1),
              }
            : rawEntry;

        return [...prev, smoothedEntry].slice(-100);
      });
    }, 100 / speed);

    return () => clearInterval(interval);
  }, [
    isRunning,
    time,
    speed,
    civ1,
    civ2,
    warStatus,
    addEvent,
    extinctCiv,
    calculateBaseMilitary,
    activeEvent,
  ]);

  // 발사체 이동
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setProjectiles((prev) =>
        prev
          .map((p) => ({
            ...p,
            progress: p.progress + 1.5 * speed,
          }))
          .filter((p) => p.progress < 100),
      );
    }, 20);

    return () => clearInterval(interval);
  }, [isRunning, speed]);

  // ==========================
  // UI 컴포넌트들
  // ==========================
  const StatBar = ({ label, value, max, color, icon: Icon }) => {
    const displayValue = Math.max(0, value);
    const percentage = Math.min(100, (displayValue / max) * 100);

    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1 text-gray-400">
          <div className="flex items-center gap-1.5">
            <Icon
              size={12}
              strokeWidth={2}
              style={{ color }}
            />
            <span className="font-medium text-white">{label}</span>
          </div>
          <span className="font-mono font-semibold text-white">
            {formatNumber(displayValue)}
          </span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden border border-slate-600">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    );
  };

  // ===== 수정된: 초기값 입력용 컴포넌트 (문자열 + onBlur 확정) =====
  const EditableBaseStats = ({ initialCiv, setInitialCiv, disabled }) => {
    const fields = [
      { label: 'Initial Population', key: 'population' },
      { label: 'Initial Technology', key: 'technology' },
      { label: 'Initial Military', key: 'military' },
      { label: 'Initial Resources', key: 'resources' },
      { label: 'Initial Energy', key: 'energy' },
      { label: 'Initial Morale', key: 'morale' },
      { label: 'Base Survival Instinct', key: 'baseSurvivalInstinct' },
      { label: 'Base Development Desire', key: 'baseDevelopmentDesire' },
    ];

    const [localValues, setLocalValues] = useState(() => {
      const obj = {};
      fields.forEach((f) => {
        const v = initialCiv[f.key] ?? 0;
        obj[f.key] = String(Math.round(v));
      });
      return obj;
    });

    useEffect(() => {
      const obj = {};
      fields.forEach((f) => {
        const v = initialCiv[f.key] ?? 0;
        obj[f.key] = String(Math.round(v));
      });
      setLocalValues(obj);
    }, [initialCiv]);

    const handleLocalChange = (e, key) => {
      const raw = e.target.value;
      setLocalValues((prev) => ({
        ...prev,
        [key]: raw,
      }));
    };

    const commitValue = (key) => {
      const rawValue = (localValues[key] ?? '').trim();

      if (rawValue === '') {
        setInitialCiv((prev) => ({ ...prev, [key]: 0 }));
        setLocalValues((prev) => ({ ...prev, [key]: '0' }));
        return;
      }

      const cleaned = rawValue.replace(/[^0-9.\-]/g, '');
      const parsed = Number(cleaned);
      if (Number.isNaN(parsed)) {
        const v = initialCiv[key] ?? 0;
        setLocalValues((prev) => ({
          ...prev,
          [key]: String(Math.round(v)),
        }));
        return;
      }

      let valueToSet = parsed;

      if (
        key === 'morale' ||
        key.includes('Instinct') ||
        key.includes('Desire')
      ) {
        valueToSet = Math.min(100, Math.max(0, valueToSet));
      }

      setInitialCiv((prev) => ({
        ...prev,
        [key]: valueToSet,
      }));
      setLocalValues((prev) => ({
        ...prev,
        [key]: String(Math.round(valueToSet)),
      }));
    };

    return (
      <div className="mt-5 pt-5 border-t border-slate-700">
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3">
          Initial Parameters (Editable when Paused)
        </h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block mb-1 text-gray-500 font-medium">
                {field.label}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={localValues[field.key] ?? ''}
                onChange={(e) => handleLocalChange(e, field.key)}
                onBlur={() => commitValue(field.key)}
                disabled={disabled}
                className="w-full border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 bg-slate-700 text-white disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CivPanel = ({
    initialCiv,
    setInitialCiv,
    runtimeCiv,
    isRunning,
    disabled,
    calculateBaseMilitary,
    activeEvent,
  }) => {
    const inputDisabled = disabled || isRunning;
    const dynamicFloor = calculateBaseMilitary(runtimeCiv);

    // 정책 입력용 로컬 상태 (문자열)
    const [policyValues, setPolicyValues] = useState({
      aggressiveness: String(Math.round(initialCiv.aggressiveness ?? 0)),
      diplomacy: String(Math.round(initialCiv.diplomacy ?? 0)),
    });

    useEffect(() => {
      setPolicyValues({
        aggressiveness: String(Math.round(initialCiv.aggressiveness ?? 0)),
        diplomacy: String(Math.round(initialCiv.diplomacy ?? 0)),
      });
    }, [initialCiv.aggressiveness, initialCiv.diplomacy]);

    const handlePolicyLocalChange = (e, key) => {
      const raw = e.target.value;
      setPolicyValues((prev) => ({
        ...prev,
        [key]: raw,
      }));
    };

    const commitPolicy = (key) => {
      const raw = (policyValues[key] ?? '').trim();
      if (raw === '') {
        setInitialCiv((prev) => ({ ...prev, [key]: 0 }));
        setPolicyValues((prev) => ({ ...prev, [key]: '0' }));
        return;
      }
      const cleaned = raw.replace(/[^0-9.\-]/g, '');
      const num = Number(cleaned);
      if (Number.isNaN(num)) {
        const v = initialCiv[key] ?? 0;
        setPolicyValues((prev) => ({
          ...prev,
          [key]: String(Math.round(v)),
        }));
        return;
      }
      const clamped = Math.min(100, Math.max(0, num));
      setInitialCiv((prev) => ({ ...prev, [key]: clamped }));
      setPolicyValues((prev) => ({
        ...prev,
        [key]: String(Math.round(clamped)),
      }));
    };

    const eventStatus = activeEvent;
    let eventDisplay = null;
    if (eventStatus) {
      if (eventStatus.type === 'CRISIS') {
        eventDisplay = (
          <div className="flex items-center gap-2 p-2 bg-red-900/50 rounded-lg text-red-300 text-sm font-semibold border border-red-800">
            <CloudRain size={16} /> CRISIS ({eventStatus.duration} turns left)
          </div>
        );
      } else if (eventStatus.type === 'BOOM') {
        eventDisplay = (
          <div className="flex items-center gap-2 p-2 bg-green-900/50 rounded-lg text-green-300 text-sm font-semibold border border-green-800">
            <Sunrise size={16} /> BOOM ({eventStatus.duration} turns left)
          </div>
        );
      } else if (eventStatus.type === 'RECON') {
        eventDisplay = (
          <div className="flex items-center gap-2 p-2 bg-blue-900/40 rounded-lg text-blue-300 text-sm font-semibold border border-blue-700">
            <Sunrise size={16} /> RECONSTRUCTION ({eventStatus.duration} turns
            left)
          </div>
        );
      }
    }

    return (
      <div className="bg-slate-800/80 rounded-xl shadow-xl p-5 border-2 border-slate-700 backdrop-blur-sm">
        <input
          value={initialCiv.name}
          onChange={(e) =>
            setInitialCiv((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={inputDisabled}
          className="text-xl font-bold mb-4 w-full border-b pb-2 bg-transparent focus:outline-none text-white transition-colors"
          style={{
            borderColor: initialCiv.color,
            color: initialCiv.color,
          }}
        />

        <div className="min-h-[40px] mb-4">{eventDisplay}</div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-6">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2 border-b border-slate-700 pb-1">
              Core Metrics (Runtime)
            </h3>
            <StatBar
              label="Population"
              value={runtimeCiv.population}
              max={5000}
              color={initialCiv.color}
              icon={Users}
            />
            <StatBar
              label="Resources"
              value={runtimeCiv.resources}
              max={5000}
              color={initialCiv.color}
              icon={Droplet}
            />
            <StatBar
              label="Morale"
              value={runtimeCiv.morale}
              max={100}
              color={initialCiv.color}
              icon={Heart}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2 border-b border-slate-700 pb-1">
              Strategic Metrics (Runtime)
            </h3>
            <StatBar
              label="Technology"
              value={runtimeCiv.technology}
              max={500}
              color={initialCiv.color}
              icon={Cpu}
            />
            <StatBar
              label="Energy"
              value={runtimeCiv.energy}
              max={500}
              color={initialCiv.color}
              icon={Zap}
            />
            {/* Min 표시 제거된 Military */}
            <StatBar
              label="Military"
              value={runtimeCiv.military}
              max={1000}
              color={initialCiv.color}
              icon={Shield}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3">
            Policy Vectors (0-100)
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block mb-1 text-gray-400 font-medium flex items-center gap-1">
                <Swords size={14} /> Aggressiveness
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={policyValues.aggressiveness}
                onChange={(e) => handlePolicyLocalChange(e, 'aggressiveness')}
                onBlur={() => commitPolicy('aggressiveness')}
                disabled={inputDisabled}
                className="w-full border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 bg-slate-700 text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-medium flex items-center gap-1">
                <Handshake size={14} /> Diplomacy
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={policyValues.diplomacy}
                onChange={(e) => handlePolicyLocalChange(e, 'diplomacy')}
                onBlur={() => commitPolicy('diplomacy')}
                disabled={inputDisabled}
                className="w-full border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 bg-slate-700/50 text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <EditableBaseStats
          initialCiv={initialCiv}
          setInitialCiv={setInitialCiv}
          disabled={inputDisabled}
        />
      </div>
    );
  };

  const DataPoint = ({ label, value, icon: Icon, color }) => (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center gap-1 text-gray-400">
        <Icon size={12} style={{ color }} />
        <span className="font-medium text-white">{label}:</span>
      </div>
      <span className="font-mono font-semibold" style={{ color }}>
        {formatNumber(value)}
      </span>
    </div>
  );

  const SystemHub = ({ civ, runtimeCiv, isRunning, warStatus }) => {
    const isDead = runtimeCiv.population <= 0;
    const hubSize = Math.max(
      100,
      Math.min(180, 100 + runtimeCiv.technology * 0.5),
    );
    const isActive = warStatus === 'WAR' && isRunning;

    return (
      <div className="flex flex-col items-center z-10 w-48 transition-all duration-500">
        <div
          className={`rounded-xl p-3 shadow-2xl mb-4 relative transition-all duration-500 border-2 ${
            isActive ? civ.accent : 'border-slate-600'
          } backdrop-blur-md`}
          style={{
            width: hubSize,
            height: hubSize,
            backgroundColor: isDead
              ? 'rgba(0,0,0,0.5)'
              : 'rgba(15, 23, 42, 0.7)',
            boxShadow: `0 0 ${isActive ? 30 : 15}px ${
              civ.color
            }, inset 0 0 10px rgba(255,255,255,0.1)`,
            transform: `scale(${isDead ? 0.8 : 1})`,
            opacity: isDead ? 0.4 : 1,
          }}
        >
          <div className="text-center">
            <div className="text-xs uppercase font-bold text-gray-400 mb-1">
              Status
            </div>
            <div
              className={`text-lg font-mono font-extrabold ${
                runtimeCiv.isSingularity
                  ? 'text-purple-400'
                  : isDead
                  ? 'text-gray-400'
                  : isActive
                  ? 'text-red-400 animate-pulse'
                  : 'text-green-400'
              }`}
            >
              {runtimeCiv.isSingularity
                ? 'SINGULARITY'
                : isDead
                ? 'EXTINCT'
                : isActive
                ? 'COMBAT'
                : 'ONLINE'}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700">
            <DataPoint
              label="Tech"
              value={Math.round(runtimeCiv.technology)}
              icon={Cpu}
              color={civ.color}
            />
            <DataPoint
              label="Mil."
              value={runtimeCiv.military}
              icon={Shield}
              color={civ.color}
            />
          </div>
          {isActive && !isDead && (
            <span
              className="absolute top-0 right-0 p-1 rounded-full text-white"
              style={{ backgroundColor: civ.color }}
            >
              <Swords size={12} />
            </span>
          )}
        </div>
        <div
          className="text-white font-bold text-xl tracking-wide text-center"
          style={{ color: civ.color }}
        >
          {civ.name}
        </div>
        <div className="text-gray-400 text-sm mt-1 font-mono">
          {formatNumber(runtimeCiv.population)} Population
        </div>
      </div>
    );
  };

  const Chart = ({
    history,
    maxVal,
    key1,
    key2,
    color1,
    color2,
    label1,
    label2,
    referenceLine,
  }) => {
    const width = 800;
    const height = 120;
    const padding = 10;
    const innerHeight = height - padding * 2;

    const normalize = (value) => (value / maxVal) * innerHeight;

    const points1 = history
      .map((h, i) => {
        const x = i * (width / (history.length - 1 || 1));
        const y =
          height - padding - normalize(Math.min(maxVal, h[key1] || 1.0));
        return `${x},${y}`;
      })
      .join(' ');

    const points2 = history
      .map((h, i) => {
        const x = i * (width / (history.length - 1 || 1));
        const y =
          height - padding - normalize(Math.min(maxVal, h[key2] || 1.0));
        return `${x},${y}`;
      })
      .join(' ');

    const areaPoints1 = `${points1} ${width},${height - padding} 0,${
      height - padding
    }`;
    const areaPoints2 = `${points2} ${width},${height - padding} 0,${
      height - padding
    }`;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="border border-slate-700 rounded-lg bg-slate-900/50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grad1Chart" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: color1, stopOpacity: 0.3 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: color1, stopOpacity: 0 }}
            />
          </linearGradient>
          <linearGradient id="grad2Chart" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: color2, stopOpacity: 0.3 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: color2, stopOpacity: 0 }}
            />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1={height - padding}
          x2={width}
          y2={height - padding}
          stroke="#334155"
          strokeWidth="1"
        />

        {referenceLine !== undefined && (
          <line
            x1="0"
            y1={height - padding - normalize(referenceLine)}
            x2={width}
            y2={height - padding - normalize(referenceLine)}
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        )}

        <polyline
          points={areaPoints1}
          fill="url(#grad1Chart)"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points1}
          fill="none"
          stroke={color1}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />

        <polyline
          points={areaPoints2}
          fill="url(#grad2Chart)"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points2}
          fill="none"
          stroke={color2}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />

        <g transform="translate(680, 10)">
          <rect
            x="0"
            y="0"
            width="110"
            height="40"
            fill="#1e293b"
            rx="5"
            ry="5"
            opacity="0.8"
          />
          <circle cx="10" cy="10" r="4" fill={color1} />
          <text x="20" y="14" fontSize="10" fill="white">
            {label1}
          </text>
          <circle cx="10" cy="30" r="4" fill={color2} />
          <text x="20" y="34" fontSize="10" fill="white">
            {label2}
          </text>
        </g>
      </svg>
    );
  };

  // 히스토리 스케일 계산
  const maxPop = Math.max(
    ...history.map((h) => Math.max(h.civ1Pop, h.civ2Pop)),
    civ1.population,
    civ2.population,
    2000,
  );
  const maxMilitary = Math.max(
    ...history.map((h) => Math.max(h.civ1Military, h.civ2Military)),
    civ1.military,
    civ2.military,
    200,
  );
  const maxTech = Math.max(
    ...history.map((h) => Math.max(h.civ1Tech, h.civ2Tech)),
    civ1.technology,
    civ2.technology,
    100,
  );
  const maxResources = Math.max(
    ...history.map((h) => Math.max(h.civ1Resources, h.civ2Resources)),
    civ1.resources,
    civ2.resources,
    2000,
  );
  const maxEnergy = Math.max(
    ...history.map((h) => Math.max(h.civ1Energy, h.civ2Energy)),
    civ1.energy,
    civ2.energy,
    200,
  );
  const maxMorale = 100;
  const maxInstinctFactor = Math.max(
    ...history.map((h) =>
      Math.max(
        h.civ1SurvivalInstinct || 1,
        h.civ2SurvivalInstinct || 1,
        h.civ1DevelopmentDesire || 1,
        h.civ2DevelopmentDesire || 1,
      ),
    ),
    3.5,
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-slate-900 min-h-screen font-sans text-gray-100">
      <h1 className="text-4xl font-extrabold text-center mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
        Conflict Simulation Console
      </h1>

      {/* 컨트롤 패널 */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-5 mb-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={
                isRunning ? () => setIsRunning(false) : startSimulation
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-green-900/50 font-medium text-lg disabled:opacity-50 whitespace-nowrap"
              disabled={extinctCiv}
            >
              {isRunning ? (
                <>
                  <Pause size={20} /> Pause
                </>
              ) : (
                <>
                  {time > 0 ? (
                    <>
                      <Play size={20} /> Continue
                    </>
                  ) : (
                    <>
                      <Play size={20} /> Start
                    </>
                  )}
                </>
              )}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg shadow-gray-900/50 font-medium text-lg whitespace-nowrap"
            >
              <RotateCcw size={20} />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-400 whitespace-nowrap">
                Time Warp:
              </label>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                disabled={!isRunning}
                className="border border-gray-600 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-700 text-white disabled:opacity-50"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x (Normal)</option>
                <option value={2}>2.0x</option>
                <option value={5}>5.0x</option>
              </select>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-gray-400 leading-none">
                T +
              </div>
              <div className="text-xl font-mono font-semibold text-cyan-400 leading-none">
                {time}
              </div>
            </div>

            <div
              className={`px-4 py-1.5 rounded-lg font-bold shadow-md text-white transition-all ${
                warStatus === 'WAR'
                  ? 'bg-gradient-to-r from-red-600 to-red-800 ring-4 ring-red-500/50 animate-pulse'
                  : 'bg-gradient-to-r from-green-600 to-green-800 ring-2 ring-green-500/50'
              } whitespace-nowrap`}
            >
              {warStatus}
            </div>
          </div>
        </div>

        {extinctCiv && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-xl flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-red-300 font-semibold text-lg">
              {extinctCiv} has been extinguished. Simulation Halted. Please
              Reset to configure new scenario.
            </span>
          </div>
        )}
      </div>

      {/* 메인 전장 뷰 */}
      <div
        className="bg-slate-900 rounded-xl shadow-2xl p-8 mb-6 relative overflow-hidden border-4 border-slate-700/50"
        style={{ height: '350px' }}
      >
        {/* 별 배경 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: Math.random() * 2 + 0.5,
                height: Math.random() * 2 + 0.5,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3,
                animation: `twinkle ${Math.random() * 4 + 2}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative h-full flex items-center justify-between px-16">
          <SystemHub
            civ={initialCiv1}
            runtimeCiv={civ1}
            isRunning={isRunning}
            warStatus={warStatus}
          />

          {/* 중간 전선 + 발사체 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="100%" height="100%" className="absolute">
              <defs>
                <linearGradient
                  id="lineGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    style={{ stopColor: initialCiv1.color, stopOpacity: 0.8 }}
                  />
                  <stop
                    offset="50%"
                    style={{
                      stopColor:
                        warStatus === 'WAR' ? '#ef4444' : '#4ade80',
                      stopOpacity: 1,
                    }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: initialCiv2.color, stopOpacity: 0.8 }}
                  />
                </linearGradient>
              </defs>

              <line
                x1="20%"
                y1="50%"
                x2="80%"
                y2="50%"
                stroke="url(#lineGradient)"
                strokeWidth={warStatus === 'WAR' ? '4' : '2'}
                strokeDasharray={warStatus === 'WAR' ? '15, 7' : 'none'}
                className="transition-all duration-500"
                style={{
                  filter: `drop-shadow(0 0 ${
                    warStatus === 'WAR' ? '10px' : '4px'
                  } ${
                    warStatus === 'WAR' ? '#ef4444' : '#4ade80'
                  })`,
                }}
              >
                {warStatus === 'WAR' && isRunning && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="22"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </line>
            </svg>

            {!extinctCiv &&
              projectiles.map((proj) => {
                const startX = proj.direction === 'right' ? 20 : 80;
                const endX = proj.direction === 'right' ? 80 : 20;
                const progressRatio = proj.progress / 100;

                const spreadAmount = Math.sin(progressRatio * Math.PI) * 20;
                const currentX = startX + (endX - startX) * progressRatio;
                const currentY = 50 + proj.spreadAngle * spreadAmount;

                const projectileColor = proj.color
                  ? proj.color
                  : proj.direction === 'right'
                  ? initialCiv1.color
                  : initialCiv2.color;

                return (
                  <div
                    key={proj.id}
                    className="absolute"
                    style={{
                      left: `${currentX}%`,
                      top: `${currentY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: projectileColor,
                        boxShadow: `0 0 10px ${projectileColor}`,
                      }}
                    />
                  </div>
                );
              })}
          </div>

          <SystemHub
            civ={initialCiv2}
            runtimeCiv={civ2}
            isRunning={isRunning}
            warStatus={warStatus}
          />
        </div>
      </div>

      {/* 양 문명 패널 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <CivPanel
          initialCiv={initialCiv1}
          setInitialCiv={setInitialCiv1}
          runtimeCiv={civ1}
          isRunning={isRunning}
          disabled={extinctCiv}
          calculateBaseMilitary={calculateBaseMilitary}
          activeEvent={activeEvent.civ1}
        />
        <CivPanel
          initialCiv={initialCiv2}
          setInitialCiv={setInitialCiv2}
          runtimeCiv={civ2}
          isRunning={isRunning}
          disabled={extinctCiv}
          calculateBaseMilitary={calculateBaseMilitary}
          activeEvent={activeEvent.civ2}
        />
      </div>

      {/* 히스토리 차트 */}
      {history.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl shadow-lg p-6 mb-6 border-2 border-slate-700 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-700 pb-2">
            Trend Analysis (All Metrics)
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Users size={16} /> Population Trajectory (Units)
              </h3>
              <Chart
                history={history}
                maxVal={maxPop}
                key1="civ1Pop"
                key2="civ2Pop"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Shield size={16} /> Military Power Index
              </h3>
              <Chart
                history={history}
                maxVal={maxMilitary}
                key1="civ1Military"
                key2="civ2Military"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Cpu size={16} /> Technology Level
              </h3>
              <Chart
                history={history}
                maxVal={maxTech}
                key1="civ1Tech"
                key2="civ2Tech"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Droplet size={16} /> Resources Reserves
              </h3>
              <Chart
                history={history}
                maxVal={maxResources}
                key1="civ1Resources"
                key2="civ2Resources"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Zap size={16} /> Energy Production
              </h3>
              <Chart
                history={history}
                maxVal={maxEnergy}
                key1="civ1Energy"
                key2="civ2Energy"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Heart size={16} /> Morale/Stability
              </h3>
              <Chart
                history={history}
                maxVal={maxMorale}
                key1="civ1Morale"
                key2="civ2Morale"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Swords size={16} /> Survival Instinct Factor (x)
              </h3>
              <Chart
                history={history}
                maxVal={maxInstinctFactor}
                key1="civ1SurvivalInstinct"
                key2="civ2SurvivalInstinct"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
                referenceLine={1.0}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <Cpu size={16} /> Development Desire Factor (x)
              </h3>
              <Chart
                history={history}
                maxVal={maxInstinctFactor}
                key1="civ1DevelopmentDesire"
                key2="civ2DevelopmentDesire"
                color1={initialCiv1.color}
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
                referenceLine={1.0}
              />
            </div>
          </div>
        </div>
      )}

      {/* 로그 */}
      {events.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl shadow-lg p-6 border-2 border-slate-700 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-5 text-white border-b border-slate-700 pb-2">
            System Log
          </h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {events.map((event, i) => (
              <div
                key={i}
                className={`text-sm border-l-4 pl-4 py-2 rounded-r transition-colors duration-300 ${
                  event.message.includes('EXTINCTION')
                    ? 'border-red-800 bg-red-900/40'
                    : event.message.includes('SINGULARITY')
                    ? 'border-purple-500 bg-purple-900/30'
                    : event.message.includes('ASTEROID MINING')
                    ? 'border-amber-400 bg-amber-900/20'
                    : event.message.includes('CRISIS')
                    ? 'border-yellow-500 bg-yellow-900/20'
                    : event.message.includes('BOOM')
                    ? 'border-green-400 bg-green-900/20'
                    : event.message.includes('WAR DECLARED')
                    ? 'border-red-500 bg-red-900/20'
                    : event.message.includes('Peace') ||
                      event.message.includes('TRADE')
                    ? 'border-green-500 bg-green-900/20'
                    : event.message.includes('LOSSES')
                    ? 'border-red-400 bg-red-900/10'
                    : 'border-cyan-500 bg-cyan-900/10'
                }`}
              >
                <span className="font-mono text-gray-500 font-semibold">
                  T+{event.time}
                </span>
                <span className="mx-2 text-gray-600">//</span>
                <span className="text-gray-200">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SciFiConflictSimulator;
