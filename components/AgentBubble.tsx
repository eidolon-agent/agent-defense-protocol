'use client';

import React from 'react';

interface AgentBubbleProps {
  x: number;
  y: number;
  thought: string;
}

export const AgentBubble: React.FC<AgentBubbleProps> = ({ x, y, thought }) => {
  // Position above agent, offset by canvas position
  return (
    <div
      className="absolute px-2 py-1 text-xs bg-gray-800 text-white rounded-full transform -translate-x-1/2 -translate-y-full whitespace-nowrap z-10"
      style={{ left: x, top: y - 20, fontSize: '10px' }}
    >
      {thought}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"
      />
    </div>
  );
};
