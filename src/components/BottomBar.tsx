import React from 'react';

interface BottomBarProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ prompt, setPrompt }) => {
  return (
    <div className="h-16 bg-kitchen-panel border-t border-white/10 flex items-center px-6 gap-4 z-50">
      <span className="text-kitchen-accent font-bold uppercase text-sm tracking-wider whitespace-nowrap">
        Linia przepisu / Prompt dnia:
      </span>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 bg-kitchen-bg border border-white/10 rounded px-4 py-2 text-white focus:border-kitchen-accent focus:outline-none transition-colors font-mono"
        placeholder="Wpisz prompt lub cel..."
      />
    </div>
  );
};
