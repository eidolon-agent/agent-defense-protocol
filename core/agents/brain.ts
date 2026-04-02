import { Agent, AgentBrain, Enemy, Command } from '../../app/game/types';

// Rule-based brain implementation for MVP
export class RuleBasedBrain implements AgentBrain {
  decide(agent: Agent, enemies: Enemy[], command: Command): Enemy | null {
    if (enemies.length === 0) return null;

    // Sort enemies based on command
    let sorted = [...enemies];

    switch (command) {
      case 'FAST':
        sorted.sort((a, b) => b.speed - a.speed);
        break;
      case 'STRONG':
        sorted.sort((a, b) => b.currentHp - a.currentHp);
        break;
      case 'BASE':
        // Base is at x = 800 (right edge). Prioritize closest to base
        sorted.sort((a, b) => b.position.x - a.position.x);
        break;
    }

    // Apply personality modifier (10% chance to pick differently)
    if (Math.random() < 0.1) {
      // Random shuffle top 3 candidates for imperfect decisions
      const top3 = sorted.slice(0, 3);
      const rest = sorted.slice(3);
      for (let i = top3.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [top3[i], top3[j]] = [top3[j], top3[i]];
      }
      sorted = [...top3, ...rest];
    }

    // Check if top enemy is in range
    const topEnemy = sorted[0];
    const distance = Math.hypot(
      agent.position.x - topEnemy.position.x,
      agent.position.y - topEnemy.position.y
    );

    if (distance <= agent.range) {
      return topEnemy;
    }

    // Find nearest in-range enemy
    const inRange = enemies.filter(e => {
      const d = Math.hypot(agent.position.x - e.position.x, agent.position.y - e.position.y);
      return d <= agent.range;
    });

    if (inRange.length === 0) return null;

    // Re-sort in-range by command priority
    inRange.sort((a, b) => {
      switch (command) {
        case 'FAST': return b.speed - a.speed;
        case 'STRONG': return b.currentHp - a.currentHp;
        case 'BASE': return b.position.x - a.position.x;
        default: return 0;
      }
    });

    return inRange[0];
  }

  generateThought(agent: Agent, enemies: Enemy[], command: Command): string {
    const inRange = enemies.filter(e => {
      const d = Math.hypot(agent.position.x - e.position.x, agent.position.y - e.position.y);
      return d <= agent.range;
    });

    if (enemies.length === 0) {
      return "Monitoring sector";
    }

    if (inRange.length === 0) {
      return "No targets in range";
    }

    const thoughts: string[] = [];

    // Command-based thoughts
    switch (command) {
      case 'FAST':
        thoughts.push("Focusing on fast targets", "Chasing speedsters", "Prioritizing mobility");
        break;
      case 'STRONG':
        thoughts.push("Targeting heavy armor", "Attacking strongest", "Breaking shields");
        break;
      case 'BASE':
        thoughts.push("Defending base", "Protecting core", "Blocking advance");
        break;
    }

    // Personality-based additions
    if (agent.personality === 'AGGRESSIVE') {
      thoughts.push("Pushing forward", "Aggressive stance");
    } else {
      thoughts.push("Holding position", "Defensive posture");
    }

    // Random situational thoughts
    if (enemies.length > 5) {
      thoughts.push("Too many enemies!", "Overwhelmed", "Need support");
    }

    // Return random thought from pool
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }
}

// Placeholder for future LLM brain
export class LLMBrain implements AgentBrain {
  decide(agent: Agent, enemies: Enemy[], command: Command): Enemy | null {
    // Future: call LLM API with context
    // For now, fall back to rule-based
    return new RuleBasedBrain().decide(agent, enemies, command);
  }

  generateThought(agent: Agent, enemies: Enemy[], command: Command): string {
    // Future: generate thought via LLM
    return new RuleBasedBrain().generateThought(agent, enemies, command);
  }
}
