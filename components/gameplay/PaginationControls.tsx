import React, { useState, useEffect } from 'react';
import Button from '../ui/Button'; // Assuming Button is in a shared ui folder
import { VIETNAMESE } from '../../constants';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  isSummarizing: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, onPrev, onNext, onJump, isSummarizing }) => {
  const [jumpToPageInput, setJumpToPageInput] = useState<string>(currentPage.toString());

  useEffect(() => {
    setJumpToPageInput(currentPage.toString());
  }, [currentPage]);

  const handleJumpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJumpToPageInput(e.target.value);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPageInput, 10);
    if (!isNaN(pageNum)) {
      onJump(pageNum);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-700 border-t border-gray-600 rounded-b-lg mt-auto flex-shrink-0">
      <Button onClick={onPrev} disabled={currentPage <= 1 || isSummarizing} size="sm" variant="ghost" className="text-xs px-2 py-1">
        {VIETNAMESE.previousPage}
      </Button>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <form onSubmit={handleJumpSubmit} className="flex items-center">
          <input
            type="number"
            value={jumpToPageInput}
            onChange={handleJumpInputChange}
            min="1"
            max={totalPages}
            className="w-12 sm:w-16 p-1 text-xs text-center bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
            aria-label="Nhập số trang"
            disabled={isSummarizing}
          />
          <Button type="submit" size="sm" variant="ghost" className="ml-1 px-1.5 sm:px-2 py-1 text-xs" disabled={isSummarizing}>
            {VIETNAMESE.goToPage}
          </Button>
        </form>
        <span className="text-xs text-gray-300 mx-1">
          {VIETNAMESE.pageIndicator(currentPage, totalPages)}
        </span>
      </div>
      <Button onClick={onNext} disabled={currentPage >= totalPages || isSummarizing} size="sm" variant="ghost" className="text-xs px-2 py-1">
        {VIETNAMESE.nextPage}
      </Button>
    </div>
  );
};

export default PaginationControls;