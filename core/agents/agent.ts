import { Agent, Enemy, AgentBrain, Command, AgentAbility, AgentType } from '../../app/game/types';
import { RuleBasedBrain } from './brain';
import { decideTarget } from './decision';

export interface AgentConfig {
  type: 'DEFENDER' | 'SNIPER';
  position: { x: number; y: number };
  personality: 'AGGRESSIVE' | 'DEFENSIVE';
}

// Base stats per type
const BASE_STATS = {
  DEFENDER: {
    range: 150,
    damage: 5,
    fireRate: 1,
    radius: 15,
    color: '#3b82f6'
  },
  SNIPER: {
    range: 300,
    damage: 20,
    fireRate: 0.5,
    radius: 12,
    color: '#10b981'
  }
};

// Ability definitions
const ABILITIES: Record<AgentType, AgentAbility | null> = {
  DEFENDER: {
    type: 'AOE',
    baseDamage: 10,
    radius: 80,
    duration: 0,
    effectAmount: 0
  },
  SNIPER: {
    type: 'SLOW',
    baseDamage: 0, // no damage, just slow
    radius: 100,
    duration: 3,
    effectAmount: 0.5 // 50% slow
  }
};

export function createAgent(id: string, config: AgentConfig): Agent {
  const base = BASE_STATS[config.type];

  return {
    id,
    type: config.type,
    position: { ...config.position },
    range: base.range,
    damage: base.damage,
    fireRate: base.fireRate,
    lastShot: 0,
    personality: config.personality,
    lastThought: "Initializing...",
    thoughtTimer: 0,
    radius: base.radius,
    color: base.color,
    brain: new RuleBasedBrain(),
    level: 1,
    upgradePoints: 0,
    rangeMult: 1,
    damageMult: 1,
    fireRateMult: 1,
    ability: ABILITIES[config.type],
    abilityCooldown: 5, // seconds
    abilityTimer: 0
  };
}

export function upgradeAgent(agent: Agent, type: 'damage' | 'range' | 'fireRate' | 'ability'): boolean {
  if (agent.upgradePoints <= 0) return false;

  switch (type) {
    case 'damage':
      agent.damageMult += 0.2;
      break;
    case 'range':
      agent.rangeMult += 0.15;
      break;
    case 'fireRate':
      agent.fireRateMult += 0.15;
      break;
    case 'ability':
      if (!agent.ability) return false;
      agent.abilityCooldown *= 0.8; // 20% cooldown reduction
      agent.ability.baseDamage *= 1.3;
      if (agent.ability.type === 'SLOW') agent.ability.effectAmount = Math.min(0.9, agent.ability.effectAmount + 0.1);
      break;
  }

  agent.upgradePoints--;
  return true;
}

export function grantUpgradePoint(agent: Agent): void {
  agent.upgradePoints++;
}

export function getEffectiveRange(agent: Agent): number {
  return Math.floor(agent.range * agent.rangeMult);
}

export function getEffectiveDamage(agent: Agent): number {
  return Math.floor(agent.damage * agent.damageMult);
}

export function getEffectiveFireRate(agent: Agent): number {
  return agent.fireRate * agent.fireRateMult;
}

export function updateAgentThought(agent: Agent, enemies: Enemy[], command: Command, deltaTime: number): void {
  agent.thoughtTimer -= deltaTime;
  if (agent.thoughtTimer <= 0) {
    agent.lastThought = (agent.brain as AgentBrain).generateThought(agent, enemies, command);
    agent.thoughtTimer = 2 + Math.random() * 3;
  }
}

export function agentCanShoot(agent: Agent, currentTime: number): boolean {
  const fireRate = getEffectiveFireRate(agent);
  const timeSinceLastShot = currentTime - agent.lastShot;
  return timeSinceLastShot >= (1000 / fireRate);
}

export function shoot(agent: Agent, target: Enemy, currentTime: number): void {
  agent.lastShot = currentTime;
}
