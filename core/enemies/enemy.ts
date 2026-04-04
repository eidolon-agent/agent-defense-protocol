import { Enemy } from '../../app/game/types';

export interface EnemyConfig {
  type: 'FAST' | 'TANK' | 'HEALER' | 'ARMORED';
  position: { x: number; y: number };
}

const BASE_ENEMY_STATS = {
  FAST: {
    speed: 2.5,
    maxHp: 25,
    radius: 9,
    color: '#f59e0b',
    armor: 0,
    healAmount: 0,
    healRadius: 0,
    healCooldown: 0
  },
  TANK: {
    speed: 0.8,
    maxHp: 150,
    radius: 18,
    color: '#64748b',
    armor: 5,
    healAmount: 0,
    healRadius: 0,
    healCooldown: 0
  },
  HEALER: {
    speed: 1.0,
    maxHp: 40,
    radius: 12,
    color: '#ec4899',
    armor: 0,
    healAmount: 5,
    healRadius: 80,
    healCooldown: 3
  },
  ARMORED: {
    speed: 1.2,
    maxHp: 80,
    radius: 14,
    color: '#8b5cf6',
    armor: 10,
    healAmount: 0,
    healRadius: 0,
    healCooldown: 0
  },
  BOSS: {
    speed: 0.7,
    maxHp: 300,
    radius: 20,
    color: '#dc2626',
    armor: 10,
    healAmount: 0,
    healRadius: 0,
    healCooldown: 0
  }
};

export function createEnemy(id: string, config: EnemyConfig, wave: number): Enemy {
  const base = BASE_ENEMY_STATS[config.type];
  // Scaling per wave
  const scale = 1 + (wave - 1) * 0.1;

  return {
    id,
    position: { ...config.position },
    speed: base.speed * scale,
    maxHp: Math.floor(base.maxHp * scale),
    currentHp: Math.floor(base.maxHp * scale),
    type: config.type,
    radius: base.radius,
    color: base.color,
    armor: base.armor,
    healAmount: base.healAmount,
    healRadius: base.healRadius,
    healCooldown: base.healCooldown,
    healTimer: Math.random() * base.healCooldown // random start offset
  };
}

export function moveEnemy(enemy: Enemy, deltaTime: number): void {
  enemy.position.x += enemy.speed * deltaTime;
}

export function isEnemyDead(enemy: Enemy): boolean {
  return enemy.currentHp <= 0;
}

export function damageEnemy(enemy: Enemy, amount: number): void {
  const actualDamage = Math.max(1, amount - enemy.armor);
  enemy.currentHp = Math.max(0, enemy.currentHp - actualDamage);
}

export function isEnemyPastBase(enemy: Enemy, canvasWidth: number): boolean {
  return enemy.position.x > canvasWidth + enemy.radius;
}

export function updateHealer(enemy: Enemy, allEnemies: Enemy[], deltaTime: number): void {
  if (enemy.type !== 'HEALER' || enemy.healAmount <= 0) return;

  enemy.healTimer -= deltaTime;
  if (enemy.healTimer <= 0) {
    // Find injured allies within heal radius (excluding self)
    const injured = allEnemies.filter(e => {
      if (e.id === enemy.id) return false;
      if (e.currentHp >= e.maxHp) return false;
      const dist = Math.hypot(enemy.position.x - e.position.x, enemy.position.y - e.position.y);
      return dist <= enemy.healRadius;
    });

    if (injured.length > 0) {
      // Heal the most injured
      injured.sort((a, b) => (a.maxHp - a.currentHp) - (b.maxHp - b.currentHp));
      const target = injured[0];
      target.currentHp = Math.min(target.maxHp, target.currentHp + enemy.healAmount);
    }

    enemy.healTimer = enemy.healCooldown;
  }
}
