import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, Users, Cpu, Shield, Droplet, Heart, Swords, Handshake, AlertTriangle, Sunrise, CloudRain } from 'lucide-react';

// Configuration for Firebase (Required but not used in this single file demo)
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// =================================================================================
// [NEW HELPER] 무작위 초기 상태 생성을 위한 기본값 및 범위 설정
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

const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomInitialCiv = (name, color, accent) => {
    return {
      name: name,
      population: getRandomInt(...INITIAL_RANGES.population),
      technology: getRandomInt(...INITIAL_RANGES.technology),
      military: getRandomInt(...INITIAL_RANGES.military),
      resources: getRandomInt(...INITIAL_RANGES.resources),
      energy: getRandomInt(...INITIAL_RANGES.energy),
      morale: getRandomInt(...INITIAL_RANGES.morale),
      aggressiveness: getRandomInt(...INITIAL_RANGES.aggressiveness),
      diplomacy: getRandomInt(...INITIAL_RANGES.diplomacy),
      baseSurvivalInstinct: getRandomInt(...INITIAL_RANGES.baseSurvivalInstinct),
      baseDevelopmentDesire: getRandomInt(...INITIAL_RANGES.baseDevelopmentDesire),
      color: color,
      accent: accent,
      isSingularity: false,
    };
};

// =================================================================================
// [NEW HELPER] 본능 요소 계산 함수 (재사용을 위해 분리)
// =================================================================================
const calculateInstinctFactors = (civ) => {
    // 0~1 사이로 정규화 (최대값 5000, 500)
    const normalizedResource = Math.min(1, civ.resources / 5000); 
    const normalizedMorale = civ.morale / 100;
    const normalizedTech = Math.min(1, civ.technology / 500);

    // Dynamic Status Boosts (0 to 1.5)
    // Survival Boost: Low Resource/Morale -> High Boost
    const lowStatusBoost = Math.max(0, 1 - normalizedResource * normalizedMorale) * 1.5; 
    // Development Boost: High Resource/Tech -> High Boost
    const highStatusBoost = Math.max(0, normalizedTech * normalizedResource) * 1.5; 
    
    // User Base Instinct (0-100) normalized to 0-1 and weighted (x0.5 contribution)
    const userBaseSurvival = civ.baseSurvivalInstinct / 100;
    const userBaseDevelopment = civ.baseDevelopmentDesire / 100;

    // Blended Instinct Factor (Base 1.0 + User Bias + Dynamic Situation Boost)
    const survivalInstinct = 1.0 + userBaseSurvival * 0.5 + lowStatusBoost;
    const developmentDesire = 1.0 + userBaseDevelopment * 0.5 + highStatusBoost;
    
    return { survivalInstinct, developmentDesire };
};

// Initial state setup (runs once)
// NOTE: 이 함수는 시뮬레이션 시작 시 호출되어 history의 첫 번째 기록을 설정합니다.
const getInitialState = (civ1, civ2) => {
    // NEW: Calculate the starting instinct factors based on the initial civ settings
    const factors1 = calculateInstinctFactors(civ1);
    const factors2 = calculateInstinctFactors(civ2);

    return [{
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
        // UPDATE: Log the calculated initial factor instead of hardcoded 1.0
        civ1SurvivalInstinct: factors1.survivalInstinct,
        civ2SurvivalInstinct: factors2.survivalInstinct,
        civ1DevelopmentDesire: factors1.developmentDesire,
        civ2DevelopmentDesire: factors2.developmentDesire,
    }];
};

const SciFiConflictSimulator = () => {
  // 초기 상태는 사용자가 직접 설정할 수 있도록 기본값으로 시작
  // UPDATE: getRandomInitialCiv 함수를 사용하여 초기 상태를 무작위로 설정
  const [initialCiv1, setInitialCiv1] = useState(() => getRandomInitialCiv('Civilization Aethel', '#3b82f6', 'ring-blue-500'));
  const [initialCiv2, setInitialCiv2] = useState(() => getRandomInitialCiv('Federation Xylo', '#ef4444', 'ring-red-500'));

  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [civ1, setCiv1] = useState(initialCiv1); // 런타임 상태 (시뮬레이션 루프와 화면 표시에 사용)
  const [civ2, setCiv2] = useState(initialCiv2); // 런타임 상태 (시뮬레이션 루프와 화면 표시에 사용)
  // NOTE: getInitialState는 initialCiv1/2에 의존하므로, state 초기화 시점을 맞추기 위해 함수 호출
  const [history, setHistory] = useState(() => getInitialState(initialCiv1, initialCiv2));
  const [warStatus, setWarStatus] = useState('PEACE');
  const [events, setEvents] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [extinctCiv, setExtinctCiv] = useState(null); // 멸망한 문명 이름
  
  // 문명별 활성화된 이벤트 상태 (CRISIS, BOOM 등)
  const [activeEvent, setActiveEvent] = useState({ civ1: null, civ2: null }); // { type: 'CRISIS'/'BOOM', duration: 0 }


  // Helper function to add event to log (updated to accept time as argument)
  const addEvent = useCallback((message, t) => {
    setEvents(prev => [{time: t, message}, ...prev.slice(0, 9)]);
  }, []);

  // 시뮬레이션이 멈춰있을 때 (isRunning = false), initialCiv1/2를 civ1/2에 즉시 반영
  useEffect(() => {
    if (!isRunning) {
        // NOTE: 이 동기화 로직은 initialCiv1/2가 UI를 통해 변경될 때만 필요합니다.
        // 상태 초기화 시 무작위 값이 설정되더라도, 이 useEffect는 초기화 후에 실행되므로
        // UI가 로드된 후에도 initialCiv1/2가 civ1/2에 반영되도록 유지합니다.
        setCiv1(initialCiv1);
        setCiv2(initialCiv2);
    }
  }, [isRunning, initialCiv1, initialCiv2]);


  // Reset function
  const reset = useCallback(() => {
    setIsRunning(false);
    setTime(0);
    setExtinctCiv(null);
    setEvents([]);
    setWarStatus('PEACE');
    setProjectiles([]);
    setActiveEvent({ civ1: null, civ2: null }); // Reset events
    
    // UPDATE: Reset 시 새로운 무작위 값으로 초기 상태를 재생성합니다.
    const newInitialCiv1 = getRandomInitialCiv('Civilization Aethel', '#3b82f6', 'ring-blue-500');
    const newInitialCiv2 = getRandomInitialCiv('Federation Xylo', '#ef4444', 'ring-red-500');
    
    setInitialCiv1(newInitialCiv1);
    setInitialCiv2(newInitialCiv2);
    
    // 런타임 상태도 새로운 초기값으로 즉시 동기화 (optional, next useEffect handles this)
    setCiv1(newInitialCiv1);
    setCiv2(newInitialCiv2);
    
    // history도 새로운 초기값으로 재설정
    setHistory(getInitialState(newInitialCiv1, newInitialCiv2));

  }, []);

  // Start function (uses current editable state)
  const startSimulation = useCallback(() => {
      // 시작 시 현재 UI에 설정된 초기값을 런타임 상태로 복사 (useEffect를 통해 이미 동기화됨)
      // initialCiv1/2가 civ1/2에 반영된 상태이므로 그대로 사용합니다.
      setExtinctCiv(null);
      setTime(0);
      setEvents([]);
      setWarStatus('PEACE');
      setProjectiles([]);
      setActiveEvent({ civ1: null, civ2: null }); // Reset events
      // history 초기 상태로 재설정
      setHistory(getInitialState(civ1, civ2)); // 현재 런타임 상태를 기반으로 history 초기화
      setIsRunning(true);
  }, [civ1, civ2]);
  
  // =================================================================================
  // 동적 최소 군사력 계산
  // =================================================================================
  const calculateBaseMilitary = useCallback((civ) => {
    // 인구 기반: 인구 1,000명당 10의 기본 강도 (최대 5000인구 -> 50)
    const populationBase = civ.population / 100;
    
    // 자원 기반 (경제력): 자원 1,000당 5의 기본 강도 (최대 5000자원 -> 25)
    const resourceBase = civ.resources * 0.005; 
    
    // 기술력 계수: 100기술당 1.1배, 500기술당 2.0배
    const techFactor = 1 + (civ.technology / 500); 

    const rawBaseStrength = (populationBase + resourceBase) * techFactor;
    
    const minFloor = 5;

    return Math.max(minFloor, Math.round(rawBaseStrength));
  }, []);

  // --- Simulation Core Logic ---
  useEffect(() => {
    if (!isRunning || extinctCiv) return; // 멸망 시 중지

    const interval = setInterval(() => {
      const nextTime = time + 1;
      setTime(nextTime);

      // 멸망 확인 함수 (인구가 0 이하일 때)
      const checkExtinction = (currentCiv) => {
        if (currentCiv.population <= 0) {
          setIsRunning(false);
          setExtinctCiv(currentCiv.name);
          addEvent(`[EXTINCTION] ${currentCiv.name} population reached zero. Simulation Halted.`, nextTime);
          return true;
        }
        return false;
      };
      
      // Function to update a single civilization's stats
      const updateCiv = (prev, other, currentEvent) => {
        if (prev.population <= 0) return { ...prev, population: 0, military: 0, morale: 0 };
        
        let newCiv = {...prev};
        
        // 1. Instinct Factor Calculation (사용자 설정 + 동적 상황) - UPDATED to use helper
        const { survivalInstinct, developmentDesire } = calculateInstinctFactors(prev);
        
        // Store calculated factors for history/charts
        newCiv.runtimeSurvivalInstinct = survivalInstinct;
        newCiv.runtimeDevelopmentDesire = developmentDesire;

        // 2. Technological Singularity Check 
        if (newCiv.technology >= 400 && !newCiv.isSingularity) {
            newCiv.isSingularity = true;
            addEvent(`[SINGULARITY] ${newCiv.name} reached Technological Singularity! Massive growth boost activated.`, nextTime);
        }

        // 3. Base Stat Calculation & Instinct Application
        
        // 싱귤래리티/인구 기반 성장 부스트 (Singularity/Population Based Growth Boost)
        const growthMultiplier = newCiv.isSingularity ? 5.0 : 1.0;
        const popGrowthFactor = Math.min(2.0, prev.resources / 800); 
        const totalGrowthFactor = growthMultiplier * popGrowthFactor;

        // 인구 성장: Development Desire와 사기 반영
        let popGrowth = prev.population * 0.008 * popGrowthFactor * (1 - prev.population / 10000) * growthMultiplier * developmentDesire * (prev.morale / 80);
        
        // 기술 성장: Development Desire와 에너지 반영
        let techGrowth = (0.3 + (prev.energy / 500)) * totalGrowthFactor * developmentDesire; 
        
        // 자원 수급: Development Desire 반영
        let resourceGain = (prev.population * 0.05 + prev.technology * 0.2) * totalGrowthFactor * developmentDesire;
        
        // 자원 소모: Survival Instinct로 효율 개선 (본능이 강할수록 소모 감소)
        const baseResourceCost = prev.military * 0.3 + prev.population * 0.02;
        const resourceCost = baseResourceCost / Math.pow(survivalInstinct, 0.5);

        // 평화 시 군사력 및 사기 증진
        let militaryGain = 0;
        let moraleBoost = 0;
        if (warStatus === 'PEACE') {
          // 군사력 증강: Survival Instinct 반영
          militaryGain = (prev.technology * 0.05 + prev.resources * 0.005 + (prev.aggressiveness * 0.05)) * popGrowthFactor * survivalInstinct; 
          moraleBoost = 0.2 + (prev.diplomacy * 0.01);
        }
        
        // NEW: Energy Growth (에너지 생산 로직 개선 및 Development Desire 반영)
        const baseEnergyGrowth = (prev.technology * 0.25) + (prev.resources * 0.005);
        let energyGain = baseEnergyGrowth * developmentDesire * totalGrowthFactor; 
        
        // 4. Apply Event Modifiers (CRISIS / BOOM)
        if (currentEvent) {
            if (currentEvent.type === 'CRISIS') {
                // Severe penalty
                popGrowth *= 0.1; 
                techGrowth *= 0.2; 
                militaryGain *= 0.1;
                energyGain *= 0.1; // Energy also hit hard
                
                // Additional passive drain during crisis
                newCiv.resources = Math.max(0, newCiv.resources - 30); // Immediate resource cost
                newCiv.morale = Math.max(0, prev.morale - 1.0); // Morale drain
            } else if (currentEvent.type === 'BOOM') {
                // Significant boost
                const boomMultiplier = 2.0;
                popGrowth *= boomMultiplier;
                resourceGain *= boomMultiplier;
                militaryGain *= 2.0;
                techGrowth *= 1.5;
                energyGain *= 1.5; // Energy gets a boost
                moraleBoost += 0.5;
            }
        }
        
        // Apply calculated growth/cost
        newCiv.population = Math.max(0, prev.population + popGrowth);
        newCiv.technology = prev.technology + techGrowth;
        newCiv.resources = Math.max(0, newCiv.resources + resourceGain - resourceCost);
        
        // 에너지 적용: 생산 - 인구 부양 비용
        newCiv.energy = prev.energy + energyGain - (prev.population * 0.01); 
        newCiv.energy = Math.max(0, newCiv.energy); // 에너지 최소 0 유지
        
        
        // 5. War Effects
        if (warStatus === 'WAR') {
          const techDifference = other.technology - prev.technology;
          const powerRatio = other.military / (prev.military + 1); 
          
          const baseLoss = Math.random() * 5 + 2; 
          const lossModifier = 1 + Math.max(0, powerRatio - 1) * 0.5; 
          const techPenalty = Math.max(0, techDifference * 0.05); 

          const militaryLoss = Math.max(0, baseLoss * lossModifier + techPenalty);
          
          // 동적 최소 군사력 적용
          const dynamicMinMilitary = calculateBaseMilitary(prev);
          newCiv.military = Math.max(dynamicMinMilitary, prev.military - militaryLoss); 
          
          const popLoss = Math.random() * 2.5 * lossModifier; 
          newCiv.population = Math.max(0, prev.population - popLoss);
          
          newCiv.resources = Math.max(0, newCiv.resources - (20 + (popLoss * 5))); 
          
          const moraleHit = 1.0 + popLoss * 0.1;
          newCiv.morale = Math.max(0, prev.morale - moraleHit);
          
          if (nextTime % 15 === 0 && militaryLoss > 10) {
            addEvent(`[LOSSES] ${prev.name} suffered heavy military losses (${Math.round(militaryLoss)} units). Stability declining.`, nextTime);
          }
        } else {
            // Peace time: apply military gain and morale boost
            newCiv.military = prev.military + militaryGain;
            newCiv.morale = Math.min(100, prev.morale + moraleBoost);
        }
        
        newCiv.morale = Math.min(100, Math.max(0, newCiv.morale));
        newCiv.military = Math.max(0, newCiv.military); 

        return newCiv;
      };
      
      // 6. Event State Update Logic
      const updateEventState = (civKey, civ) => {
          let currentEvent = activeEvent[civKey];
          let newEvent = currentEvent;

          // 1. Decrement duration or end event
          if (currentEvent) {
              if (currentEvent.duration <= 1) {
                  addEvent(`[STABILITY] ${civ.name} recovered from ${currentEvent.type}.`, nextTime);
                  newEvent = null;
              } else {
                  newEvent = { ...currentEvent, duration: currentEvent.duration - 1 };
              }
          }
          
          // 2. Try to trigger a new event only if no event is active and time is right
          if (!newEvent && nextTime % 25 === 0 && Math.random() < 0.15) {
              // Crisis Condition: Low resources AND Low morale
              if (civ.resources < 500 && civ.morale < 50) {
                  newEvent = { type: 'CRISIS', duration: 50 };
                  addEvent(`[CRISIS] ${civ.name} suffers a resource/morale breakdown! Development severely hindered.`, nextTime);
              } 
              // Boom Condition: High resources AND High technology
              else if (civ.resources > 2000 && civ.technology > 200) {
                  newEvent = { type: 'BOOM', duration: 40 };
                  addEvent(`[BOOM] ${civ.name} enters a golden age of rapid expansion!`, nextTime);
              }
          }
          
          return newEvent;
      };
      
      const event1 = updateEventState('civ1', civ1);
      const event2 = updateEventState('civ2', civ2);

      setActiveEvent({ civ1: event1, civ2: event2 });

      // 7. Apply Updates (Pass active event state)
      const newCiv1 = updateCiv(civ1, civ2, event1);
      const newCiv2 = updateCiv(civ2, civ1, event2);
      
      setCiv1(newCiv1);
      setCiv2(newCiv2);
      
      // 8. Resource Exchange (자원 교환 - 평화시에만 발생)
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
              
              setCiv1(prev => ({
                  ...prev, 
                  resources: prev.resources + tradeC1,
                  technology: prev.technology + (c2.technology > prev.technology ? techShare : 0)
              }));
              setCiv2(prev => ({
                  ...prev, 
                  resources: prev.resources + tradeC2,
                  technology: prev.technology + (c1.technology > prev.technology ? techShare : 0)
              }));
              
              if (tradeC1 > 0 && nextTime % 50 === 0) {
                  addEvent(`[TRADE] Resource exchange successful (Diplomacy: ${Math.round(diplomacyFactor * 100)}).`, nextTime);
              }
          }
      };
      
      exchangeResources(newCiv1, newCiv2);

      // 9. Extinction Check
      if (checkExtinction(newCiv1) || checkExtinction(newCiv2)) {
          return;
      }
      
      // 10. War Declaration/Peace Treaty Checks
      if (warStatus === 'PEACE' && nextTime % 25 === 0) {
        const aggressionSum = civ1.aggressiveness + civ2.aggressiveness;
        const diplomacyAvg = (civ1.diplomacy + civ2.diplomacy) / 2;
        const militaryRatio = Math.min(civ1.military, civ2.military) / Math.max(civ1.military, civ2.military);
        
        const chance = (aggressionSum / 200) * 0.4 - (diplomacyAvg / 100) * 0.2 + (0.05 * militaryRatio);
        
        if (Math.random() < chance) {
          setWarStatus('WAR');
          const aggressor = civ1.aggressiveness > civ2.aggressiveness ? civ1 : civ2;
          addEvent(`[CRITICAL] ${aggressor.name} initiates hostilities (Aggro: ${Math.round(aggressor.aggressiveness)}). WAR DECLARED.`, nextTime);
        }
      }
      
      if (warStatus === 'WAR' && nextTime % 30 === 0) {
        const totalDiplomacy = civ1.diplomacy + civ2.diplomacy;
        const totalAggression = civ1.aggressiveness + civ2.aggressiveness;
        
        const peaceChance = (totalDiplomacy * 0.002) / (totalAggression * 0.002) * 0.2;

        if (Math.random() < 0.05 + peaceChance) {
          setWarStatus('PEACE');
          addEvent('[DIPLOMACY] Peace Treaty Signed: Hostilities Cease.', nextTime);
          setProjectiles([]);
        }
      }

      // 11. Projectile Generation
      if (warStatus === 'WAR' && isRunning) {
        const FIRE_RATE = 5; 
        
        if (nextTime % FIRE_RATE === 0) {
          const SCALE = 50; 
          
          // Civ 1 firing
          const shots1 = Math.floor(civ1.military / SCALE);
          for (let i = 0; i < shots1; i++) {
            const spreadFactor = Math.min(1, civ2.military / civ1.military); 
            setProjectiles(prev => [...prev, {
              id: Date.now() + Math.random() + `a${i}`,
              direction: 'right', // Civ 1 fires right
              progress: 0,
              spreadAngle: (Math.random() - 0.5) * 0.5 * (1 + spreadFactor)
            }]);
          }

          // Civ 2 firing
          const shots2 = Math.floor(civ2.military / SCALE);
          for (let i = 0; i < shots2; i++) {
            const spreadFactor = Math.min(1, civ1.military / civ2.military);
            setProjectiles(prev => [...prev, {
              id: Date.now() + Math.random() + `b${i}`,
              direction: 'left', // Civ 2 fires left
              progress: 0,
              spreadAngle: (Math.random() - 0.5) * 0.5 * (1 + spreadFactor)
            }]);
          }
        }
      }

      // 12. Record History for Charts
      setHistory(prev => [...prev, {
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
        // NEW: Log runtime instinct factors
        civ1SurvivalInstinct: newCiv1.runtimeSurvivalInstinct,
        civ2SurvivalInstinct: newCiv2.runtimeSurvivalInstinct,
        civ1DevelopmentDesire: newCiv1.runtimeDevelopmentDesire,
        civ2DevelopmentDesire: newCiv2.runtimeDevelopmentDesire,
      }].slice(-100)); // Keep only last 100 data points

    }, 100 / speed);

    return () => clearInterval(interval);
  }, [isRunning, time, speed, civ1, civ2, warStatus, addEvent, extinctCiv, calculateBaseMilitary, activeEvent]);

  // --- Projectile Movement Logic ---
  useEffect(() => {
    if (warStatus !== 'WAR' || !isRunning) return;
    
    const interval = setInterval(() => {
      setProjectiles(prev => {
        return prev
          .map(p => ({...p, progress: p.progress + 1.5}))
          .filter(p => p.progress < 100);
      });
    }, 20);

    return () => clearInterval(interval);
  }, [warStatus, isRunning]);

  // --- Utility Functions and Components ---

  
const formatNumber = (num) => {
    if (num === Infinity || isNaN(num) || num <= 0) return '0';

    // 1경(10^16) 이상이면 숫자 대신 SINGULARITY로 표시
    if (num >= 10_000_000_000_000_000) return 'SINGULARITY';

    const units = [
      { v: 1_000_000_000_000_000, s: 'P' }, // 10^15 (Peta)
      { v: 10_000_000_000_000, s: 'T' },   // 10^13 (Tera-ish, between 조 and 경)
      { v: 1_000_000_000_000, s: 'G' },    // 10^12 (Giga)
      { v: 1_000_000_000, s: 'B' },        // 10^9  (Billion)
      { v: 1_000_000, s: 'M' },            // 10^6  (Million)
      { v: 1_000, s: 'K' }                 // 10^3  (Kilo)
    ];

    for (const u of units) {
      if (num >= u.v) return (num / u.v).toFixed(1) + u.s;
    }

    return Math.round(num).toString();
  };


  const StatBar = ({ label, value, max, color, icon: Icon }) => {
    const displayValue = Math.max(0, value);
    const percentage = Math.min(100, (displayValue / max) * 100);
    
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1 text-gray-400">
          <div className="flex items-center gap-1.5">
            <Icon size={12} strokeWidth={2} className={`text-[${color}]`} style={{color: color}}/>
            <span className="font-medium text-white">{label}</span>
          </div>
          <span className="font-mono font-semibold text-white">{formatNumber(displayValue)}</span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden border border-slate-600">
          <div 
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
    );
  };
  
  // CivPanel 컴포넌트 시그니처와 로직 수정 (setRuntimeCiv 제거 및 입력 로직 단순화)
  const CivPanel = ({ initialCiv, setInitialCiv, runtimeCiv, isRunning, disabled, calculateBaseMilitary, activeEvent }) => {
    // runtimeCiv는 화면 표시용 (StatBar, SystemHub)
    // initialCiv는 사용자 입력 필드에 바인딩 (setInitialCiv로만 업데이트)
    
    // 실행 중일 때는 모든 입력 필드를 비활성화합니다.
    const inputDisabled = disabled || isRunning;
    
    const dynamicFloor = calculateBaseMilitary(runtimeCiv);

    // Aggressiveness 및 Diplomacy 입력 핸들러
    const handlePolicyChange = (e, key) => {
        const value = Math.min(100, Math.max(0, Number(e.target.value)));
        
        // 항상 initialCiv만 업데이트하고, isRunning = false일 때 useEffect가 runtimeCiv를 동기화합니다.
        setInitialCiv(prev => ({...prev, [key]: value}));
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
        }
    }

    return (
      <div className="bg-slate-800/80 rounded-xl shadow-xl p-5 border-2 border-slate-700 backdrop-blur-sm">
        <input 
          // 이름은 initialCiv에 바인딩
          value={initialCiv.name}
          onChange={(e) => setInitialCiv(prev => ({...prev, name: e.target.value}))}
          disabled={inputDisabled}
          className="text-xl font-bold mb-4 w-full border-b pb-2 bg-transparent focus:outline-none text-white transition-colors"
          style={{borderColor: initialCiv.color, color: initialCiv.color}}
        />
        
        {/* Event Status Display */}
        <div className="min-h-[40px] mb-4">
            {eventDisplay}
        </div>
        
        {/* 런타임 통계 (Simulation Running) - 항상 runtimeCiv를 표시 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-6">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2 border-b border-slate-700 pb-1">Core Metrics (Runtime)</h3>
            {/* StatBar는 runtimeCiv의 값을 사용하므로, 동기화 Effect 덕분에 즉시 반영됨 */}
            <StatBar label="Population" value={runtimeCiv.population} max={5000} color={initialCiv.color} icon={Users} />
            <StatBar label="Resources" value={runtimeCiv.resources} max={5000} color={initialCiv.color} icon={Droplet} />
            <StatBar label="Morale" value={runtimeCiv.morale} max={100} color={initialCiv.color} icon={Heart} />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2 border-b border-slate-700 pb-1">Strategic Metrics (Runtime)</h3>
            <StatBar label="Technology" value={runtimeCiv.technology} max={500} color={initialCiv.color} icon={Cpu} />
            <StatBar label="Energy" value={runtimeCiv.energy} max={500} color={initialCiv.color} icon={Zap} />
            <StatBar label={`Military (Min: ${formatNumber(dynamicFloor)})`} value={runtimeCiv.military} max={1000} color={initialCiv.color} icon={Shield} />
          </div>
        </div>

        {/* Control Panel for Policy/Initial Vectors */}
        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3">Policy Vectors (0-100)</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block mb-1 text-gray-400 font-medium flex items-center gap-1"><Swords size={14} /> Aggressiveness</label>
              <input 
                type="number" 
                // initialCiv에 바인딩
                value={Math.round(initialCiv.aggressiveness)}
                onChange={(e) => handlePolicyChange(e, 'aggressiveness')}
                disabled={inputDisabled}
                className="w-full border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 bg-slate-700 text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-medium flex items-center gap-1"><Handshake size={14} /> Diplomacy</label>
              <input 
                type="number" 
                // initialCiv에 바인딩
                value={Math.round(initialCiv.diplomacy)}
                onChange={(e) => handlePolicyChange(e, 'diplomacy')}
                disabled={inputDisabled}
                className="w-full border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 bg-slate-700/50 text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* User-Defined Initial Parameters (항상 표시) */}
        <EditableBaseStats 
          initialCiv={initialCiv} 
          setInitialCiv={setInitialCiv} 
          disabled={inputDisabled} 
        />
      </div>
    );
  };
  
  // EditableBaseStats 컴포넌트 시그니처 수정
  const EditableBaseStats = ({ initialCiv, setInitialCiv, disabled }) => {
    
    const fields = [
      { label: 'Initial Population', key: 'population' },
      { label: 'Initial Technology', key: 'technology' },
      { label: 'Initial Military', key: 'military' },
      { label: 'Initial Resources', key: 'resources' },
      { label: 'Initial Energy', key: 'energy' },
      { label: 'Initial Morale', key: 'morale' },
      // NEW: Instinct Fields
      { label: 'Base Survival Instinct', key: 'baseSurvivalInstinct' },
      { label: 'Base Development Desire', key: 'baseDevelopmentDesire' },
    ];

    const handleInitialInputChange = (e, key) => {
        const rawValue = e.target.value;
        const numberValue = parseFloat(rawValue);
        
        // 입력이 비어있으면 0으로 처리, 아니면 파싱된 숫자 값 사용
        let valueToSet = rawValue === '' || isNaN(numberValue) ? 0 : numberValue;
        
        // Instinct and Morale are capped at 100
        if (key.includes('Instinct') || key.includes('Desire') || key === 'morale') {
            valueToSet = Math.min(100, Math.max(0, valueToSet));
        }

        // 항상 setInitialCiv만 사용
        setInitialCiv(prev => ({
            ...prev, 
            [key]: valueToSet
        }));
    };

    return (
      <div className="mt-5 pt-5 border-t border-slate-700">
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3">Initial Parameters (Editable when Paused)</h3>
        
        <div className="grid grid-cols-3 gap-3 text-xs">
          {fields.map(field => (
            <div key={field.key}>
              <label className="block mb-1 text-gray-500 font-medium">{field.label}</label>
              <input 
                type="number" 
                // initialCiv에 바인딩
                value={Math.round(initialCiv[field.key]).toString()} // 무작위 값이 소수점일 수 있으므로 반올림하여 표시
                onChange={(e) => handleInitialInputChange(e, field.key)}
                disabled={disabled} // 실행 중에는 비활성화
                className="w-full border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 bg-slate-700 text-white disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Dynamic Max values for the charts
  // Chart Max values use civ1/civ2 (runtime state), which are kept in sync with initialCiv1/2 when paused.
  const maxPop = Math.max(
    ...history.map(h => Math.max(h.civ1Pop, h.civ2Pop)),
    civ1.population,
    civ2.population,
    2000 // Minimum display scale
  );
  
  const maxMilitary = Math.max(
    ...history.map(h => Math.max(h.civ1Military, h.civ2Military)),
    civ1.military,
    civ2.military,
    200 // Minimum display scale
  );

  const maxTech = Math.max(
    ...history.map(h => Math.max(h.civ1Tech, h.civ2Tech)),
    civ1.technology,
    civ2.technology,
    100
  );
  
  const maxResources = Math.max(
    ...history.map(h => Math.max(h.civ1Resources, h.civ2Resources)),
    civ1.resources,
    civ2.resources,
    2000
  );
  
  // NEW: Energy max is now dynamically calculated
  const maxEnergy = Math.max(
    ...history.map(h => Math.max(h.civ1Energy, h.civ2Energy)),
    civ1.energy,
    civ2.energy,
    200 // Minimum display scale
  );

  // Morale is capped at 100
  const maxMorale = 100;

  // NEW: Instinct Factor Max (Calculated factors around 1.0 to 3.5)
  const maxInstinctFactor = Math.max(
    ...history.map(h => Math.max(h.civ1SurvivalInstinct || 1, h.civ2SurvivalInstinct || 1, h.civ1DevelopmentDesire || 1, h.civ2DevelopmentDesire || 1)),
    3.5 // Set minimum scale to 3.5 for stability
  );


  // --- Main Render ---
  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-slate-900 min-h-screen font-sans text-gray-100">
      <h1 className="text-4xl font-extrabold text-center mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
        Conflict Simulation Console
      </h1>
      
      {/* Control Panel */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-5 mb-6 border border-slate-700">
        <div className="flex items-center justify-between">
          
          {/* Left: Buttons */}
          <div className="flex gap-4">
            <button
              onClick={isRunning ? () => setIsRunning(false) : startSimulation}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-green-900/50 font-medium text-lg disabled:opacity-50 whitespace-nowrap"
              disabled={extinctCiv}
            >
              {/* FIX: Combined button text logic */}
              {isRunning ? (
                <><Pause size={20} /> Pause</>
              ) : (
                <>{time > 0 ? <><Play size={20} /> Continue</> : <><Play size={20} /> Start</>}</>
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
          
          {/* Right: Status and Speed */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-400 whitespace-nowrap">Time Warp:</label>
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
            {/* FIX: Stacked T + {time} for better horizontal spacing */}
            <div className="text-center">
              <div className="text-xs font-medium text-gray-400 leading-none">T +</div>
              <div className="text-xl font-mono font-semibold text-cyan-400 leading-none">{time}</div>
            </div>

            <div className={`px-4 py-1.5 rounded-lg font-bold shadow-md text-white transition-all ${warStatus === 'WAR' ? 'bg-gradient-to-r from-red-600 to-red-800 ring-4 ring-red-500/50 animate-pulse' : 'bg-gradient-to-r from-green-600 to-green-800 ring-2 ring-green-500/50'} whitespace-nowrap`}>
              {warStatus}
            </div>
          </div>
        </div>
        
        {extinctCiv && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-xl flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-red-300 font-semibold text-lg">{extinctCiv} has been extinguished. Simulation Halted. Please Reset to configure new scenario.</span>
          </div>
        )}
      </div>

      {/* Main Visualization: Capital Hubs & Conflict Line */}
      <div className="bg-slate-900 rounded-xl shadow-2xl p-8 mb-6 relative overflow-hidden border-4 border-slate-700/50" style={{height: '350px'}}>
        
        {/* Background Grid/Stars */}
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
                animation: `twinkle ${Math.random() * 4 + 2}s infinite`
              }}
            />
          ))}
        </div>

        <div className="relative h-full flex items-center justify-between px-16">
          
          {/* Civ 1 Capital Hub (Left) */}
          <SystemHub civ={initialCiv1} runtimeCiv={civ1} isRunning={isRunning} warStatus={warStatus} />

          {/* Conflict Line & Projectiles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="100%" height="100%" className="absolute">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: initialCiv1.color, stopOpacity: 0.8}} />
                  <stop offset="50%" style={{stopColor: warStatus === 'WAR' ? '#ef4444' : '#4ade80', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: initialCiv2.color, stopOpacity: 0.8}} />
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
                  filter: `drop-shadow(0 0 ${warStatus === 'WAR' ? '10px' : '4px'} ${warStatus === 'WAR' ? '#ef4444' : '#4ade80'})`
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

            {/* Projectiles - 멸망 시 렌더링하지 않음 */}
            {!extinctCiv && projectiles.map(proj => {
              const startX = proj.direction === 'right' ? 20 : 80;
              const endX = proj.direction === 'right' ? 80 : 20;
              const progressRatio = proj.progress / 100;
              
              const spreadAmount = Math.sin(progressRatio * Math.PI) * 20;
              const currentX = startX + (endX - startX) * progressRatio;
              const currentY = 50 + proj.spreadAngle * spreadAmount;
              
              const projectileColor = proj.direction === 'right' ? initialCiv1.color : initialCiv2.color;

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

          {/* Civ 2 Capital Hub (Right) */}
          <SystemHub civ={initialCiv2} runtimeCiv={civ2} isRunning={isRunning} warStatus={warStatus} />
        </div>
      </div>

      {/* Civilian & Policy Panels */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <CivPanel 
          initialCiv={initialCiv1} 
          setInitialCiv={setInitialCiv1} 
          runtimeCiv={civ1}
          isRunning={isRunning}
          disabled={extinctCiv}
          calculateBaseMilitary={calculateBaseMilitary}
          activeEvent={activeEvent.civ1} // Pass the active event state
        />
        <CivPanel 
          initialCiv={initialCiv2} 
          setInitialCiv={setInitialCiv2} 
          runtimeCiv={civ2}
          isRunning={isRunning}
          disabled={extinctCiv}
          calculateBaseMilitary={calculateBaseMilitary}
          activeEvent={activeEvent.civ2} // Pass the active event state
        />
      </div>

      {/* Trend Analysis (Graphs) */}
      {history.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl shadow-lg p-6 mb-6 border-2 border-slate-700 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-700 pb-2">Trend Analysis (All Metrics)</h2>
          <div className="space-y-8">
            
            {/* 1. Population Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Users size={16} /> Population Trajectory (Units)</h3>
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
            
            {/* 2. Military Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Shield size={16} /> Military Power Index</h3>
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

            {/* 3. Technology Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Cpu size={16} /> Technology Level</h3>
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

            {/* 4. Resources Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Droplet size={16} /> Resources Reserves</h3>
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
            
            {/* 5. Energy Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Zap size={16} /> Energy Production</h3>
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

            {/* 6. Morale Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Heart size={16} /> Morale/Stability</h3>
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

            {/* NEW 7. Survival Instinct Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Swords size={16} /> Survival Instinct Factor (x)</h3>
              <Chart 
                history={history} 
                maxVal={maxInstinctFactor} 
                key1="civ1SurvivalInstinct" 
                key2="civ2SurvivalInstinct" 
                color1={initialCiv1.color} 
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
                referenceLine={1.0} // Neutral factor is 1.0
              />
            </div>

            {/* NEW 8. Development Desire Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-wide flex items-center gap-2"><Cpu size={16} /> Development Desire Factor (x)</h3>
              <Chart 
                history={history} 
                maxVal={maxInstinctFactor} 
                key1="civ1DevelopmentDesire" 
                key2="civ2DevelopmentDesire" 
                color1={initialCiv1.color} 
                color2={initialCiv2.color}
                label1={initialCiv1.name}
                label2={initialCiv2.name}
                referenceLine={1.0} // Neutral factor is 1.0
              />
            </div>

          </div>
        </div>
      )}

      {/* Event Log */}
      {events.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl shadow-lg p-6 border-2 border-slate-700 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-5 text-white border-b border-slate-700 pb-2">System Log</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {events.map((event, i) => (
              <div key={i} className={`text-sm border-l-4 pl-4 py-2 rounded-r transition-colors duration-300 ${event.message.includes('EXTINCTION') ? 'border-red-800 bg-red-900/40' : event.message.includes('SINGULARITY') ? 'border-purple-500 bg-purple-900/30' : event.message.includes('CRISIS') ? 'border-yellow-500 bg-yellow-900/20' : event.message.includes('BOOM') ? 'border-green-400 bg-green-900/20' : event.message.includes('WAR DECLARED') ? 'border-red-500 bg-red-900/20' : event.message.includes('Peace') || event.message.includes('TRADE') ? 'border-green-500 bg-green-900/20' : event.message.includes('LOSSES') ? 'border-red-400 bg-red-900/10' : 'border-cyan-500 bg-cyan-900/10'}`}>
                <span className="font-mono text-gray-500 font-semibold">T+{event.time}</span>
                <span className="mx-2 text-gray-600">//</span>
                <span className="text-gray-200">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS for Twinkle Animation */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

// --- Sub Components for Cleanliness ---

const SystemHub = ({ civ, runtimeCiv, isRunning, warStatus }) => {
  const isDead = runtimeCiv.population <= 0;
  const hubSize = Math.max(100, Math.min(180, 100 + runtimeCiv.technology * 0.5));
  const isActive = warStatus === 'WAR' && isRunning;

  return (
    <div className="flex flex-col items-center z-10 w-48 transition-all duration-500">
      <div 
        className={`rounded-xl p-3 shadow-2xl mb-4 relative transition-all duration-500 border-2 ${isActive ? civ.accent : 'border-slate-600'} backdrop-blur-md`}
        style={{
          width: hubSize,
          height: hubSize,
          backgroundColor: isDead ? 'rgba(0,0,0,0.5)' : 'rgba(15, 23, 42, 0.7)', // Slate-900 with transparency
          boxShadow: `0 0 ${isActive ? 30 : 15}px ${civ.color}, inset 0 0 10px rgba(255,255,255,0.1)`,
          transform: `scale(${isDead ? 0.8 : 1})`,
          opacity: isDead ? 0.4 : 1,
        }}
      >
        <div className="text-center">
            <div className="text-xs uppercase font-bold text-gray-400 mb-1">Status</div>
            <div className={`text-lg font-mono font-extrabold ${runtimeCiv.isSingularity ? 'text-purple-400' : isDead ? 'text-gray-400' : isActive ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {runtimeCiv.isSingularity ? 'SINGULARITY' : isDead ? 'EXTINCT' : isActive ? 'COMBAT' : 'ONLINE'}
            </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700">
            <DataPoint label="Tech" value={Math.round(runtimeCiv.technology)} icon={Cpu} color={civ.color} />
            <DataPoint label="Mil." value={runtimeCiv.military} icon={Shield} color={civ.color} />
        </div>
        {isActive && !isDead && <span className={`absolute top-0 right-0 p-1 rounded-full text-white ${civ.accent}`} style={{backgroundColor: civ.color}}><Swords size={12} /></span>}
      </div>
      <div className="text-white font-bold text-xl tracking-wide text-center" style={{color: civ.color}}>{civ.name}</div>
      <div className="text-gray-400 text-sm mt-1 font-mono">{formatNumber(runtimeCiv.population)} Population</div>
    </div>
  );
};

const DataPoint = ({ label, value, icon: Icon, color }) => (
    <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-1 text-gray-400">
            <Icon size={12} style={{color: color}} />
            <span className="font-medium text-white">{label}:</span>
        </div>
        <span className="font-mono font-semibold" style={{color: color}}>{formatNumber(value)}</span>
    </div>
);


const Chart = ({ history, maxVal, key1, key2, color1, color2, label1, label2, referenceLine }) => {
    const width = 800;
    const height = 120;
    const padding = 10;
    const innerHeight = height - padding * 2;
    
    // Normalize data points
    const normalize = (value) => (value / maxVal) * innerHeight;
    
    // Generate points for the SVG polyline
    const points1 = history.map((h, i) => {
        const x = i * (width / (history.length - 1 || 1));
        const y = height - padding - normalize(Math.min(maxVal, h[key1] || 1.0)); // Default to 1.0 if not logged yet
        return `${x},${y}`;
    }).join(' ');

    const points2 = history.map((h, i) => {
        const x = i * (width / (history.length - 1 || 1));
        const y = height - padding - normalize(Math.min(maxVal, h[key2] || 1.0)); // Default to 1.0 if not logged yet
        return `${x},${y}`;
    }).join(' ');

    // Area points (starting and ending at the bottom)
    const areaPoints1 = `${points1} ${width},${height - padding} 0,${height - padding}`;
    const areaPoints2 = `${points2} ${width},${height - padding} 0,${height - padding}`;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="border border-slate-700 rounded-lg bg-slate-900/50" preserveAspectRatio="none">
            <defs>
                {/* Gradient for Civ 1 */}
                <linearGradient id="grad1Chart" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: color1, stopOpacity: 0.3}} />
                    <stop offset="100%" style={{stopColor: color1, stopOpacity: 0}} />
                </linearGradient>
                {/* Gradient for Civ 2 */}
                <linearGradient id="grad2Chart" x1="0%" y1="0%" x2="0%" y2="100%">
                    {/* FIXED: Removed duplicate x2="0%" attribute */}
                    <stop offset="0%" style={{stopColor: color2, stopOpacity: 0.3}} />
                    <stop offset="100%" style={{stopColor: color2, stopOpacity: 0}} />
                </linearGradient>
            </defs>
            
            {/* Horizontal Grid Lines (Basic) */}
            <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="#334155" strokeWidth="1" />
            
            {/* Reference Line (e.g., at 1.0 for neutral factor) */}
            {referenceLine !== undefined && (
                <line 
                    x1="0" 
                    y1={height - padding - normalize(referenceLine)} 
                    x2={width} 
                    y2={height - padding - normalize(referenceLine)} 
                    stroke="#ffffff" // White dashed line
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                />
            )}

            {/* Area 1 */}
            <polyline
                points={areaPoints1}
                fill="url(#grad1Chart)"
                vectorEffect="non-scaling-stroke"
            />
            {/* Line 1 */}
            <polyline
                points={points1}
                fill="none"
                stroke={color1}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
            />

            {/* Area 2 */}
            <polyline
                points={areaPoints2}
                fill="url(#grad2Chart)"
                vectorEffect="non-scaling-stroke"
            />
            {/* Line 2 */}
            <polyline
                points={points2}
                fill="none"
                stroke={color2}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
            />

            {/* Legend - Manually placed in top right */}
            <g transform="translate(680, 10)">
              <rect x="0" y="0" width="115" height="60" fill="#1e293b" rx="5" ry="5" opacity="0.8" />
              <circle cx="10" cy="10" r="4" fill={color1} />
              <text x="20" y="14" fontSize="10" fill="white">{label1}</text>
              <circle cx="10" cy="30" r="4" fill={color2} />
              <text x="20" y="34" fontSize="10" fill="white">{label2}</text>
            </g>
        </svg>
    );
};


const formatNumber = (num) => {
    if (num === Infinity || isNaN(num) || num <= 0) return '0';

    // 1경(10^16) 이상이면 숫자 대신 SINGULARITY로 표시
    if (num >= 10_000_000_000_000_000) return 'SINGULARITY';

    const units = [
      { v: 1_000_000_000_000_000, s: 'P' }, // 10^15 (Peta)
      { v: 10_000_000_000_000, s: 'T' },   // 10^13 (Tera-ish, between 조 and 경)
      { v: 1_000_000_000_000, s: 'G' },    // 10^12 (Giga)
      { v: 1_000_000_000, s: 'B' },        // 10^9  (Billion)
      { v: 1_000_000, s: 'M' },            // 10^6  (Million)
      { v: 1_000, s: 'K' }                 // 10^3  (Kilo)
    ];

    for (const u of units) {
      if (num >= u.v) return (num / u.v).toFixed(1) + u.s;
    }

    return Math.round(num).toString();
  };


export default SciFiConflictSimulator;
