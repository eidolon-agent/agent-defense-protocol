'use client';

import React, { useRef, useEffect } from 'react';
import { Agent, Enemy, Bullet } from '../app/game/types';
import { AgentBubble } from './AgentBubble';

interface GameCanvasProps {
  agents: Agent[];
  enemies: Enemy[];
  bullets: Bullet[];
  width: number;
  height: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  agents,
  enemies,
  bullets,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
  }, [width, height]);

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Draw lane markers
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let y = 0; y < height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw base (right edge)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(width - 50, 0, 50, height);
    ctx.fillStyle = '#475569';
    ctx.font = '12px monospace';
    ctx.fillText('BASE', width - 40, height / 2);

    // Draw bullets
    bullets.forEach(bullet => {
      const x = bullet.from.x + (bullet.to.x - bullet.from.x) * bullet.progress;
      const y = bullet.from.y + (bullet.to.y - bullet.from.y) * bullet.progress;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308'; // yellow
      ctx.fill();
    });

    // Draw enemies
    enemies.forEach(enemy => {
      // Body
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = enemy.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // HP bar
      const barWidth = enemy.radius * 2;
      const barHeight = 4;
      const hpPct = enemy.currentHp / enemy.maxHp;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(
        enemy.position.x - barWidth / 2,
        enemy.position.y - enemy.radius - 8,
        barWidth,
        barHeight
      );
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(
        enemy.position.x - barWidth / 2,
        enemy.position.y - enemy.radius - 8,
        barWidth * hpPct,
        barHeight
      );
    });

    // Draw agents
    agents.forEach(agent => {
      // Turret base
      ctx.beginPath();
      ctx.arc(agent.position.x, agent.position.y, agent.radius, 0, Math.PI * 2);
      ctx.fillStyle = agent.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Range indicator (faint circle)
      ctx.beginPath();
      ctx.arc(agent.position.x, agent.position.y, agent.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Type label
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(agent.type.slice(0, 3), agent.position.x, agent.position.y + 3);
    });

  }, [agents, enemies, bullets, width, height]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border border-gray-700"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Agent thought bubbles - overlay */}
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
    </div>
  );
};
