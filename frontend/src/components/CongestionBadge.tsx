import React from 'react';

interface Props {
  level: string;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const CongestionBadge: React.FC<Props> = ({ level, index, size = 'md' }) => {
  const getColors = (l: string) => {
    switch (l?.toUpperCase()) {
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'SEVERE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${getColors(level)} ${sizeClasses[size]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {level} {index !== undefined ? `(${index.toFixed(2)})` : ''}
    </span>
  );
};
