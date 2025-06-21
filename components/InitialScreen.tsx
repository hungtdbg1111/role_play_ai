
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, FirebaseUser } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal'; 
import Spinner from './ui/Spinner'; 
import { VIETNAMESE, GAME_TITLE, APP_VERSION } from '../constants';

interface InitialScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  firebaseUser: FirebaseUser | null;
  onSignOut: () => void;
  isFirebaseLoading: boolean;
}

// Function to parse simple Markdown to HTML
function markdownToHtml(markdownText: string): string {
  if (!markdownText) return '';

  let text = markdownText;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Handle block elements first
  // Headers (###)
  text = text.replace(/^### (.*)$/gm, '<h3 class="text-xl font-semibold text-sky-400 mt-5 mb-2">$1</h3>');

  // Horizontal Rule (---)
  text = text.replace(/^---$/gm, '<hr class="my-5 border-gray-700" />');

  // Pre-process bold within lines before list/paragraph logic to simplify
  // This helps if bold is inside list items or paragraphs.
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-yellow-400">$1</strong>');
  
  // Lists (* item)
  let lines = text.split('\n');
  let newLines: string[] = [];
  let inListScope = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // List items can have leading spaces, e.g. "*   item" or "  * item"
    const listItemMatch = line.match(/^(\s*)\* (.*)/);
    if (listItemMatch) {
      if (!inListScope) {
        newLines.push('<ul class="list-disc list-outside pl-6 my-3 space-y-1 text-gray-300">');
        inListScope = true;
      }
      // listItemMatch[2] contains the content after "* "
      newLines.push(`<li>${listItemMatch[2]}</li>`);
    } else {
      if (inListScope) {
        newLines.push('</ul>');
        inListScope = false;
      }
      newLines.push(line);
    }
  }
  if (inListScope) { // Close list if it's the last element
    newLines.push('</ul>');
  }
  text = newLines.join('\n');

  // Paragraphs: Wrap lines that are not part of other structures in <p> tags.
  lines = text.split('\n');
  newLines = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      // Join lines in buffer with <br> for intra-paragraph newlines
      newLines.push(`<p class="my-2 text-gray-200 leading-relaxed">${paragraphBuffer.join('<br />')}</p>`);
      paragraphBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Check if the line is already processed into an HTML block tag or is part of a list structure
    if (trimmedLine.startsWith('<h3') || trimmedLine.startsWith('<hr') || 
        trimmedLine.startsWith('<ul') || trimmedLine.startsWith('</ul') || 
        trimmedLine.startsWith('<li')) {
      flushParagraph(); // Finalize any pending paragraph before adding this HTML block
      newLines.push(line);
    } else if (trimmedLine === '') {
      flushParagraph(); // Empty line signifies paragraph break
      // Optionally, add a <br> or just let CSS margins handle spacing for empty lines if desired
    } else {
      paragraphBuffer.push(line); // Add line to current paragraph buffer
    }
  }
  flushParagraph(); // Finalize any remaining paragraph at the end of the text

  // Join all processed lines and clean up any excessive newlines from the process
  return newLines.join('\n').replace(/(\n\s*){2,}/g, '\n').trim();
}


const InitialScreen: React.FC<InitialScreenProps> = ({ setCurrentScreen, firebaseUser, onSignOut, isFirebaseLoading }) => {
  const [showUpdateNotesModal, setShowUpdateNotesModal] = useState(false);
  const [updateNotes, setUpdateNotes] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [errorNotes, setErrorNotes] = useState<string | null>(null);

  const fetchUpdateNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    setErrorNotes(null);
    try {
      const response = await fetch('/updatedcontent.txt');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      setUpdateNotes(text);
    } catch (error) {
      console.error("Failed to fetch update notes:", error);
      setErrorNotes(VIETNAMESE.errorLoadingUpdateNotes || "Không thể tải thông tin cập nhật.");
      setUpdateNotes(null); // Ensure notes are cleared on error
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  const handleShowUpdateNotes = () => {
    if (!updateNotes && !errorNotes && !isLoadingNotes) {
      fetchUpdateNotes();
    }
    setShowUpdateNotesModal(true);
  };
  
  const handleLoadGameClick = () => {
    setCurrentScreen(GameScreen.LoadGameSelection);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-6">
        {GAME_TITLE}
      </h1>
      <p className="text-xl text-gray-300 mb-12 max-w-2xl">{VIETNAMESE.welcomeMessage(GAME_TITLE)}</p>
      
      <div className="space-y-4 w-full max-w-sm">
        <Button 
          variant="primary" 
          size="lg" 
          className="w-full"
          onClick={() => setCurrentScreen(GameScreen.GameSetup)}
        >
          {VIETNAMESE.newGame}
        </Button>
        <Button 
          variant="secondary" 
          size="lg" 
          className="w-full" 
          onClick={handleLoadGameClick}
          disabled={isFirebaseLoading && !firebaseUser} 
          title={!firebaseUser && !isFirebaseLoading ? VIETNAMESE.signInRequiredForLoad : undefined}
        >
          {isFirebaseLoading && !firebaseUser ? VIETNAMESE.signingInAnonymously : VIETNAMESE.loadGame}
        </Button>
         <Button 
            variant="ghost" 
            size="md" 
            className="w-full" 
            onClick={() => setCurrentScreen(GameScreen.ImportExport)}
          >
          {VIETNAMESE.importExportData}
        </Button>
        <Button 
          variant="ghost" 
          size="md" 
          className="w-full"
          onClick={handleShowUpdateNotes}
        >
          {VIETNAMESE.updateNotesButton || "Thông Tin Cập Nhật"}
        </Button>
         <Button 
            variant="ghost" 
            size="md" 
            className="w-full" 
            onClick={() => setCurrentScreen(GameScreen.ApiSettings)}
          >
          {VIETNAMESE.apiSettings}
        </Button>
        <Button 
            variant="ghost" 
            size="md" 
            className="w-full" 
            onClick={() => setCurrentScreen(GameScreen.StorageSettings)}
          >
          {VIETNAMESE.storageSettings} 
        </Button>
        {firebaseUser && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 border-red-500 text-red-400 hover:bg-red-700 hover:text-white"
            onClick={onSignOut}
          >
            {VIETNAMESE.signOutButton} ({firebaseUser.isAnonymous ? VIETNAMESE.signedInAsGuest : firebaseUser.displayName || firebaseUser.email || VIETNAMESE.signedInAsGuest})
          </Button>
        )}
      </div>
      {isFirebaseLoading && !firebaseUser && <p className="mt-4 text-sm text-gray-400">{VIETNAMESE.signingInAnonymously}</p>}
      <p className="mt-12 text-sm text-gray-500">Phiên bản {APP_VERSION}</p>

      {showUpdateNotesModal && (
        <Modal
          isOpen={showUpdateNotesModal}
          onClose={() => setShowUpdateNotesModal(false)}
          title={VIETNAMESE.updateNotesModalTitle || "Thông Tin Cập Nhật Game"}
        >
          {isLoadingNotes && <Spinner text={VIETNAMESE.loadingUpdateNotes || "Đang tải..."} className="my-4" />}
          {errorNotes && <p className="text-red-400 bg-red-900/30 p-3 rounded-md border border-red-600 my-4">{errorNotes}</p>}
          {updateNotes && !isLoadingNotes && !errorNotes && (
            <div 
              className="text-sm text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar p-1 bg-gray-800/50 rounded"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(updateNotes) }}
            />
          )}
          {!updateNotes && !isLoadingNotes && !errorNotes && (
            <p className="text-gray-400 italic my-4">{VIETNAMESE.noUpdateNotesAvailable || "Chưa có thông tin cập nhật."}</p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default InitialScreen;
