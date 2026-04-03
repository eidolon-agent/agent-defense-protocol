'use client';

import React, { useEffect, useState } from 'react';
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
    phase
  } = useGameStore();

  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white">
      <UIControls canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
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
              Click on left side to place agents (max 5)
            </div>
          )}
        </div>
      </main>

      <GameLoop />
    </div>
  );
}
