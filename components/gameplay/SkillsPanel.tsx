
import React from 'react';
import { Skill } from '../../types';
import { VIETNAMESE } from '../../constants';

interface SkillsPanelProps {
  skills: Skill[];
  onSkillClick: (skill: Skill) => void;
}

const SkillsPanel: React.FC<SkillsPanelProps> = React.memo(({skills, onSkillClick}) => {
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md">
       <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.skills}</h3>
       {skills.length === 0 ? <p className="text-gray-400 italic text-sm">Chưa học được kỹ năng nào.</p> : (
        <ul className="space-y-1 max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar">
          {skills.map(skill => (
            <li
              key={skill.id}
              className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors"
              onClick={() => onSkillClick(skill)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSkillClick(skill)}
              aria-label={`Details for ${skill.name}`}
              title={skill.name}
            >
              <span className="truncate block">
                <strong className="text-indigo-300">{skill.name}</strong>
              </span>
            </li>
          ))}
        </ul>
       )}
    </div>
  );
});

export default SkillsPanel;