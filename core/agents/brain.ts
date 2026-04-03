import { Agent, AgentBrain, Enemy, Command, AgentAbility } from '../../app/game/types';
import { decideTarget, generateThought } from './decision';

export class RuleBasedBrain implements AgentBrain {
  decide(agent: Agent, enemies: Enemy[], command: Command): Enemy | null {
    return decideTarget(agent, enemies, command);
  }

  generateThought(agent: Agent, enemies: Enemy[], command: Command): string {
    return generateThought(agent, enemies, command);
  }
}

// Placeholder for future LLM brain
export class LLMBrain implements AgentBrain {
  decide(agent: Agent, enemies: Enemy[], command: Command): Enemy | null {
    // Future: call LLM API with context
    return new RuleBasedBrain().decide(agent, enemies, command);
  }

  generateThought(agent: Agent, enemies: Enemy[], command: Command): string {
    // Future: generate thought via LLM
    return new RuleBasedBrain().generateThought(agent, enemies, command);
  }
}

// Ability logic
export function canUseAbility(agent: Agent, currentTime: number): boolean {
  if (!agent.ability) return false;
  const timeSinceLast = currentTime - agent.abilityTimer;
  // Base ability cooldown modified by agent fireRate (inverse: faster agents use abilities quicker)
  const effectiveCooldown = agent.abilityCooldown / agent.fireRate;
  return timeSinceLast >= effectiveCooldown * 1000;
}

export function useAbility(agent: Agent, enemies: Enemy[], currentTime: number): { x: number; y: number; radius: number; damage: number; type: string; effect?: { type: 'SLOW' | 'BUFF'; amount: number; duration: number } } | null {
  if (!agent.ability || !canUseAbility(agent, currentTime)) return null;

  // Get current target (if any)
  const target = decideTarget(agent, enemies, 'BASE'); // Use BASE for targeting nearest to base
  if (!target) {
    // If no enemies, can't use ability (maybe future allow self-buff?)
    return null;
  }

  agent.abilityTimer = currentTime;

  return {
    x: target.position.x,
    y: target.position.y,
    radius: agent.ability.radius,
    damage: agent.ability.baseDamage * agent.damageMult,
    type: agent.ability.type,
    ...(agent.ability.type === 'SLOW' ? { effect: { type: 'SLOW', amount: agent.ability.effectAmount, duration: agent.ability.duration } } : {}),
    ...(agent.ability.type === 'BUFF' ? { effect: { type: 'BUFF', amount: agent.ability.effectAmount, duration: agent.ability.duration } } : {})
  };
}
