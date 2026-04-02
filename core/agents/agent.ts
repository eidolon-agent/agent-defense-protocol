import { Agent, Enemy, AgentBrain, Command } from '../../app/game/types';
import { RuleBasedBrain } from './brain';

export interface AgentConfig {
  type: 'DEFENDER' | 'SNIPER';
  position: { x: number; y: number };
  personality: 'AGGRESSIVE' | 'DEFENSIVE';
}

// Factory to create agents with proper stats
export function createAgent(id: string, config: AgentConfig): Agent {
  const baseStats = config.type === 'DEFENDER' ? {
    range: 150,
    damage: 5,
    fireRate: 1,
    radius: 15,
    color: '#3b82f6' // blue
  } : {
    range: 300,
    damage: 20,
    fireRate: 0.5,
    radius: 12,
    color: '#10b981' // green
  };

  return {
    id,
    type: config.type,
    position: { ...config.position },
    range: baseStats.range,
    damage: baseStats.damage,
    fireRate: baseStats.fireRate,
    lastShot: 0,
    personality: config.personality,
    lastThought: "Initializing...",
    thoughtTimer: 0,
    radius: baseStats.radius,
    color: baseStats.color,
    brain: new RuleBasedBrain() as AgentBrain
  };
}

export function updateAgentThought(agent: Agent, enemies: Enemy[], command: Command, deltaTime: number): void {
  agent.thoughtTimer -= deltaTime;
  if (agent.thoughtTimer <= 0) {
    agent.lastThought = (agent.brain as AgentBrain).generateThought(agent, enemies, command);
    agent.thoughtTimer = 2 + Math.random() * 3; // Change thought every 2-5 seconds
  }
}

export function agentCanShoot(agent: Agent, currentTime: number): boolean {
  const timeSinceLastShot = currentTime - agent.lastShot;
  return timeSinceLastShot >= (1000 / agent.fireRate);
}

export function shoot(agent: Agent, target: Enemy, currentTime: number): void {
  agent.lastShot = currentTime;
  // Damage is applied by the game loop when bullet reaches target
}
