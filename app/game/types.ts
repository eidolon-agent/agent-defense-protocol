// Game entities and types

export interface Vector2 {
  x: number;
  y: number;
}

export type Command = 'FAST' | 'STRONG' | 'BASE';

export type AgentType = 'DEFENDER' | 'SNIPER';

export type AgentPersonality = 'AGGRESSIVE' | 'DEFENSIVE';

export type EnemyType = 'FAST' | 'TANK' | 'HEALER' | 'ARMORED';

export interface Enemy {
  id: string;
  position: Vector2;
  speed: number;
  maxHp: number;
  currentHp: number;
  type: EnemyType;
  radius: number;
  color: string;
  armor: number; // damage reduction (ARMORED)
  healAmount: number; // per heal tick (HEALER)
  healRadius: number; // heal radius (HEALER)
  healCooldown: number; // seconds
  healTimer: number;
}

export interface Agent {
  id: string;
  type: AgentType;
  position: Vector2;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  lastShot: number; // timestamp of last shot
  personality: AgentPersonality;
  lastThought: string;
  thoughtTimer: number; // time until thought changes
  radius: number;
  color: string;
  brain: AgentBrain; // Runtime-only, not serialized

  // Upgrades
  level: number;
  upgradePoints: number;
  // Upgradable stats (multipliers from base)
  rangeMult: number;
  damageMult: number;
  fireRateMult: number;

  // Ability
  ability: AgentAbility | null;
  abilityCooldown: number; // seconds
  abilityTimer: number;
}

export interface AgentAbility {
  type: 'AOE' | 'SLOW' | 'BUFF';
  baseDamage: number;
  radius: number;
  duration: number; // seconds for buff/slow
  effectAmount: number; // slow % or buff % (e.g., 0.5 for 50% slow)
}

export interface Bullet {
  id: string;
  from: Vector2;
  to: Vector2;
  targetId: string;
  damage: number;
  speed: number;
  progress: number; // 0-1
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type?: 'hit' | 'heal' | 'slow' | 'aoe' | 'buff' | 'gold';
}

export type GamePhase = 'PLACEMENT' | 'FIGHT' | 'BETWEEN_WAVES';

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

export interface GameState {
  agents: Agent[];
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  damageNumbers: DamageNumber[];
  screenShake: ScreenShake | null;
  currentCommand: Command;
  wave: number;
  score: number;
  gold: number; // currency for upgrades
  elixir: number; // current elixir
  maxElixir: number;
  elixirRegenRate: number; // per second
  enemySpawnTimer: number;
  gameTime: number;
  isRunning: boolean;
  phase: GamePhase;
  placementTime: number; // seconds for placement phase
  upgradeSelection: { agentId: string; type: 'damage' | 'range' | 'fireRate' | 'ability' } | null;
  availableUpgradePoints: number;
  maxAgents: number;
  remainingAgentsToPlace: number;
  lives: number;
  maxLives: number;
}

export interface AgentBrain {
  decide(agent: Agent, enemies: Enemy[], command: Command): Enemy | null;
  generateThought(agent: Agent, enemies: Enemy[], command: Command): string;
}
