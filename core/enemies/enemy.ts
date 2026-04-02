import { Enemy } from '../../app/game/types';

export interface EnemyConfig {
  type: 'FAST' | 'TANK';
  position: { x: number; y: number };
}

export function createEnemy(id: string, config: EnemyConfig, wave: number): Enemy {
  const baseStats = config.type === 'FAST' ? {
    speed: 2 + (wave * 0.1),
    maxHp: 20,
    radius: 10,
    color: '#f59e0b' // amber
  } : {
    speed: 0.8 + (wave * 0.05),
    maxHp: 100,
    radius: 16,
    color: '#64748b' // slate
  };

  return {
    id,
    position: { ...config.position },
    speed: baseStats.speed,
    maxHp: baseStats.maxHp,
    currentHp: baseStats.maxHp,
    type: config.type,
    radius: baseStats.radius,
    color: baseStats.color
  };
}

export function moveEnemy(enemy: Enemy, deltaTime: number): void {
  // Move right towards base (x increases)
  enemy.position.x += enemy.speed * deltaTime;
}

export function isEnemyDead(enemy: Enemy): boolean {
  return enemy.currentHp <= 0;
}

export function damageEnemy(enemy: Enemy, amount: number): void {
  enemy.currentHp = Math.max(0, enemy.currentHp - amount);
}

export function isEnemyPastBase(enemy: Enemy, canvasWidth: number): boolean {
  return enemy.position.x > canvasWidth + enemy.radius;
}
