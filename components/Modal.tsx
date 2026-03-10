import React, { useEffect } from 'react';
import GlassCard from './GlassCard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full ${sizeClasses[size]} animate-fade-in`}>
        <GlassCard className="panel-surface-strong flex max-h-[85vh] flex-col overflow-hidden shadow-[0_40px_120px_rgba(2,6,23,0.6)]">
          {/* Header */}
          <div className="panel-header border-b border-white/8 px-6 py-5">
            <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
            <button 
              onClick={onClose}
              className="icon-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Modal;
