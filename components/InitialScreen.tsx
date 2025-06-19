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
    if (firebaseUser) {
      setCurrentScreen(GameScreen.LoadGameSelection);
    } else {
      // Optionally, prompt to sign in or wait for auto sign-in
      alert(VIETNAMESE.signInRequiredForLoad);
    }
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
          disabled={isFirebaseLoading || !firebaseUser}
          title={!firebaseUser && !isFirebaseLoading ? VIETNAMESE.signInRequiredForLoad : undefined}
        >
          {isFirebaseLoading ? VIETNAMESE.signingInAnonymously : VIETNAMESE.loadGame}
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
        {firebaseUser && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 border-red-500 text-red-400 hover:bg-red-700 hover:text-white"
            onClick={onSignOut}
          >
            {VIETNAMESE.signOutButton} ({VIETNAMESE.signedInAsGuest})
          </Button>
        )}
      </div>
      {isFirebaseLoading && <p className="mt-4 text-sm text-gray-400">{VIETNAMESE.signingInAnonymously}</p>}
      <p className="mt-12 text-sm text-gray-500">Một sản phẩm của trí tuệ nhân tạo và niềm đam mê tu tiên. Phiên bản {APP_VERSION}</p>
    </div>
  );
};

export default InitialScreen;