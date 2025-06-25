
import React from 'react';

interface StatDisplayProps {
  label: string;
  value: string | number;
  className?: string;
}

const StatDisplay: React.FC<StatDisplayProps> = ({label, value, className=""}) => (
  <div className={`text-sm py-1 ${className}`}>
    <span className="font-semibold text-indigo-300">{label}: </span>
    <span className="text-gray-100">{value}</span>
  </div>
);

export default StatDisplay;