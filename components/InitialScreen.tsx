
import React from 'react';
import { GameScreen, FirebaseUser } from '../types';
import Button from './ui/Button';
import { VIETNAMESE, GAME_TITLE, APP_VERSION } from '../constants';

interface InitialScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  firebaseUser: FirebaseUser | null;
  onSignOut: () => void;
  isFirebaseLoading: boolean;
}

const InitialScreen: React.FC<InitialScreenProps> = ({ setCurrentScreen, firebaseUser, onSignOut, isFirebaseLoading }) => {
  
  const handleLoadGameClick = () => {
    // Decision to keep firebaseUser check for cloud saves, local saves won't strictly need it this way
    // App.tsx will ultimately handle routing based on storage settings
    setCurrentScreen(GameScreen.LoadGameSelection);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-6">
        {GAME_TITLE}
      </h1>
      <p className="text-xl text-gray-300 mb-12 max-w-2xl">{VIETNAMESE.welcomeMessage}</p>
      
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
          // Disabled if Firebase is loading AND no user, or if explicitly just loading (generic for storage)
          disabled={isFirebaseLoading && !firebaseUser} 
          title={!firebaseUser && !isFirebaseLoading ? VIETNAMESE.signInRequiredForLoad : undefined}
        >
          {/* Text adapts if firebase is involved, otherwise generic load */}
          {isFirebaseLoading && !firebaseUser ? VIETNAMESE.signingInAnonymously : VIETNAMESE.loadGame}
        </Button>
         <Button 
            variant="ghost" 
            size="md" 
            className="w-full" 
            onClick={() => setCurrentScreen(GameScreen.ImportExport)} // New Button
          >
          {VIETNAMESE.importExportData}
        </Button>
        <Button variant="ghost" size="md" className="w-full" disabled>
          {VIETNAMESE.gameUpdates}
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
            onClick={() => setCurrentScreen(GameScreen.StorageSettings)} // Changed
          >
          {VIETNAMESE.storageSettings} 
        </Button>
        {firebaseUser && ( // Sign out kept for potential anonymous auth for Gemini or future cloud features
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
    </div>
  );
};

export default InitialScreen;