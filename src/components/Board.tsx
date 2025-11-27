import React from 'react';

interface BoardProps {
  children: React.ReactNode;
  onClick: () => void;
}

export const Board: React.FC<BoardProps> = ({ children, onClick }) => {
  return (
    <div 
      className="flex-1 relative overflow-hidden bg-kitchen-bg"
      onClick={onClick}
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
      {children}
    </div>
  );
};
