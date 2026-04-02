'use client';

import React from 'react';
import { Command } from '../app/game/types';

interface UIControlsProps {
  currentCommand: Command;
  onCommandChange: (cmd: Command) => void;
  onStart: () => void;
  isRunning: boolean;
  score: number;
  wave: number;
}

export const UIControls: React.FC<UIControlsProps> = ({
  currentCommand,
  onCommandChange,
  onStart,
  isRunning,
  score,
  wave
}) => {
  const buttons: { cmd: Command; label: string; color: string }[] = [
    { cmd: 'FAST', label: 'Focus Fast', color: 'bg-orange-500 hover:bg-orange-600' },
    { cmd: 'STRONG', label: 'Strongest', color: 'bg-red-500 hover:bg-red-600' },
    { cmd: 'BASE', label: 'Protect Base', color: 'bg-blue-500 hover:bg-blue-600' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 text-white min-h-screen">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Agent Defense Protocol</h1>
        <p className="text-sm text-gray-400">AI Agents Tower Defense</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 p-3 rounded text-center">
          <div className="text-xs text-gray-400">Score</div>
          <div className="text-xl font-bold">{score}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded text-center">
          <div className="text-xs text-gray-400">Wave</div>
          <div className="text-xl font-bold">{wave}</div>
        </div>
      </div>

      <div className="space-y-2">
        {buttons.map(({ cmd, label, color }) => (
          <button
            key={cmd}
            onClick={() => onCommandChange(cmd)}
            className={`w-full py-3 px-4 rounded font-semibold transition-colors ${
              currentCommand === cmd
                ? color
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={onStart}
          className={`w-full py-3 px-4 rounded font-semibold ${
            isRunning
              ? 'bg-green-600 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Start Game'}
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-auto">
        <p>Agents act autonomously based on your command.</p>
        <p>Watch their thought bubbles above each agent.</p>
      </div>
    </div>
  );
};
