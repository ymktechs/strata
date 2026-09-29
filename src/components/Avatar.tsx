import React from 'react';
import { AvatarColor, PresenceState } from '../lib/validation';

const COLOR_MAP: Record<AvatarColor, string> = {
  slate: 'bg-slate-800 text-white',
  indigo: 'bg-indigo-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-600 text-white',
  rose: 'bg-rose-600 text-white',
  cyan: 'bg-cyan-700 text-white',
};

const PRESENCE_DOT_MAP: Record<PresenceState, string> = {
  online: 'bg-emerald-600',
  away: 'bg-amber-500',
  busy: 'bg-red-600',
  offline: 'bg-slate-400',
};

export const PRESENCE_LABEL_MAP: Record<PresenceState, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AvatarProps {
  name: string;
  color: AvatarColor;
  presence?: PresenceState;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color,
  presence,
  size = 'md',
}) => {
  const sizeClass =
    size === 'sm'
      ? 'w-7 h-7 text-xs rounded-md'
      : size === 'lg'
      ? 'w-11 h-11 text-sm rounded-lg'
      : 'w-9 h-9 text-xs rounded-lg';

  const colorClass = COLOR_MAP[color] || COLOR_MAP.slate;

  return (
    <div className="relative inline-flex shrink-0 select-none">
      <div
        className={`${sizeClass} ${colorClass} font-semibold flex items-center justify-center tracking-tight`}
        aria-label={name}
      >
        {getInitials(name)}
      </div>
      {presence && (
        <span
          title={PRESENCE_LABEL_MAP[presence]}
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${PRESENCE_DOT_MAP[presence]}`}
        />
      )}
    </div>
  );
};
