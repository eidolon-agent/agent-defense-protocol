// Game entities and types

export interface Vector2 {
  x: number;
  y: number;
}

export type Command = 'FAST' | 'STRONG' | 'BASE';

export type AgentType = 'DEFENDER' | 'SNIPER';

export type AgentPersonality = 'AGGRESSIVE' | 'DEFENSIVE';

export interface Enemy {
  id: string;
  position: Vector2;
  speed: number;
  maxHp: number;
  currentHp: number;
  type: 'FAST' | 'TANK';
  radius: number;
  color: string;
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

export interface GameState {
  agents: Agent[];
  enemies: Enemy[];
  bullets: Bullet[];
  currentCommand: Command;
  wave: number;
  score: number;
  enemySpawnTimer: number;
  gameTime: number;
  isRunning: boolean;
}

export interface AgentBrain {
  decide(agent: Agent, enemies: Enemy[], command: Command): Enemy | null;
  generateThought(agent: Agent, enemies: Enemy[], command: Command): string;
}
