'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

export const GameLoop: React.FC = () => {
  const update = useGameStore(state => state.update);
  const isRunning = useGameStore(state => state.isRunning);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) {
      lastTimeRef.current = 0;
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000; // Convert to seconds
      lastTime = time;

      update(deltaTime);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, update]);

  return null; // This component doesn't render anything
};
