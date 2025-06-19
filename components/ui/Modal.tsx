import React, { useEffect, useRef } from 'react';
import Button from './Button';
import { VIETNAMESE } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      modalRef.current?.focus(); // Focus the modal for screen readers and keyboard navigation
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4" // z-index increased
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar relative text-gray-100"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
        tabIndex={-1} // Make it focusable
      >
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
          <h2 id="modal-title" className="text-2xl font-semibold text-indigo-400">{title}</h2>
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
        <div className="text-gray-200">
            {children}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
            <Button onClick={onClose} variant="secondary" type="button">
                {VIETNAMESE.closeButton}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;