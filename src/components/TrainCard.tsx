import { TrainService } from '@/types/train';
import { Train, Clock, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainCardProps {
  train: TrainService;
  isSelected: boolean;
  onSelect: () => void;
}

export function TrainCard({ train, isSelected, onSelect }: TrainCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'on-time':
        return 'text-train-green';
      case 'delayed':
        return 'text-train-orange';
      case 'cancelled':
        return 'text-train-red';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'on-time':
        return 'On time';
      case 'delayed':
        return 'Delayed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'train-card w-full text-left',
        isSelected && 'train-card-selected'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <p className="time-display text-foreground">{train.departureTime}</p>
              {train.actualDepartureTime && train.actualDepartureTime !== train.departureTime && (
                <p className="text-sm font-semibold text-destructive">{train.actualDepartureTime}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{train.origin}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center">
              <p className="time-display text-foreground">{train.arrivalTime}</p>
              {train.actualArrivalTime && train.actualArrivalTime !== train.arrivalTime && (
                <p className="text-sm font-semibold text-destructive">{train.actualArrivalTime}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{train.destination}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Train className="h-3.5 w-3.5" />
              <span>{train.atocName}</span>
            </div>
            {train.platform && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="station-badge text-xs">Plat {train.platform}</span>
              </div>
            )}
            {train.status && (
              <span className={cn('font-medium', getStatusColor(train.status))}>
                {getStatusText(train.status)}
              </span>
            )}
          </div>
        </div>
        
        <div className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
          isSelected 
            ? 'border-primary bg-primary' 
            : 'border-border'
        )}>
          {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-mono">
          UID: {train.trainUid}
        </p>
        {train.trainId && (
          <p className="text-xs text-muted-foreground font-mono">
            {train.trainId}
          </p>
        )}
      </div>
    </button>
  );
}
