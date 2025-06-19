import React, { useEffect, useRef } from 'react';
import Button from './Button';
import { VIETNAMESE } from '../../constants';

interface OffCanvasPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
}

const OffCanvasPanel: React.FC<OffCanvasPanelProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  position = 'right' 
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      panelRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const panelPositionClass = position === 'left' ? 'left-0' : 'right-0';
  const transformClass = isOpen 
    ? 'translate-x-0' 
    : (position === 'left' ? '-translate-x-full' : 'translate-x-full');

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 ${panelPositionClass} h-full w-full max-w-md bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col text-gray-100`}
        style={{ transform: transformClass }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offcanvas-title"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800"> {/* Removed sticky and z-10 as it's part of flex flow now */}
          <h2 id="offcanvas-title" className="text-xl font-semibold text-indigo-400">{title}</h2>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="sm" 
            aria-label={VIETNAMESE.closeButton}
            className="text-gray-400 hover:text-white"
            type="button" // Explicitly set type
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
};

export default OffCanvasPanel;