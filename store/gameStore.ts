import { create } from 'zustand';
import { GameState, Agent, Enemy, Bullet, Command } from '../app/game/types';
import { createAgent, updateAgentThought, agentCanShoot, shoot } from '../core/agents/agent';
import { createEnemy, moveEnemy, isEnemyDead, damageEnemy, isEnemyPastBase } from '../core/enemies/enemy';
import { RuleBasedBrain } from '../core/agents/brain';

interface GameStore extends GameState {
  // Actions
  setCommand: (cmd: Command) => void;
  startGame: () => void;
  update: (deltaTime: number) => void;
  spawnEnemy: (type: 'FAST' | 'TANK') => void;
  addAgent: (type: 'DEFENDER' | 'SNIPER', x: number, y: number, personality: 'AGGRESSIVE' | 'DEFENSIVE') => void;
}

const AGENT_SPAWN_POSITIONS = [
  { x: 100, y: 150 },
  { x: 100, y: 250 },
  { x: 100, y: 350 },
  { x: 100, y: 450 },
];

const AGENTS_PER_TEAM = 2; // 2 defenders, 2 snipers

// Generate unique IDs
let idCounter = 0;
const generateId = () => `id-${++idCounter}`;

// Initial state factory
const createInitialState = (): GameState => ({
  agents: [],
  enemies: [],
  bullets: [],
  currentCommand: 'BASE',
  wave: 1,
  score: 0,
  enemySpawnTimer: 0,
  gameTime: 0,
  isRunning: false,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setCommand: (cmd: Command) => set({ currentCommand: cmd }),

  startGame: () => {
    const state = get();
    if (state.agents.length === 0) {
      // Create default agents
      const newAgents: Agent[] = [];
      for (let i = 0; i < AGENTS_PER_TEAM; i++) {
        newAgents.push(createAgent(generateId(), {
          type: 'DEFENDER',
          position: AGENT_SPAWN_POSITIONS[i],
          personality: i % 2 === 0 ? 'AGGRESSIVE' : 'DEFENSIVE'
        }));
        newAgents.push(createAgent(generateId(), {
          type: 'SNIPER',
          position: AGENT_SPAWN_POSITIONS[i],
          personality: i % 2 === 0 ? 'DEFENSIVE' : 'AGGRESSIVE'
        }));
      }
      set({ agents: newAgents, isRunning: true, gameTime: 0 });
    } else {
      set({ isRunning: true });
    }
  },

  addAgent: (type, x, y, personality) => {
    set(state => ({
      agents: [...state.agents, createAgent(generateId(), { type, position: { x, y }, personality })]
    }));
  },

  spawnEnemy: (type) => {
    const state = get();
    const y = 100 + Math.random() * 400; // Random Y
    const enemy = createEnemy(generateId(), { type, position: { x: -50, y } }, state.wave);
    set({ enemies: [...state.enemies, enemy] });
  },

  update: (deltaTime: number) => {
    const { agents, enemies, bullets, currentCommand, wave, score } = get();
    const now = performance.now();

    // 1. Move enemies
    const movedEnemies = enemies.map(e => {
      moveEnemy(e, deltaTime);
      return e;
    });

    // 2. Update agent thoughts
    agents.forEach(agent => {
      updateAgentThought(agent, movedEnemies, currentCommand, deltaTime);
    });

    // 3. Agents decide targets and shoot
    const newBullets: Bullet[] = [...bullets];
    agents.forEach(agent => {
      if (!agentCanShoot(agent, now)) return;

      const brain = new RuleBasedBrain();
      const target = brain.decide(agent, movedEnemies, currentCommand);
      if (target) {
        shoot(agent, target, now);
        newBullets.push({
          id: generateId(),
          from: { ...agent.position },
          to: { ...target.position },
          targetId: target.id,
          damage: agent.damage,
          speed: 500, // pixels per second
          progress: 0
        });
      }
    });

    // 4. Move bullets and apply damage
    const updatedBullets = newBullets.map(bullet => {
      const moveDist = bullet.speed * deltaTime;
      const totalDist = Math.hypot(bullet.to.x - bullet.from.x, bullet.to.y - bullet.from.y);
      bullet.progress += moveDist / totalDist;

      if (bullet.progress >= 1) {
        // Bullet hit
        const target = movedEnemies.find(e => e.id === bullet.targetId);
        if (target) {
          damageEnemy(target, bullet.damage);
        }
        return null; // Remove bullet
      }

      return bullet;
    }).filter(Boolean) as Bullet[];

    // 5. Remove dead enemies, update score
    const aliveEnemies = movedEnemies.filter(e => !isEnemyDead(e));
    const deadEnemies = movedEnemies.filter(e => isEnemyDead(e));
    const newScore = score + deadEnemies.length * 10;

    // 6. Check enemies that passed base
    const canvasWidth = 1000; // Match canvas size
    const pastBase = aliveEnemies.filter(e => isEnemyPastBase(e, canvasWidth));

    // 7. Enemy spawning logic
    let spawnTimer = get().enemySpawnTimer - deltaTime;
    let currentWave = wave;
    if (spawnTimer <= 0) {
      // Spawn wave of enemies
      const fastCount = 3 + currentWave;
      const tankCount = 1 + Math.floor(currentWave / 2);
      for (let i = 0; i < fastCount; i++) get().spawnEnemy('FAST');
      for (let i = 0; i < tankCount; i++) get().spawnEnemy('TANK');
      spawnTimer = 5; // Spawn every 5 seconds
      currentWave += 1;
    }

    // 8. Game over check? (not needed for MVP)

    set({
      enemies: aliveEnemies,
      bullets: updatedBullets,
      score: newScore,
      enemySpawnTimer: spawnTimer,
      wave: currentWave,
      gameTime: get().gameTime + deltaTime
    });
  }
}));
