import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SeverityBadge({ severity, size = 'md', showIcon = true }) {
  const sev = (severity || 'LOW').toUpperCase();

  const configs = {
    HIGH: {
      label: 'High Severity',
      shortLabel: 'HIGH',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500',
      icon: AlertCircle,
    },
    MEDIUM: {
      label: 'Medium Severity',
      shortLabel: 'MEDIUM',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
    },
    LOW: {
      label: 'Low Severity',
      shortLabel: 'LOW',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    NONE: {
      label: 'No Damage',
      shortLabel: 'CLEAR',
      bg: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
      dot: 'bg-slate-400',
      icon: CheckCircle2,
    }
  };

  const current = configs[sev] || configs.LOW;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${sizeClasses[size] || sizeClasses.md}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{size === 'sm' ? current.shortLabel : current.label}</span>
    </span>
  );
}
