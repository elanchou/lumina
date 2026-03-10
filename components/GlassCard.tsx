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
        panel-surface
        relative
        rounded-[28px]
        ${hoverEffect ? 'transition-transform duration-300 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:shadow-[0_30px_80px_rgba(2,6,23,0.35)]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
