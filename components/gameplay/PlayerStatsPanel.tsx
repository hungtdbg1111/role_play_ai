
import React from 'react';
import { PlayerStats, KnowledgeBase } from '../../types'; // Added KnowledgeBase
import { VIETNAMESE } from '../../constants';
import StatDisplay from './StatDisplay';

interface PlayerStatsPanelProps {
  stats: PlayerStats;
  knowledgeBase: KnowledgeBase; // Pass full KB to access worldConfig
}

const PlayerStatsPanel: React.FC<PlayerStatsPanelProps> = React.memo(({stats, knowledgeBase}) => {
  const { worldConfig } = knowledgeBase;
  const isCultivationEnabled = worldConfig?.isCultivationEnabled !== undefined ? worldConfig.isCultivationEnabled : true;
  const currencyName = worldConfig?.currencyName || "Tiền Tệ";
  const playerName = worldConfig?.playerName;
  const playerGender = worldConfig?.playerGender;

  const realmLabel = isCultivationEnabled ? VIETNAMESE.realmLabel : "Trạng Thái/Cấp Độ";
  const energyLabel = isCultivationEnabled ? VIETNAMESE.linhLucLabel : "Năng Lượng/Thể Lực";
  const experienceLabel = isCultivationEnabled ? VIETNAMESE.kinhNghiemLabel : "Kinh Nghiệm (Chung)";


  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2 flex justify-between items-center">
        <span>{VIETNAMESE.playerStats}</span>
        {isCultivationEnabled && stats.hieuUngBinhCanh && (
          <span className="text-sm font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full border border-red-600 animate-pulse">
            {VIETNAMESE.bottleneckEffectLabel}
          </span>
        )}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {playerName && <StatDisplay label={VIETNAMESE.characterName} value={playerName} className="col-span-1" />}
        {playerGender && <StatDisplay label={VIETNAMESE.gender} value={playerGender} className="col-span-1"/>}
        {playerName || playerGender ? <div className="col-span-2 h-1"></div> : null }

        <StatDisplay label={realmLabel} value={stats.realm} className="col-span-2 text-amber-400 font-semibold" />

        <StatDisplay label={VIETNAMESE.sinhLucLabel} value={`${stats.sinhLuc}/${stats.maxSinhLuc}`} />
        {(isCultivationEnabled || stats.maxLinhLuc > 0) && <StatDisplay label={energyLabel} value={`${stats.linhLuc}/${stats.maxLinhLuc}`} />}
        <StatDisplay label={VIETNAMESE.sucTanCongLabel} value={stats.sucTanCong} />
        {(isCultivationEnabled || stats.maxKinhNghiem > 0) && <StatDisplay label={experienceLabel} value={`${stats.kinhNghiem}/${stats.maxKinhNghiem}`} />}
        <StatDisplay label={currencyName} value={stats.currency} />
        <StatDisplay label="Lượt" value={stats.turn} />
      </div>
    </div>
  );
});

export default PlayerStatsPanel;
