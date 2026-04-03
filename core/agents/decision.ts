import { Agent, Enemy, Command } from '../../app/game/types';

export function decideTarget(agent: Agent, enemies: Enemy[], command: Command): Enemy | null {
  if (enemies.length === 0) return null;

  // Filter enemies that are actually alive
  const aliveEnemies = enemies.filter(e => e.currentHp > 0);
  if (aliveEnemies.length === 0) return null;

  let sorted = [...aliveEnemies];

  switch (command) {
    case 'FAST':
      sorted.sort((a, b) => b.speed - a.speed);
      break;
    case 'STRONG':
      // For STRONG, factor in effective HP (hp - armor) plus raw HP
      sorted.sort((a, b) => {
        const effA = a.currentHp - a.armor;
        const effB = b.currentHp - b.armor;
        return (effB + b.currentHp * 0.5) - (effA + a.currentHp * 0.5);
      });
      break;
    case 'BASE':
      // Base is at x = 800 (right edge). Prioritize closest to base
      sorted.sort((a, b) => b.position.x - a.position.x);
      break;
  }

  // Apply personality modifier (10% chance to pick differently)
  if (Math.random() < 0.1) {
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
  const inRange = aliveEnemies.filter(e => {
    const d = Math.hypot(agent.position.x - e.position.x, agent.position.y - e.position.y);
    return d <= agent.range;
  });

  if (inRange.length === 0) return null;

  inRange.sort((a, b) => {
    switch (command) {
      case 'FAST': return b.speed - a.speed;
      case 'STRONG': return (b.currentHp - b.armor) - (a.currentHp - a.armor);
      case 'BASE': return b.position.x - a.position.x;
      default: return 0;
    }
  });

  return inRange[0];
}

export function generateThought(agent: Agent, enemies: Enemy[], command: Command): string {
  const aliveEnemies = enemies.filter(e => e.currentHp > 0);
  const inRange = aliveEnemies.filter(e => {
    const d = Math.hypot(agent.position.x - e.position.x, agent.position.y - e.position.y);
    return d <= agent.range;
  });

  if (aliveEnemies.length === 0) {
    return "Monitoring sector";
  }

  if (inRange.length === 0) {
    return "No targets in range";
  }

  const thoughts: string[] = [];

  switch (command) {
    case 'FAST':
      thoughts.push("Focusing speedsters", "Chasing fast ones", "Mobility priority");
      break;
    case 'STRONG':
      thoughts.push("Targeting heavy threats", "Breaking armor", "Strongest first");
      break;
    case 'BASE':
      thoughts.push("Defending base", "Protecting core", "Blocking advance");
      break;
  }

  if (agent.personality === 'AGGRESSIVE') {
    thoughts.push("Pushing forward", "Aggressive stance", "Press the attack");
  } else {
    thoughts.push("Holding position", "Defensive posture", "Maintain guard");
  }

  if (aliveEnemies.length > 8) {
    thoughts.push("Overwhelmed!", "Need support", "Too many enemies");
  }

  return thoughts[Math.floor(Math.random() * thoughts.length)];
}
