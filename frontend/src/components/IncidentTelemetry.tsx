import React from 'react';
import { type Incident, useIncidentStore } from '@/store/incidentStore';
import { AlertCircle, MapPin, Clock, Flame, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function timeSince(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

const CAUSE_ICONS: Record<string, string> = {
  breakdown: '🔧',
  accident: '💥',
  water_logging: '🌊',
  protest: '📢',
  tree_fall: '🌳',
  vip_movement: '🚔',
  pothole: '🕳️',
  road_work: '🚧',
};

export default function IncidentTelemetry({ incidents }: { incidents: Incident[] }) {
  const { selectIncident, selectedIncidentId } = useIncidentStore();

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="w-5 h-5" />
        </div>
        <p className="text-sm">No active incidents</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {incidents.map((incident) => {
        const isSelected = selectedIncidentId === incident.id;
        const isHigh = incident.priority === 'High';
        const causeKey = incident.event_cause?.toLowerCase().replace(' ', '_') ?? '';
        const emoji = CAUSE_ICONS[causeKey] ?? '⚠️';

        return (
          <button
            key={incident.id}
            onClick={() => selectIncident(incident.id)}
            className={cn(
              'w-full text-left rounded-xl border p-3.5 transition-all duration-200 group',
              'hover:border-primary/50 hover:shadow-[0_0_12px_rgba(56,189,248,0.08)]',
              isSelected
                ? 'border-primary/60 bg-primary/5 shadow-[0_0_16px_rgba(56,189,248,0.12)] incident-active'
                : 'border-border/50 bg-card hover:bg-card/80',
              isHigh && !isSelected && 'border-l-[3px] border-l-destructive'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {/* Emoji icon */}
                <span className="text-base mt-0.5 shrink-0">{emoji}</span>
                <div className="min-w-0">
                  {/* Priority badge */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn(
                      'text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full',
                      isHigh
                        ? 'bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-secondary text-muted-foreground border border-border'
                    )}>
                      {isHigh && <Flame className="w-2 h-2 inline mr-0.5" />}
                      {incident.priority}
                    </span>
                    {isHigh && (
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute h-2 w-2 rounded-full bg-destructive opacity-75" />
                        <span className="relative h-2 w-2 rounded-full bg-destructive" />
                      </span>
                    )}
                  </div>
                  {/* Address */}
                  <p className="text-xs font-semibold text-foreground leading-tight truncate">{incident.address}</p>
                  {/* Description */}
                  {incident.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{incident.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1 transition-transform', isSelected && 'rotate-90 text-primary')} />
            </div>

            {/* Footer meta */}
            <div className="flex items-center gap-3 mt-2.5 pl-8">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertCircle className="w-2.5 h-2.5" />
                <span className="capitalize">{incident.event_cause?.replace('_', ' ')}</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="w-2.5 h-2.5" />
                <span className="truncate max-w-[70px]">{incident.corridor !== 'Unknown' ? incident.corridor : incident.zone}</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <Clock className="w-2.5 h-2.5" />
                {timeSince(incident.start_datetime)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
