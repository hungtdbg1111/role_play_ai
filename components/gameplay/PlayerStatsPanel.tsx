
import React from 'react';
import { PlayerStats } from '../../types';
import { VIETNAMESE } from '../../constants';
import StatDisplay from './StatDisplay';

interface PlayerStatsPanelProps {
  stats: PlayerStats;
  currencyName?: string;
  playerName?: string; // New prop
  playerGender?: string; // New prop
}

const PlayerStatsPanel: React.FC<PlayerStatsPanelProps> = React.memo(({stats, currencyName, playerName, playerGender}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.playerStats}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {playerName && <StatDisplay label={VIETNAMESE.characterName} value={playerName} className="col-span-1" />}
        {playerGender && <StatDisplay label={VIETNAMESE.gender} value={playerGender} className="col-span-1"/>}
        {playerName || playerGender ? <div className="col-span-2 h-1"></div> : null } {/* Spacer if name/gender shown */}
        <StatDisplay label="HP" value={`${stats.hp}/${stats.maxHp}`} />
        <StatDisplay label="Mana" value={`${stats.mana}/${stats.maxMana}`} />
        <StatDisplay label="ATK" value={stats.atk} />
        <StatDisplay label="Cấp" value={stats.level} />
        <StatDisplay label="EXP" value={`${stats.exp}/${stats.maxExp}`} />
        <StatDisplay label="Cảnh Giới" value={stats.realm} />
        <StatDisplay label={currencyName || "Tiền Tệ"} value={stats.currency} />
        <StatDisplay label="Lượt" value={stats.turn} />
      </div>
    </div>
  );
});

export default PlayerStatsPanel;