'use client';

import React, { useEffect, useState, useRef } from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { UIControls } from '../components/UIControls';
import { GameLoop } from '../app/game/GameLoop';
import { useGameStore } from '../store/gameStore';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

export default function Home() {
  const {
    agents,
    enemies,
    bullets,
    particles,
    damageNumbers,
    screenShake,
    currentCommand,
    score,
    wave,
    isRunning,
    phase,
    placeAgent,
    remainingAgentsToPlace
  } = useGameStore();

  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [clickMarker, setClickMarker] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(1000, window.innerWidth - 32);
      const aspect = CANVAS_HEIGHT / CANVAS_WIDTH;
      const width = maxWidth;
      const height = Math.floor(width * aspect);
      setCanvasSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'PLACEMENT') return;
    if (remainingAgentsToPlace <= 0) return;

    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (x > 500) return;

    // Debug: show click marker
    setClickMarker({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setClickMarker(null), 500);

    const defenders = agents.filter(a => a.type === 'DEFENDER').length;
    const snipers = agents.filter(a => a.type === 'SNIPER').length;
    const type: 'DEFENDER' | 'SNIPER' = defenders <= snipers ? 'DEFENDER' : 'SNIPER';

    placeAgent(type, x, y);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white">
      <UIControls canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />

      <main className="flex-1 flex items-center justify-center p-4">
        <div
          ref={canvasContainerRef}
          className="relative cursor-crosshair"
          onClick={handleCanvasClick}
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          <GameCanvas
            agents={agents}
            enemies={enemies}
            bullets={bullets}
            particles={particles}
            damageNumbers={damageNumbers}
            screenShake={screenShake}
            width={canvasSize.width}
            height={canvasSize.height}
            phase={phase}
          />
          {phase === 'PLACEMENT' && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 px-3 py-1 rounded text-xs text-white">
              Click on left side to place agents ({remainingAgentsToPlace} remaining)
            </div>
          )}
          {/* Debug click marker */}
          {clickMarker && (
            <div
              className="absolute rounded-full border-2 border-yellow-300"
              style={{
                left: clickMarker.x,
                top: clickMarker.y,
                width: 16,
                height: 16,
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>
      </main>

      <GameLoop />
    </div>
  );
}
