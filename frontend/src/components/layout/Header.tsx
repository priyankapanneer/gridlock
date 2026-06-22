import { useState, useEffect } from 'react';
import { useAuthStore, type Role } from '@/store/authStore';
import { useIncidentStore } from '@/store/incidentStore';
import { Shield, User, LogOut } from 'lucide-react';
import { ROLES } from '@/lib/constants';

const ROLE_COLORS: Record<Role, string> = {
  [ROLES.COMMAND_COMMISSIONER]: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  [ROLES.FIELD_INSPECTOR]:      'text-green-400 bg-green-500/10 border-green-500/30',
  [ROLES.TRANSIT_PLANNER]:      'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const ROLE_DOTS: Record<Role, string> = {
  [ROLES.COMMAND_COMMISSIONER]: 'bg-blue-400',
  [ROLES.FIELD_INSPECTOR]:      'bg-green-400',
  [ROLES.TRANSIT_PLANNER]:      'bg-purple-400',
};

interface HeaderProps {
  showBusLanes: boolean;
  onToggleBusLanes: (checked: boolean) => void;
}

export default function Header({ showBusLanes, onToggleBusLanes }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { incidents } = useIncidentStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => {
      setShowUserMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const highCount = incidents.filter(i => i.priority === 'High').length;
  const role = user?.role ?? 'Field Inspector';

  return (
    <header className="w-full h-16 bg-zinc-950 border-b border-zinc-800 shrink-0 flex items-center justify-between px-6 z-50">
      {/* Left: Brand typography + pulsing system status */}
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-rose-500 shrink-0" />
        <span className="font-bold text-sm tracking-widest text-white">RESILIO COMMAND PLATFORM</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Center: Inline layouts */}
      <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 px-4 py-1.5 rounded-xl">
        {/* Role Selector */}
        <div className="relative">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/8 text-[11px] font-medium transition-all ${ROLE_COLORS[role]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full live-pulse ${ROLE_DOTS[role]}`} />
            <span>{role}</span>
          </div>
        </div>

        {/* Jurisdiction select dropdown */}
        {role === 'Field Inspector' && (
          <>
            <div className="w-[1px] h-5 bg-white/10" />
            <div className="bg-[#0b0f19]/80 border border-green-500/30 rounded-lg px-2 py-1 text-[11px] text-green-300 font-medium">
              {user?.police_station || 'HAL Old Airport'} PS
            </div>
          </>
        )}

        {/* Transit Overlay Toggle */}
        {role === 'Transit Planner' && (
          <>
            <div className="w-[1px] h-5 bg-white/10" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showBusLanes} 
                onChange={e => onToggleBusLanes(e.target.checked)} 
                className="rounded border-white/20 text-emerald-500 focus:ring-emerald-500 bg-[#0b0f19] h-3.5 w-3.5 cursor-pointer" 
              />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Transit Overlay</span>
            </label>
          </>
        )}

        <div className="w-[1px] h-5 bg-white/10" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowUserMenu(v => !v); }}
            className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            title={`${user?.username} (${user?.email})`}
          >
            <User className="w-3 h-3 text-white/70" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-8 w-44 bg-zinc-950 rounded-lg shadow-2xl border border-white/8 py-1.5 overflow-hidden z-50">
              <div className="px-3 py-1.5">
                <p className="text-[10px] font-semibold text-white/90">{user?.username}</p>
                <p className="text-[9px] text-white/40">{user?.email}</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-5 bg-white/10" />

        {/* Separated Sign Out Button */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-semibold transition-all duration-200 cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-3 h-3" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Right Area: Integrated Telemetry Counters */}
      <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-semibold">Active Incidents:</span>
          <span className="text-rose-400 font-bold text-sm tracking-widest">{incidents.length}</span>
        </div>
        <div className="w-[1px] h-4 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-semibold">Critical Threats:</span>
          <span className="text-rose-400 font-bold text-sm tracking-widest">{highCount}</span>
        </div>
      </div>
    </header>
  );
}
