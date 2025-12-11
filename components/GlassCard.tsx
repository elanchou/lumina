import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverEffect = false }) => {
  return (
    <div 
      className={`
        relative
        bg-glass-200 
        backdrop-blur-xl 
        border border-glass-border 
        rounded-xl
        shadow-sm
        ${hoverEffect ? 'transition-transform duration-300 hover:-translate-y-0.5 hover:bg-glass-300 hover:border-glass-highlight' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;