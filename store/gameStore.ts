import { create } from 'zustand';
import {
  GameState, Agent, Enemy, Bullet, Command, Particle, DamageNumber, ScreenShake, GamePhase,
  EnemyType, AgentAbility
} from '../app/game/types';
import {
  createAgent, upgradeAgent, grantUpgradePoint, getEffectiveRange, getEffectiveDamage, getEffectiveFireRate, agentCanShoot, shoot,
  updateAgentThought
} from '../core/agents/agent';
import {
  createEnemy, moveEnemy, isEnemyDead, damageEnemy, isEnemyPastBase, updateHealer
} from '../core/enemies/enemy';
import { decideTarget } from '../core/agents/decision';
import { useAbility } from '../core/agents/brain';

const GOLD_PER_KILL: Record<EnemyType, number> = {
  FAST: 10,
  TANK: 30,
  HEALER: 25,
  ARMORED: 20
};

const UPGRADE_COSTS = {
  damage: 50,
  range: 40,
  fireRate: 60,
  ability: 100
};

const AGENT_SELL_VALUE = 0.7; // 70% refund

interface GameStore extends GameState {
  // Actions
  setCommand: (cmd: Command) => void;
  startGame: () => void;
  startPlacement: () => void;
  placeAgent: (type: 'DEFENDER' | 'SNIPER', x: number, y: number) => void;
  update: (deltaTime: number) => void;
  spawnEnemy: (type: EnemyType, y?: number) => void;
  addAgent: (type: 'DEFENDER' | 'SNIPER', x: number, y: number, personality: 'AGGRESSIVE' | 'DEFENSIVE') => void;
  upgradeSelectedAgent: (type: 'damage' | 'range' | 'fireRate' | 'ability') => void;
  selectAgentForUpgrade: (agentId: string | null) => void;
  startNextWave: () => void;
  spawnWave: (wave: number) => void;
  createParticle: (x: number, y: number, color: string, count: number, type?: Particle['type']) => void;
  createDamageNumber: (x: number, y: number, value: number, color: string) => void;
  shakeScreen: (intensity: number, duration: number) => void;
  sellAgent: (agentId: string) => void;
  applyAbilityEffect: (effect: { x: number; y: number; radius: number; damage: number; type: string; effect?: { type: 'SLOW' | 'BUFF'; amount: number; duration: number } }) => void;
}

// Generate unique IDs
let idCounter = 0;
const generateId = () => `id-${++idCounter}`;

// Available agent placements (lane positions)
const PLACEMENT_Y = [120, 200, 280, 360, 440];

// Enemy wave compositions (by wave)
const WAVE_COMPOSITION = [
  { fast: 3, tank: 1, healer: 0, armored: 0, hasBoss: false },
  { fast: 5, tank: 2, healer: 1, armored: 1, hasBoss: false },
  { fast: 8, tank: 3, healer: 2, armored: 2, hasBoss: false },
  { fast: 12, tank: 4, healer: 3, armored: 3, hasBoss: true },
  { fast: 15, tank: 5, healer: 4, armored: 4, hasBoss: true },
];

const createInitialState = (): GameState => ({
  agents: [],
  enemies: [],
  bullets: [],
  particles: [],
  damageNumbers: [],
  screenShake: null,
  currentCommand: 'BASE',
  wave: 1,
  score: 0,
  gold: 500, // starting gold
  enemySpawnTimer: 0,
  gameTime: 0,
  isRunning: false,
  phase: 'PLACEMENT',
  placementTime: 30,
  upgradeSelection: null,
  availableUpgradePoints: 0,
  maxAgents: 5,
  remainingAgentsToPlace: 5,
  lives: 5,
  maxLives: 5
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setCommand: (cmd: Command) => set({ currentCommand: cmd }),

  startGame: () => {
    const state = get();
    if (state.agents.length === 0) {
      set({ isRunning: true, phase: 'PLACEMENT', placementTime: 30, remainingAgentsToPlace: 5, agents: [], gold: 500, lives: 5 });
    } else {
      set({ phase: 'FIGHT', wave: 1, enemySpawnTimer: 0, gameTime: 0, isRunning: true });
    }
  },

  startPlacement: () => {
    set({ phase: 'PLACEMENT', placementTime: 30, remainingAgentsToPlace: 5 });
  },

  placeAgent: (type, x, y) => {
    const state = get();
    console.log('[DEBUG] placeAgent', { type, x, y, phase: state.phase, remaining: state.remainingAgentsToPlace, gold: state.gold, agentsCount: state.agents.length });
    if (state.phase !== 'PLACEMENT') {
      console.log('[DEBUG] reject: not PLACEMENT');
      return;
    }
    if (state.remainingAgentsToPlace <= 0) {
      console.log('[DEBUG] reject: none remaining');
      return;
    }
    const cost = type === 'DEFENDER' ? 40 : 60;
    if (state.gold < cost) {
      console.log('[DEBUG] reject: insufficient gold');
      return;
    }

    // Simple placement: directly at clicked position (left side enforced in UI)
    const defenders = state.agents.filter(a => a.type === 'DEFENDER').length;
    const snipers = state.agents.filter(a => a.type === 'SNIPER').length;
    const personality: 'AGGRESSIVE' | 'DEFENSIVE' =
      (type === 'DEFENDER' ? defenders % 2 : snipers % 2) === 0 ? 'AGGRESSIVE' : 'DEFENSIVE';

    const newAgent = createAgent(generateId(), { type, position: { x, y }, personality });

    set(state => {
      const newRemaining = state.remainingAgentsToPlace - 1;
      console.log('[DEBUG] setState newRemaining:', newRemaining, 'agents before:', state.agents.length);
      return {
        agents: [...state.agents, newAgent],
        remainingAgentsToPlace: newRemaining,
        gold: state.gold - cost,
        ...(newRemaining <= 0 ? { phase: 'FIGHT' as GamePhase, wave: 1, enemySpawnTimer: 0 } : {})
      };
    });
  },

  startNextWave: () => {
    const state = get();
    if (state.phase === 'BETWEEN_WAVES') {
      set({ phase: 'FIGHT', enemySpawnTimer: 0, wave: state.wave + 1 });
    }
  },

  spawnWave: (wave) => {
    const comp = WAVE_COMPOSITION[Math.min(wave - 1, WAVE_COMPOSITION.length - 1)];
    for (let i = 0; i < comp.fast; i++) get().spawnEnemy('FAST');
    for (let i = 0; i < comp.tank; i++) get().spawnEnemy('TANK');
    for (let i = 0; i < comp.healer; i++) get().spawnEnemy('HEALER');
    for (let i = 0; i < comp.armored; i++) get().spawnEnemy('ARMORED');
  },

  spawnEnemy: (type, y) => {
    const state = get();
    const spawnY = y !== undefined ? y : PLACEMENT_Y[Math.floor(Math.random() * PLACEMENT_Y.length)];
    const enemy = createEnemy(generateId(), { type, position: { x: -50, y: spawnY } }, state.wave);
    set({ enemies: [...state.enemies, enemy] });
  },

  upgradeSelectedAgent: (type) => {
    const state = get();
    const selection = state.upgradeSelection;
    if (!selection) return;
    const agent = state.agents.find(a => a.id === selection.agentId);
    if (!agent || agent.upgradePoints <= 0) return;

    const cost = UPGRADE_COSTS[type];
    if (state.gold < cost) return;

    if (upgradeAgent(agent, type)) {
      set(state => ({
        agents: [...state.agents],
        gold: state.gold - cost,
        upgradeSelection: state.upgradeSelection
      }));
    }
  },

  selectAgentForUpgrade: (agentId: string | null) => {
    if (agentId === null) {
      set({ upgradeSelection: null });
      return;
    }
    const agent = get().agents.find(a => a.id === agentId);
    if (agent && (agent.upgradePoints > 0 || agent.ability)) {
      set({ upgradeSelection: { agentId, type: 'damage' } });
    } else {
      set({ upgradeSelection: null });
    }
  },

  addAgent: (type, x, y, personality) => {
    const cost = type === 'DEFENDER' ? 40 : 60;
    if (get().gold < cost) return;
    const newAgent = createAgent(generateId(), { type, position: { x, y }, personality });
    set(state => ({ agents: [...state.agents, newAgent], gold: state.gold - cost }));
  },

  createParticle: (x, y, color, count, type = 'hit') => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      newParticles.push({
        id: generateId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 3,
        type
      });
    }
    set(state => ({ particles: [...state.particles, ...newParticles] }));
  },

  createDamageNumber: (x, y, value, color) => {
    const newDn: DamageNumber = {
      id: generateId(),
      x,
      y,
      value,
      life: 1.0,
      maxLife: 1.0,
      color,
      size: 16
    };
    set(state => ({ damageNumbers: [...state.damageNumbers, newDn] }));
  },

  shakeScreen: (intensity, duration) => {
    set({ screenShake: { intensity, duration, elapsed: 0 } });
  },

  sellAgent: (agentId) => {
    const state = get();
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;
    const refund = Math.floor(50 * AGENT_SELL_VALUE); // base value * refund rate

    set(state => ({
      agents: state.agents.filter(a => a.id !== agentId),
      gold: state.gold + refund
    }));
  },

  applyAbilityEffect: (effect) => {
    const { x, y, radius, damage, type } = effect;
    const state = get();
    const updatedEnemies = state.enemies.map(e => {
      const dist = Math.hypot(e.position.x - x, e.position.y - y);
      if (dist <= radius && e.currentHp > 0) {
        damageEnemy(e, damage);
      }
      return e;
    });

    // Create particles inline
    const particleColor = type === 'AOE' ? '#ef4444' : type === 'SLOW' ? '#3b82f6' : '#10b981';
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      newParticles.push({
        id: generateId(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        color: particleColor,
        size: 2 + Math.random() * 3,
        type: type === 'AOE' ? 'aoe' : type === 'SLOW' ? 'slow' : 'buff'
      });
    }

    set(state => ({
      enemies: updatedEnemies,
      particles: [...state.particles, ...newParticles]
    }));
  },

  update: (deltaTime) => {
    const state = get();
    if (!state.isRunning) return;

    const now = performance.now();

    // Handle phase
    if (state.phase === 'PLACEMENT') {
      const remaining = Math.max(0, state.placementTime - deltaTime);
      set({ placementTime: remaining });
      if (remaining <= 0 && state.remainingAgentsToPlace === 0) {
        set({ phase: 'FIGHT', wave: 1, enemySpawnTimer: 0 });
      } else if (remaining <= 0) {
        const needed = 5 - state.agents.length;
        for (let i = 0; i < needed; i++) {
          const type: 'DEFENDER' | 'SNIPER' = i % 2 === 0 ? 'DEFENDER' : 'SNIPER';
          const y = PLACEMENT_Y[Math.floor(Math.random() * PLACEMENT_Y.length)];
          if (state.gold >= (type === 'DEFENDER' ? 50 : 80)) {
            state.addAgent(type, 100, y, i % 2 === 0 ? 'AGGRESSIVE' : 'DEFENSIVE');
          }
        }
        set({ phase: 'FIGHT', wave: 1, enemySpawnTimer: 0 });
      }
      return;
    }

    if (state.phase === 'BETWEEN_WAVES') return;

    // Screen shake decay
    let newShake = state.screenShake;
    if (newShake) {
      newShake = { ...newShake, elapsed: newShake.elapsed + deltaTime };
      if (newShake.elapsed >= newShake.duration) newShake = null;
    }

    // 1. Move enemies & healers
    const movedEnemies = state.enemies.map(e => {
      moveEnemy(e, deltaTime);
      updateHealer(e, state.enemies, deltaTime);
      return e;
    });

    // 2. Update agent thoughts (clone & mutate for immutability)
    const updatedAgents = state.agents.map(agent => {
      const clone = { ...agent };
      updateAgentThought(clone, movedEnemies, state.currentCommand, deltaTime);
      return clone;
    });

    // 3. Agents shoot + abilities
    const newBullets: Bullet[] = [...state.bullets];
    const abilitiesUsed: Array<{ agentId: string; effect: any }> = [];

    updatedAgents.forEach(agent => {
      const abilityEffect = useAbility(agent, movedEnemies, now);
      if (abilityEffect) {
        abilitiesUsed.push({ agentId: agent.id, effect: abilityEffect });
      }

      if (!agentCanShoot(agent, now)) return;

      const target = decideTarget(agent, movedEnemies, state.currentCommand);
      if (target) {
        shoot(agent, target, now);
        newBullets.push({
          id: generateId(),
          from: { ...agent.position },
          to: { ...target.position },
          targetId: target.id,
          damage: getEffectiveDamage(agent),
          speed: 500,
          progress: 0
        });
      }
    });

    // Apply ability effects
    abilitiesUsed.forEach(({ effect }) => {
      get().applyAbilityEffect(effect);
    });

    // 4. Move bullets
    const updatedBullets = newBullets.map(bullet => {
      const moveDist = bullet.speed * deltaTime;
      const totalDist = Math.hypot(bullet.to.x - bullet.from.x, bullet.to.y - bullet.from.y);
      bullet.progress += moveDist / totalDist;

      if (bullet.progress >= 1) {
        const target = movedEnemies.find(e => e.id === bullet.targetId);
        if (target) {
          damageEnemy(target, bullet.damage);
          get().createParticle(target.position.x, target.position.y, '#fbbf24', 5);
          get().createDamageNumber(target.position.x, target.position.y - 20, Math.floor(bullet.damage), '#fef08a');
          if (bullet.damage > target.maxHp * 0.2) {
            get().shakeScreen(5, 0.1);
          }
        }
        return null;
      }
      return bullet;
    }).filter(Boolean) as Bullet[];

    // 5. Clean up dead enemies
    const aliveEnemies = movedEnemies.filter(e => !isEnemyDead(e));
    const deadEnemies = movedEnemies.filter(e => isEnemyDead(e));

    // Award gold and score for kills
    let newGold = state.gold;
    let newScore = state.score;
    deadEnemies.forEach(e => {
      newGold += GOLD_PER_KILL[e.type];
      newScore += GOLD_PER_KILL[e.type] * 2;
    });

    // 6. Enemies reaching base
    const canvasWidth = 1000;
    const breaches = aliveEnemies.filter(e => isEnemyPastBase(e, canvasWidth));
    if (breaches.length > 0) {
      set({ lives: state.lives - breaches.length });
      if (state.lives - breaches.length <= 0) {
        set({ isRunning: false, phase: 'BETWEEN_WAVES' });
        return;
      }
    }

    // 7. Spawning logic
    let spawnTimer = state.enemySpawnTimer - deltaTime;
    let currentWave = state.wave;

    if (spawnTimer <= 0 && aliveEnemies.length === 0) {
      const maxWave = WAVE_COMPOSITION.length;
      if (currentWave >= maxWave) {
        set({ phase: 'BETWEEN_WAVES', enemies: [], bullets: [], isRunning: false });
        return;
      }

      const pointsAwarded = 1 + Math.floor(currentWave / 2);
      const agentsWithPoints = updatedAgents.map(a => ({
        ...a,
        upgradePoints: a.upgradePoints + pointsAwarded
      }));

      set({
        agents: agentsWithPoints,
        phase: 'BETWEEN_WAVES',
        wave: currentWave + 1,
        gold: state.gold, // keep gold
        availableUpgradePoints: pointsAwarded * agentsWithPoints.length,
        enemySpawnTimer: 10
      });
      return;
    }

    if (spawnTimer <= 0) {
      get().spawnWave(currentWave);
      spawnTimer = 3;
    }

    // 8. Update particles (gravity, fade)
    const movedParticles = state.particles.map(p => ({
      ...p,
      x: p.x + p.vx * deltaTime,
      y: p.y + p.vy * deltaTime,
      vy: p.vy + 150 * deltaTime,
      life: p.life - deltaTime
    })).filter(p => p.life > 0);

    // 9. Update damage numbers (float up, fade)
    const updatedDamageNumbers = state.damageNumbers.map(dn => ({
      ...dn,
      y: dn.y - 30 * deltaTime,
      life: dn.life - deltaTime
    })).filter(dn => dn.life > 0);

    set({
      agents: updatedAgents,
      enemies: aliveEnemies,
      bullets: updatedBullets,
      particles: movedParticles,
      damageNumbers: updatedDamageNumbers,
      screenShake: newShake,
      score: newScore,
      gold: newGold,
      enemySpawnTimer: spawnTimer,
      wave: currentWave,
      gameTime: state.gameTime + deltaTime
    });
  }
}));
