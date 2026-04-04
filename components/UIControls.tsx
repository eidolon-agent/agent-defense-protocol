'use client';

import React from 'react';
import { Command, GamePhase } from '../app/game/types';
import { useGameStore } from '../store/gameStore';

interface UIControlsProps {
  canvasWidth: number;
  canvasHeight: number;
}

export const UIControls: React.FC<UIControlsProps> = ({ canvasWidth, canvasHeight }) => {
  const {
    currentCommand,
    setCommand,
    isRunning,
    phase,
    wave,
    score,
    gold,
    elixir,
    maxElixir,
    placementTime,
    agents,
    upgradeSelection,
    availableUpgradePoints,
    remainingAgentsToPlace,
    startGame,
    startNextWave,
    placeAgent,
    selectAgentForUpgrade,
    upgradeSelectedAgent,
    createParticle,
    sellAgent
  } = useGameStore();

  const commands: { cmd: Command; label: string; color: string }[] = [
    { cmd: 'FAST', label: 'Focus Fast', color: 'bg-orange-600 hover:bg-orange-700' },
    { cmd: 'STRONG', label: 'Strongest', color: 'bg-red-600 hover:bg-red-700' },
    { cmd: 'BASE', label: 'Protect Base', color: 'bg-blue-600 hover:bg-blue-700' },
  ];

  const renderUpgradePanel = () => {
    if (upgradeSelection) {
      const agent = agents.find(a => a.id === upgradeSelection.agentId);
      if (!agent) return null;
      return (
        <div className="bg-gray-800 p-4 rounded space-y-3">
          <div className="text-sm font-semibold text-white mb-2">
            Upgrade {agent.type} (Level {agent.level}) • Points: {agent.upgradePoints}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
              disabled={agent.upgradePoints <= 0}
              onClick={() => upgradeSelectedAgent('damage')}
            >
              Damage (+20%)
            </button>
            <button
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
              disabled={agent.upgradePoints <= 0}
              onClick={() => upgradeSelectedAgent('range')}
            >
              Range (+15%)
            </button>
            <button
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm disabled:opacity-50"
              disabled={agent.upgradePoints <= 0}
              onClick={() => upgradeSelectedAgent('fireRate')}
            >
              Fire Rate (+15%)
            </button>
            <button
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:opacity-50"
              disabled={agent.upgradePoints <= 0 || !agent.ability}
              onClick={() => upgradeSelectedAgent('ability')}
            >
              Ability (20% CDR)
            </button>
          </div>
          <button
            className="mt-2 w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            onClick={() => selectAgentForUpgrade('')}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 p-4 rounded">
        <div className="text-sm font-semibold text-white mb-2">Agents (click to upgrade)</div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`p-2 rounded flex justify-between items-center ${
                agent.upgradePoints > 0 ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800'
              }`}
            >
              <div
                className="text-white text-sm cursor-pointer flex-1"
                onClick={() => agent.upgradePoints > 0 && selectAgentForUpgrade(agent.id)}
              >
                {agent.type} (Lvl {agent.level}) • Pts: {agent.upgradePoints}
                {agent.upgradePoints > 0 && (
                  <span className="text-yellow-400 font-bold ml-2">UPGRADE</span>
                )}
              </div>
              <button
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  sellAgent(agent.id);
                }}
                title="Sell agent for 70% refund"
              >
                Sell
              </button>
            </div>
          ))}
        </div>
        {availableUpgradePoints > 0 && (
          <div className="mt-2 text-green-400 text-sm">
            Total Points: {availableUpgradePoints} (distributed per agent above)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-950 text-white min-h-screen">
      <div className="text-center mb-2">
        <h1 className="text-xl font-bold">Agent Defense Protocol</h1>
        <p className="text-xs text-gray-400">Autonomous AI Agents</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-400">Score</div>
          <div className="text-lg font-bold">{score}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-400">Wave</div>
          <div className="text-lg font-bold">{wave}</div>
        </div>
      </div>
      <div className="bg-gray-800 p-2 rounded mt-2 text-center">
        <div className="text-xs text-gray-400">Gold</div>
        <div className="text-lg font-bold text-yellow-400">{gold}</div>
      </div>
      <div className="bg-gray-800 p-2 rounded mt-2">
        <div className="text-xs text-gray-400 mb-1">Elixir</div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(elixir / (maxElixir || 10)) * 100}%` }} />
        </div>
        <div className="text-right text-xs text-blue-300">{elixir.toFixed(1)} / {maxElixir}</div>
      </div>

      {phase === 'PLACEMENT' && (
        <div className="bg-blue-900 p-3 rounded text-center">
          <div className="text-sm font-bold">Placement Phase</div>
          <div className="text-2xl font-mono text-yellow-300">{Math.ceil(placementTime)}s</div>
          <div className="text-xs text-gray-300 mt-1">
            Click canvas to place agents ({remainingAgentsToPlace} remaining)
          </div>
        </div>
      )}

      {phase === 'BETWEEN_WAVES' && (
        <div className="bg-green-900 p-3 rounded text-center">
          <div className="text-sm font-bold">Wave Complete!</div>
          <div className="text-sm text-gray-300">Upgrade points awarded</div>
          <button
            className="mt-2 w-full py-2 px-4 bg-green-600 hover:bg-green-700 rounded font-semibold text-sm"
            onClick={startNextWave}
          >
            Start Wave {wave}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {commands.map(({ cmd, label, color }) => (
          <button
            key={cmd}
            onClick={() => setCommand(cmd)}
            className={`py-2 px-4 rounded font-semibold text-sm transition-colors ${
              currentCommand === cmd ? color : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {renderUpgradePanel()}

      {/* Wallet Connect / Save Load */}
      <div className="bg-gray-800 p-3 rounded mt-2">
        {!connectedWallet ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Paste wallet address (0x...)"
              className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded"
              value={walletInput}
              onChange={e => setWalletInput(e.target.value)}
            />
            <button
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
              onClick={() => {
                if (walletInput.trim()) {
                  setWalletAddress(walletInput.trim());
                  setWalletStatus('connected');
                }
              }}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-300 truncate">
              Wallet: {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                onClick={() => {
                  saveGame(connectedWallet!);
                  alert('Game saved!');
                }}
              >
                Save
              </button>
              <button
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                onClick={() => {
                  if (loadGame(connectedWallet!)) {
                    alert('Game loaded!');
                  } else {
                    alert('No save data found for this wallet.');
                  }
                }}
              >
                Load
              </button>
              <button
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                onClick={() => {
                  setWalletAddress(null);
                  setWalletStatus('idle');
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-700">
        {phase === 'PLACEMENT' ? (
          <button
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 rounded font-semibold"
            onClick={() => startNextWave()}
            disabled={remainingAgentsToPlace > 0}
          >
            {remainingAgentsToPlace > 0 ? `Place ${remainingAgentsToPlace} more` : 'Start Wave 1'}
          </button>
        ) : (
          <button
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded font-semibold"
            onClick={() => {}}
            disabled
          >
            {phase === 'FIGHT' ? `Wave ${wave} In Progress` : 'Between Waves'}
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-auto space-y-1">
        <p>DEFENDER: Tank, short range, AOE ability</p>
        <p>SNIPER: Long range, high damage, SLOW ability</p>
        <p>Place agents on the left side, use commands to control targeting</p>
      </div>
    </div>
  );
};
