
import React, { ChangeEvent } from 'react';

export interface InputFieldProps {
  label: string;
  id: string;
  name?: string;
  value?: string | number;
  checked?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  options?: string[];
  textarea?: boolean;
  className?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  rows?: number;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, name, value, checked, onChange, type = "text", options, textarea, className = "", placeholder, min, max, step, rows = 2, disabled = false }) => (
  <div className={`mb-4 ${type === 'checkbox' ? 'flex items-center' : ''}`}>
    {type === 'checkbox' ? (
      <>
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          className={`h-5 w-5 text-indigo-600 border-gray-500 rounded focus:ring-indigo-500 bg-gray-700 mr-2 ${className}`}
          disabled={disabled}
        />
        <label htmlFor={id} className="text-sm font-medium text-gray-300 select-none">
          {label}
        </label>
      </>
    ) : (
      <>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        {textarea ? (
          <textarea id={id} name={name} value={value as string ?? ''} onChange={onChange} rows={rows} className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} placeholder={placeholder} disabled={disabled} />
        ) : type === 'select' && options ? (
          <select id={id} name={name} value={value as string ?? ''} onChange={onChange} className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} disabled={disabled}>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={type}
            id={id}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
          />
        )}
      </>
    )}
  </div>
);

export default InputField;
