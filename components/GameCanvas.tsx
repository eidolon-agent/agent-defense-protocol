'use client';

import React, { useRef, useEffect } from 'react';
import { Agent, Enemy, Bullet, Particle, DamageNumber, Command, ScreenShake } from '../app/game/types';
import { AgentBubble } from './AgentBubble';

interface GameCanvasProps {
  agents: Agent[];
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  damageNumbers: DamageNumber[];
  screenShake: ScreenShake | null;
  width: number;
  height: number;
  phase: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  agents,
  enemies,
  bullets,
  particles,
  damageNumbers,
  screenShake,
  width,
  height,
  phase
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placementGridRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const positions: { x: number; y: number }[] = [];
    const startY = 120;
    const stepY = 80;
    for (let i = 0; i < 5; i++) {
      positions.push({ x: 100, y: startY + i * stepY });
    }
    placementGridRef.current = positions;
  }, []);

  // Draw every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (screenShake && screenShake.elapsed < screenShake.duration) {
      const intensity = screenShake.intensity * (1 - screenShake.elapsed / screenShake.duration);
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Placement grid
    if (phase === 'PLACEMENT') {
      placementGridRef.current.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      });
    }

    // Base
    const baseX = width - 60;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(baseX, 0, 60, height);
    // Base gate design
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(baseX + 5, 10, 50, height - 20);
    // Base text
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BASE', baseX + 30, height / 2);

    // Particles (behind entities)
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Bullets with trails
    bullets.forEach(bullet => {
      const x = bullet.from.x + (bullet.to.x - bullet.from.x) * bullet.progress;
      const y = bullet.from.y + (bullet.to.y - bullet.from.y) * bullet.progress;

      // Trail
      ctx.beginPath();
      ctx.moveTo(bullet.from.x, bullet.from.y);
      ctx.lineTo(x, y);
      const gradient = ctx.createLinearGradient(bullet.from.x, bullet.from.y, x, y);
      gradient.addColorStop(0, 'rgba(251, 191, 36, 0)');
      gradient.addColorStop(1, 'rgba(251, 191, 36, 0.8)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Bullet head
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    });

    // Enemies
    enemies.forEach(enemy => {
      // Glow effect for healers
      if (enemy.type === 'HEALER') {
        ctx.beginPath();
        ctx.arc(enemy.position.x, enemy.position.y, enemy.healRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.1)';
        ctx.fill();
      }

      // Body with outline
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = enemy.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(enemy.position.x - enemy.radius * 0.3, enemy.position.y - enemy.radius * 0.3, enemy.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();

      // Type symbol
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbol = enemy.type.charAt(0);
      ctx.fillText(symbol, enemy.position.x, enemy.position.y);

      // HP bar (thicker)
      const barW = enemy.radius * 2 + 4;
      const barH = 5;
      const hpPct = enemy.currentHp / enemy.maxHp;
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(enemy.position.x - barW / 2, enemy.position.y - enemy.radius - 12, barW, barH);
      ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#dc2626';
      ctx.fillRect(enemy.position.x - barW / 2, enemy.position.y - enemy.radius - 12, barW * hpPct, barH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(enemy.position.x - barW / 2, enemy.position.y - enemy.radius - 12, barW, barH);

      // Armor badge
      if (enemy.armor > 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(`🛡${enemy.armor}`, enemy.position.x, enemy.position.y - enemy.radius - 16);
      }
    });

    // Agents
    agents.forEach(agent => {
      // Glow based on personality
      const glowColor = agent.personality === 'AGGRESSIVE' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)';
      ctx.beginPath();
      ctx.arc(agent.position.x, agent.position.y, agent.radius + 6 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Range fill (very subtle)
      ctx.beginPath();
      ctx.arc(agent.position.x, agent.position.y, getEffectiveRange(agent), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fill();

      // Main body
      ctx.beginPath();
      ctx.arc(agent.position.x, agent.position.y, agent.radius, 0, Math.PI * 2);
      ctx.fillStyle = agent.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Level badge
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Lv${agent.level}`, agent.position.x, agent.position.y);

      // Ability ready indicator
      if (agent.ability) {
        const ready = agent.abilityCooldown - agent.abilityTimer <= 0;
        ctx.beginPath();
        ctx.arc(agent.position.x, agent.position.y, agent.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = ready ? '#10b981' : '#64748b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Damage numbers (above everything)
    damageNumbers.forEach(dn => {
      const alpha = dn.life / dn.maxLife;
      ctx.font = `bold ${dn.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = dn.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(String(dn.value), dn.x, dn.y);
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }, [agents, enemies, bullets, particles, damageNumbers, screenShake, width, height, phase]);

  // Helper - copy from store logic (avoid recalculating in render)
  function getEffectiveRange(agent: Agent): number {
    return Math.floor(agent.range * (agent.rangeMult || 1));
  }

  function agentCanShoot(agent: Agent, currentTime: number): boolean {
    const fireRate = agent.fireRate * (agent.fireRateMult || 1);
    return (currentTime - agent.lastShot) >= (1000 / fireRate);
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border border-gray-700"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Thought bubbles overlay */}
      <div className="absolute top-0 left-0 pointer-events-none" style={{ width, height }}>
        {agents.map(agent => (
          <AgentBubble
            key={agent.id}
            x={agent.position.x}
            y={agent.position.y}
            thought={agent.lastThought}
          />
        ))}
      </div>
      {/* Particles overlay (additive blend) */}
      <div className="absolute top-0 left-0 pointer-events-none mix-blend-screen" style={{ width, height }}>
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life / p.maxLife,
              boxShadow: `0 0 ${p.size}px ${p.color}`
            }}
          />
        ))}
      </div>
    </div>
  );
};