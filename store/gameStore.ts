import { create } from 'zustand';
import {
  GameState, Agent, Enemy, Bullet, Command, Particle, DamageNumber, ScreenShake, GamePhase,
  EnemyType, AgentAbility, AgentBrain, AgentType
} from '../app/game/types';
import {
  createAgent, upgradeAgent, grantUpgradePoint, getEffectiveRange, getEffectiveDamage, getEffectiveFireRate, agentCanShoot, shoot,
  updateAgentThought
} from '../core/agents/agent';
import {
  createEnemy, moveEnemy, isEnemyDead, damageEnemy, isEnemyPastBase, updateHealer
} from '../core/enemies/enemy';
import { decideTarget } from '../core/agents/decision';
import { RuleBasedBrain, useAbility } from '../core/agents/brain';

const GOLD_PER_KILL: Record<EnemyType, number> = {
  FAST: 10,
  TANK: 30,
  HEALER: 25,
  ARMORED: 20,
  BOSS: 100
};

const UPGRADE_COSTS = {
  damage: 50,
  range: 40,
  fireRate: 60,
  ability: 100
};

const ABILITY_COSTS: Record<AgentType, number> = {
  DEFENDER: 3,
  SNIPER: 2
};

const AGENT_SELL_VALUE = 0.7;

const PLACEMENT_Y = [120, 200, 280, 360, 440];

const WAVE_COMPOSITION = [
  { fast: 3, tank: 1, healer: 0, armored: 0, hasBoss: false },
  { fast: 5, tank: 2, healer: 1, armored: 1, hasBoss: false },
  { fast: 8, tank: 3, healer: 2, armored: 2, hasBoss: false },
  { fast: 12, tank: 4, healer: 3, armored: 3, hasBoss: true },
  { fast: 15, tank: 5, healer: 4, armored: 4, hasBoss: true },
];

let idCounter = 0;
const generateId = () => `id-${++idCounter}`;

const createInitialState = (): GameState & { connectedWallet: string | null } => ({
  agents: [],
  enemies: [],
  bullets: [],
  particles: [],
  damageNumbers: [],
  screenShake: null,
  currentCommand: 'BASE',
  wave: 1,
  score: 0,
  gold: 500,
  elixir: 5,
  maxElixir: 10,
  elixirRegenRate: 1,
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
  maxLives: 5,
  connectedWallet: null
});

interface GameStore extends GameState {
  connectedWallet: string | null;
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
  setWalletAddress: (address: string | null) => void;
  saveGame: (address: string) => void;
  loadGame: (address: string) => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setCommand: (cmd) => set({ currentCommand: cmd }),

  startGame: () => {
    const state = get();
    if (state.agents.length === 0) {
      const newAgents: Agent[] = [];
      const positions = [
        { x: 100, y: 120 },
        { x: 100, y: 200 },
        { x: 100, y: 280 },
        { x: 100, y: 360 },
        { x: 100, y: 440 },
      ];
      const types: ('DEFENDER' | 'SNIPER')[] = ['DEFENDER', 'DEFENDER', 'SNIPER', 'SNIPER', 'DEFENDER'];
      positions.forEach((pos, i) => {
        const personality: 'AGGRESSIVE' | 'DEFENSIVE' = i % 2 === 0 ? 'AGGRESSIVE' : 'DEFENSIVE';
        newAgents.push(createAgent(generateId(), { type: types[i], position: pos, personality }));
      });
      set({
        agents: newAgents,
        isRunning: true,
        phase: 'FIGHT',
        wave: 1,
        enemySpawnTimer: 0,
        gold: 500,
        elixir: 5,
        lives: 5,
        remainingAgentsToPlace: 0
      });
    } else {
      set({ phase: 'FIGHT', wave: 1, enemySpawnTimer: 0, gameTime: 0, isRunning: true });
    }
  },

  startPlacement: () => {
    set({ phase: 'PLACEMENT', placementTime: 30, remainingAgentsToPlace: 5 });
  },

  placeAgent: (type, x, y) => {
    const state = get();
    if (state.phase !== 'PLACEMENT') return;
    if (state.remainingAgentsToPlace <= 0) return;
    const occupied = state.agents.some(a => Math.abs(a.position.x - x) < 30 && Math.abs(a.position.y - y) < 30);
    if (occupied) return;
    const cost = type === 'DEFENDER' ? 40 : 60;
    if (state.gold < cost) return;
    const defenders = state.agents.filter(a => a.type === 'DEFENDER').length;
    const snipers = state.agents.filter(a => a.type === 'SNIPER').length;
    const personality: 'AGGRESSIVE' | 'DEFENSIVE' =
      (type === 'DEFENDER' ? defenders % 2 : snipers % 2) === 0 ? 'AGGRESSIVE' : 'DEFENSIVE';
    const newAgent = createAgent(generateId(), { type, position: { x, y }, personality });
    set(state => {
      const newRemaining = state.remainingAgentsToPlace - 1;
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

  selectAgentForUpgrade: (agentId) => {
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
    const refund = Math.floor(50 * AGENT_SELL_VALUE);
    set(state => ({
      agents: state.agents.filter(a => a.id !== agentId),
      gold: state.gold + refund
    }));
  },

  setWalletAddress: (address) => {
    set({ connectedWallet: address });
  },

  saveGame: (address) => {
    const state = get();
    if (!address) return;
    const saveData = {
      agents: state.agents.map(a => ({
        id: a.id,
        type: a.type,
        position: a.position,
        personality: a.personality,
        level: a.level,
        rangeMult: a.rangeMult,
        damageMult: a.damageMult,
        fireRateMult: a.fireRateMult,
        abilityCooldown: a.abilityCooldown,
        ability: a.ability
      })),
      gold: state.gold,
      lives: state.lives,
      score: state.score,
      wave: state.wave,
      currentCommand: state.currentCommand,
      elixir: state.elixir
    };
    try {
      localStorage.setItem(`adp_save_${address.toLowerCase()}`, JSON.stringify(saveData));
    } catch (e) {
      console.error('Save failed', e);
    }
  },

  loadGame: (address) => {
    if (!address) return false;
    try {
      const saved = localStorage.getItem(`adp_save_${address.toLowerCase()}`);
      if (!saved) return false;
      const data = JSON.parse(saved);
      const agents = data.agents.map((a: any) => ({
        ...a,
        brain: new RuleBasedBrain() as AgentBrain,
        lastShot: 0,
        lastThought: 'Loaded',
        thoughtTimer: 0,
        radius: a.type === 'DEFENDER' ? 15 : 12,
        color: a.type === 'DEFENDER' ? '#3b82f6' : '#10b981',
        upgradePoints: 0
      }));
      set({
        agents,
        gold: data.gold,
        lives: data.lives,
        score: data.score,
        wave: data.wave,
        currentCommand: data.currentCommand || 'BASE',
        elixir: data.elixir,
        isRunning: false,
        phase: 'BETWEEN_WAVES',
        remainingAgentsToPlace: 0
      });
      return true;
    } catch (e) {
      console.error('Load failed', e);
      return false;
    }
  },

  applyAbilityEffect: (effect) => {
    const { x, y, radius, damage, type } = effect;
    const state = get();
    const affectedEnemies = state.enemies.filter(e => {
      const dist = Math.hypot(e.position.x - x, e.position.y - y);
      return dist <= radius && e.currentHp > 0;
    });
    const updatedEnemies = state.enemies.map(e => {
      if (affectedEnemies.some(ae => ae.id === e.id)) {
        damageEnemy(e, damage);
      }
      return e;
    });
    get().createParticle(x, y, type === 'AOE' ? '#ef4444' : type === 'SLOW' ? '#3b82f6' : '#10b981', 15);
    set({ enemies: updatedEnemies });
  },

  update: (deltaTime) => {
    const state = get();
    if (!state.isRunning) return;
    const now = performance.now();

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
          if (state.gold >= (type === 'DEFENDER' ? 40 : 60)) {
            state.addAgent(type, 100, y, i % 2 === 0 ? 'AGGRESSIVE' : 'DEFENSIVE');
          }
        }
        set({ phase: 'FIGHT', wave: 1, enemySpawnTimer: 0 });
      }
      return;
    }

    if (state.phase === 'BETWEEN_WAVES') return;

    let newShake = state.screenShake;
    if (newShake) {
      newShake = { ...newShake, elapsed: newShake.elapsed + deltaTime };
      if (newShake.elapsed >= newShake.duration) newShake = null;
    }

    const movedEnemies = state.enemies.map(e => {
      moveEnemy(e, deltaTime);
      updateHealer(e, state.enemies, deltaTime);
      return e;
    });

    const updatedAgents = state.agents.map(agent => ({
      ...agent,
      lastThought: updateAgentThought(agent, movedEnemies, state.currentCommand, deltaTime)
    }));

    const newBullets: Bullet[] = [...state.bullets];
    const abilitiesUsed: Array<{ agent: Agent; effect: any }> = [];

    updatedAgents.forEach(agent => {
      const abilityEffect = useAbility(agent, movedEnemies, now);
      if (abilityEffect) {
        abilitiesUsed.push({ agent, effect: abilityEffect });
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

    let newElixir = state.elixir + state.elixirRegenRate * deltaTime;
    if (newElixir > state.maxElixir) newElixir = state.maxElixir;

    const totalAbilityCost = abilitiesUsed.reduce((sum, { agent }) => sum + ABILITY_COSTS[agent.type], 0);
    if (newElixir >= totalAbilityCost) {
      newElixir -= totalAbilityCost;
      abilitiesUsed.forEach(({ effect }) => {
        get().applyAbilityEffect(effect);
      });
    }

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

    const aliveEnemies = movedEnemies.filter(e => !isEnemyDead(e));
    const deadEnemies = movedEnemies.filter(e => isEnemyDead(e));

    let newGold = state.gold;
    let newScore = state.score;
    deadEnemies.forEach(e => {
      newGold += GOLD_PER_KILL[e.type];
      newScore += GOLD_PER_KILL[e.type] * 2;
    });

    const canvasWidth = 1000;
    const breaches = aliveEnemies.filter(e => isEnemyPastBase(e, canvasWidth));
    if (breaches.length > 0) {
      set({ lives: state.lives - breaches.length });
      if (state.lives - breaches.length <= 0) {
        set({ isRunning: false, phase: 'GAME_OVER' });
        return;
      }
    }

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
        gold: state.gold,
        availableUpgradePoints: pointsAwarded * agentsWithPoints.length,
        enemySpawnTimer: 10
      });
      return;
    }

    if (spawnTimer <= 0) {
      get().spawnWave(currentWave);
      spawnTimer = 3;
    }

    const movedParticles = state.particles.map(p => ({
      ...p,
      x: p.x + p.vx * deltaTime,
      y: p.y + p.vy * deltaTime,
      vy: p.vy + 150 * deltaTime,
      life: p.life - deltaTime
    })).filter(p => p.life > 0);

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
      elixir: newElixir,
      enemySpawnTimer: spawnTimer,
      wave: currentWave,
      gameTime: state.gameTime + deltaTime
    });
  }
}));
