
import React, { useState, useEffect, ChangeEvent } from 'react';
import { StyleSettings, StyleSettingProperty } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal'; // Corrected import path
import { VIETNAMESE, AVAILABLE_FONTS, AVAILABLE_FONT_SIZES, DEFAULT_STYLE_SETTINGS } from '../constants';

interface StyleSettingsModalProps {
  initialSettings: StyleSettings;
  onSave: (newSettings: StyleSettings) => void;
  onClose: () => void;
}

const StyleSettingsModal: React.FC<StyleSettingsModalProps> = ({ initialSettings, onSave, onClose }) => {
  const [currentStyles, setCurrentStyles] = useState<StyleSettings>(initialSettings);

  useEffect(() => {
    setCurrentStyles(initialSettings);
  }, [initialSettings]);

  const handleStyleChange = (
    section: keyof StyleSettings,
    property: keyof StyleSettingProperty,
    value: string
  ) => {
    setCurrentStyles(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [property]: value === 'inherit' || value === '' ? undefined : value, // Store undefined for inheritance
      },
    }));
  };

  const handleResetSection = (section: keyof StyleSettings) => {
    setCurrentStyles(prev => ({
      ...prev,
      [section]: DEFAULT_STYLE_SETTINGS[section],
    }));
  };
  
  const handleResetAll = () => {
    setCurrentStyles(DEFAULT_STYLE_SETTINGS);
  };

  const handleApply = () => {
    onSave(currentStyles);
  };

  const renderStyleSection = (sectionKey: keyof StyleSettings, sectionLabel: string) => {
    const sectionStyles = currentStyles[sectionKey];
    const isKeywordSection = sectionKey === 'keywordHighlight';

    return (
      <fieldset className="border border-gray-700 p-4 rounded-md mb-6 bg-gray-800/30">
        <legend className="text-lg font-semibold text-indigo-300 px-2 flex justify-between items-center w-full">
          <span>{sectionLabel}</span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => handleResetSection(sectionKey)}
            className="text-xs text-amber-400 hover:text-amber-300 border-amber-500"
          >
            Khôi phục mục này
          </Button>
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {!isKeywordSection && ( // Font family only if not keyword section (or if explicitly enabled later)
            <div>
              <label htmlFor={`${sectionKey}-fontFamily`} className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.fontFamilyLabel}</label>
              <select
                id={`${sectionKey}-fontFamily`}
                value={sectionStyles.fontFamily || 'inherit'}
                onChange={(e) => handleStyleChange(sectionKey, 'fontFamily', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
              >
                {AVAILABLE_FONTS.map(font => <option key={font} value={font}>{font === 'inherit' ? 'Kế thừa' : font}</option>)}
              </select>
            </div>
          )}
          {!isKeywordSection && ( // Font size only if not keyword section
            <div>
              <label htmlFor={`${sectionKey}-fontSize`} className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.fontSizeLabel}</label>
              <select
                id={`${sectionKey}-fontSize`}
                value={sectionStyles.fontSize || 'inherit'}
                onChange={(e) => handleStyleChange(sectionKey, 'fontSize', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
              >
                {AVAILABLE_FONT_SIZES.map(size => <option key={size} value={size}>{size === 'inherit' ? 'Kế thừa' : size}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor={`${sectionKey}-textColor`} className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.textColorLabel}</label>
            <input
              type="color"
              id={`${sectionKey}-textColor`}
              value={sectionStyles.textColor} // textColor is mandatory
              onChange={(e) => handleStyleChange(sectionKey, 'textColor', e.target.value)}
              className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
            />
          </div>
          {!isKeywordSection && ( // Background color only if not keyword section
            <div>
              <label htmlFor={`${sectionKey}-backgroundColor`} className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.backgroundColorLabel}</label>
              <input
                type="color"
                id={`${sectionKey}-backgroundColor`}
                value={sectionStyles.backgroundColor || '#000000'} // Default to black if undefined for picker
                onChange={(e) => handleStyleChange(sectionKey, 'backgroundColor', e.target.value)}
                className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
              />
            </div>
          )}
        </div>
      </fieldset>
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={VIETNAMESE.displaySettingsTitle}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {renderStyleSection('narration', VIETNAMESE.narrationStylesLabel)}
        {renderStyleSection('playerAction', VIETNAMESE.playerActionStylesLabel)}
        {renderStyleSection('choiceButton', VIETNAMESE.choiceButtonStylesLabel)}
        {renderStyleSection('keywordHighlight', VIETNAMESE.keywordHighlightStylesLabel)}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <Button 
            type="button" 
            variant="danger" 
            onClick={handleResetAll}
            className="w-full sm:w-auto"
        >
          {VIETNAMESE.resetToDefaultsButton}
        </Button>
        <div className="flex space-x-3 w-full sm:w-auto">
            <Button 
                type="button" 
                variant="secondary" 
                onClick={onClose}
                className="flex-1 sm:flex-auto"
            >
            {VIETNAMESE.closeButton}
            </Button>
            <Button 
                type="button" 
                variant="primary" 
                onClick={handleApply}
                className="flex-1 sm:flex-auto"
            >
            {VIETNAMESE.applySettingsButton}
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StyleSettingsModal;
