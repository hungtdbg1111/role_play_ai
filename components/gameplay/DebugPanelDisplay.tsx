
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KnowledgeBase } from '../../types';
import { VIETNAMESE } from '../../constants';
import Button from '../ui/Button';

interface DebugPanelDisplayProps {
  kb: KnowledgeBase;
  sentPromptsLog: string[];
  rawAiResponsesLog: string[];
  latestPromptTokenCount: number | null;
  currentPageDisplay: number;
  totalPages: number;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
}

const MIN_WIDTH = 320; // px
const MIN_HEIGHT = 250; // px
const INITIAL_WIDTH = 420; // px
const INITIAL_HEIGHT = 500; // px
const HANDLE_SIZE = 12; // px

const DebugPanelDisplay: React.FC<DebugPanelDisplayProps> = ({
    kb,
    sentPromptsLog,
    rawAiResponsesLog,
    latestPromptTokenCount,
    currentPageDisplay,
    totalPages,
    isAutoPlaying,
    onToggleAutoPlay
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [position, setPosition] = useState(() => {
    const top = window.innerHeight - INITIAL_HEIGHT - 16;
    const left = window.innerWidth - INITIAL_WIDTH - 16;
    return { top: Math.max(0, top), left: Math.max(0, left) };
  });
  const [dimensions, setDimensions] = useState({ width: INITIAL_WIDTH, height: INITIAL_HEIGHT });
  
  // Stores initial mouse position and panel position/dimensions at the start of a drag/resize
  const interactionStartRef = useRef({ 
    mouseX: 0, 
    mouseY: 0, 
    panelX: 0, 
    panelY: 0, 
    panelW: 0, 
    panelH: 0 
  });

  // Effect to set initial position once, responsive to window size
  useEffect(() => {
    setPosition({
      top: Math.max(0, window.innerHeight - dimensions.height - 16),
      left: Math.max(0, window.innerWidth - dimensions.width - 16),
    });
  }, []); // Runs once on mount


  const handleMouseDownDrag = useCallback((e: React.MouseEvent<HTMLHeadingElement>) => {
    if (e.button !== 0) return; // Only main button
    setIsDragging(true);
    interactionStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX: position.left,
      panelY: position.top,
      panelW: dimensions.width,
      panelH: dimensions.height,
    };
    document.body.style.userSelect = 'none'; // Prevent text selection during drag
    e.preventDefault();
  }, [position, dimensions]);

  const handleMouseDownResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsResizing(true);
    interactionStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX: position.left,
      panelY: position.top,
      panelW: dimensions.width,
      panelH: dimensions.height,
    };
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [position, dimensions]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - interactionStartRef.current.mouseX;
      const deltaY = e.clientY - interactionStartRef.current.mouseY;
      
      let newLeft = interactionStartRef.current.panelX + deltaX;
      let newTop = interactionStartRef.current.panelY + deltaY;

      // Constrain within viewport
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - dimensions.width));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - dimensions.height));
      
      setPosition({ left: newLeft, top: newTop });
    } else if (isResizing) {
      const deltaX = e.clientX - interactionStartRef.current.mouseX;
      const deltaY = e.clientY - interactionStartRef.current.mouseY;
      
      let newWidth = interactionStartRef.current.panelW + deltaX;
      let newHeight = interactionStartRef.current.panelH + deltaY;

      // Enforce minimum dimensions
      newWidth = Math.max(MIN_WIDTH, newWidth);
      newHeight = Math.max(MIN_HEIGHT, newHeight);

      // Constrain within viewport (bottom and right edges)
      newWidth = Math.min(newWidth, window.innerWidth - position.left);
      newHeight = Math.min(newHeight, window.innerHeight - position.top);
      
      setDimensions({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dimensions.width, dimensions.height, position.left, position.top]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    document.body.style.userSelect = ''; // Re-enable text selection
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={panelRef}
      className="fixed bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl overflow-y-auto custom-scrollbar z-50 flex flex-col"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`, 
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px`,
      }}
    >
      <h4 
        className="text-lg font-bold text-yellow-400 mb-3 border-b border-yellow-600 pb-2 p-3 cursor-move flex-shrink-0"
        onMouseDown={handleMouseDownDrag}
      >
        Bảng Điều Khiển Debug
      </h4>

      <div className="p-3 overflow-y-auto flex-grow custom-scrollbar"> {/* Inner scrollable content area */}
        <div className="mb-3 text-xs text-gray-400">
          Player: C{kb.playerStats.level} ({kb.playerStats.realm}), Lượt: {kb.playerStats.turn}<br/>
          Trang: {currentPageDisplay}/{totalPages}, Lượt tóm tắt cuối: {kb.lastSummarizedTurn || 'Chưa có'}<br/>
          Lịch sử trang (bắt đầu từ lượt): {JSON.stringify(kb.currentPageHistory)}<br/>
          Tóm tắt có sẵn cho trang: {kb.pageSummaries ? Object.keys(kb.pageSummaries).join(', ') : 'Không có'}<br/>
          Lịch sử lùi lượt: {kb.turnHistory ? kb.turnHistory.length : 0} mục<br/>
          Token Prompt Gần Nhất: <span className={latestPromptTokenCount === null ? "italic" : "font-semibold text-yellow-300"}>{latestPromptTokenCount === null && sentPromptsLog.length > 0 ? "Đang tính..." : latestPromptTokenCount ?? 'N/A'}</span>
        </div>

        <Button
          variant={isAutoPlaying ? "danger" : "secondary"}
          size="sm"
          onClick={onToggleAutoPlay}
          className="w-full mb-3 border-orange-500 text-orange-300 hover:bg-orange-700 hover:text-white"
        >
          {isAutoPlaying ? VIETNAMESE.stopAutoPlayButton : VIETNAMESE.autoPlayButton}
        </Button>

        <div className="mb-4">
          <h5 className="text-md font-semibold text-sky-300 mb-1">Nhật Ký Prompt Đã Gửi (10 gần nhất)</h5>
          {sentPromptsLog.length === 0 ? (
            <p className="text-xs italic text-gray-500">Chưa có prompt nào được gửi.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar text-xs">
              {sentPromptsLog.map((promptEntry, index) => (
                <details key={`sent-${index}`} className="bg-gray-800 rounded group">
                  <summary className="p-1.5 text-sky-200 cursor-pointer text-[11px] group-open:font-semibold">
                    Prompt #{sentPromptsLog.length - index} (Nhấn để xem)
                  </summary>
                  <pre className="p-1.5 bg-gray-850 text-sky-100 whitespace-pre-wrap break-all text-[10px] leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                    {promptEntry}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>

        <div>
          <h5 className="text-md font-semibold text-lime-300 mb-1">Nhật Ký Phản Hồi Từ AI (50 gần nhất)</h5>
          {rawAiResponsesLog.length === 0 ? (
            <p className="text-xs italic text-gray-500">Chưa có phản hồi nào từ AI.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar text-xs">
              {rawAiResponsesLog.map((responseEntry, index) => (
                 <details key={`raw-${index}`} className="bg-gray-800 rounded group">
                  <summary className="p-1.5 text-lime-200 cursor-pointer text-[11px] group-open:font-semibold">
                    Phản hồi AI #{rawAiResponsesLog.length - index} (Nhấn để xem)
                  </summary>
                  <pre className="p-1.5 bg-gray-850 text-lime-100 whitespace-pre-wrap break-all text-[10px] leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                    {responseEntry}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
      <div 
        className="absolute bg-yellow-600 opacity-50 hover:opacity-100"
        style={{
            width: `${HANDLE_SIZE}px`,
            height: `${HANDLE_SIZE}px`,
            bottom: '0px',
            right: '0px',
            cursor: 'nwse-resize',
        }}
        onMouseDown={handleMouseDownResize}
      />
    </div>
  );
};

export default DebugPanelDisplay;
