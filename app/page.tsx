'use client';

import React, { useEffect, useState } from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { UIControls } from '../components/UIControls';
import { GameLoop } from '../app/game/GameLoop';
import { useGameStore } from '../store/gameStore';
import { Command } from '../app/game/types';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

export default function Home() {
  const {
    agents,
    enemies,
    bullets,
    currentCommand,
    score,
    wave,
    isRunning,
    setCommand,
    startGame
  } = useGameStore();

  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  useEffect(() => {
    // Fit canvas to container while maintaining aspect ratio
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
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white">
      <UIControls
        currentCommand={currentCommand}
        onCommandChange={setCommand}
        onStart={startGame}
        isRunning={isRunning}
        score={score}
        wave={wave}
      />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
          <GameCanvas
            agents={agents}
            enemies={enemies}
            bullets={bullets}
            width={canvasSize.width}
            height={canvasSize.height}
          />
        </div>
      </main>

      <GameLoop />
    </div>
  );
}
