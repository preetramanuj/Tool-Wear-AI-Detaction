import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export type SeverityLevel = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'HEALTHY';

interface SeverityCardProps {
  level: SeverityLevel;
  title?: string;
  subtitle?: string;
  count?: number;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SeverityCard: React.FC<SeverityCardProps> = ({
  level,
  title,
  subtitle,
  count,
  isSelected = false,
  onClick,
  className = '',
}) => {
  const normLevel = level.toUpperCase() === 'HEALTHY' ? 'NORMAL' : (level.toUpperCase() as 'NORMAL' | 'WARNING' | 'CRITICAL');

  if (normLevel === 'NORMAL') {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex items-center justify-between gap-4 ${
          isSelected
            ? 'border-normal ring-2 ring-normal/20 shadow-paper-md'
            : 'border-[#E2DFD7] hover:border-normal/50 hover:shadow-paper'
        } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-normal">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-base text-slate-900 leading-tight">
              {title || 'Normal'}
            </div>
            <div className="text-xs text-slate-500 font-sans mt-0.5 truncate">
              {subtitle || 'Within tolerance'}
            </div>
          </div>
        </div>
        {count !== undefined && (
          <div className="font-display font-bold text-xl text-normal bg-normal-light px-3 py-1 rounded-xl">
            {count}
          </div>
        )}
      </div>
    );
  }

  if (normLevel === 'WARNING') {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex items-center justify-between gap-4 ${
          isSelected
            ? 'border-warning ring-2 ring-warning/20 shadow-paper-md'
            : 'border-[#E2DFD7] hover:border-warning/50 hover:shadow-paper'
        } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 flex items-center justify-center shrink-0 text-warning">
            <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-base text-slate-900 leading-tight">
              {title || 'Warning'}
            </div>
            <div className="text-xs text-slate-500 font-sans mt-0.5 truncate">
              {subtitle || 'High wear detected'}
            </div>
          </div>
        </div>
        {count !== undefined && (
          <div className="font-display font-bold text-xl text-warning bg-warning-light px-3 py-1 rounded-xl">
            {count}
          </div>
        )}
      </div>
    );
  }

  // CRITICAL with bold red outline and safety hazard diagonal stripe indicator on the left
  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl p-4 sm:p-5 pl-7 sm:pl-8 border-2 border-critical shadow-paper-md transition-all duration-200 flex items-center justify-between gap-4 hazard-stripe-left ${
        isSelected ? 'ring-2 ring-critical/20' : 'hover:shadow-paper-lg'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-critical">
          <AlertOctagon className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-base text-slate-900 leading-tight">
            {title || 'Critical'}
          </div>
          <div className="text-xs text-slate-500 font-sans mt-0.5 truncate">
            {subtitle || 'Replace tool now'}
          </div>
        </div>
      </div>
      {count !== undefined && (
        <div className="font-display font-bold text-xl text-critical bg-critical-light px-3 py-1 rounded-xl">
          {count}
        </div>
      )}
    </div>
  );
};

export const SeverityBadge: React.FC<{
  level: SeverityLevel | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ level, showIcon = true, size = 'md', className = '' }) => {
  const normLevel =
    level?.toUpperCase() === 'HEALTHY' || level?.toUpperCase() === 'NORMAL'
      ? 'NORMAL'
      : level?.toUpperCase() === 'WARNING'
      ? 'WARNING'
      : 'CRITICAL';

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  if (normLevel === 'NORMAL') {
    return (
      <span
        className={`inline-flex items-center rounded-lg font-mono font-bold bg-normal-light text-normal border border-normal-border shadow-2xs ${sizeClasses} ${className}`}
      >
        {showIcon && <CheckCircle2 className={`${iconSizes} text-normal`} />}
        <span>NORMAL</span>
      </span>
    );
  }

  if (normLevel === 'WARNING') {
    return (
      <span
        className={`inline-flex items-center rounded-lg font-mono font-bold bg-warning-light text-warning border border-warning-border shadow-2xs ${sizeClasses} ${className}`}
      >
        {showIcon && <AlertTriangle className={`${iconSizes} text-warning`} />}
        <span>WARNING</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg font-mono font-bold bg-critical-light text-critical border border-critical-border shadow-2xs ${sizeClasses} ${className}`}
    >
      {showIcon && <AlertOctagon className={`${iconSizes} text-critical`} />}
      <span>CRITICAL</span>
    </span>
  );
};
