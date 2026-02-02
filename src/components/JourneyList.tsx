import { Journey } from '@/types/train';
import { Button } from '@/components/ui/button';
import { Train, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface JourneyListProps {
  journeys: Journey[];
  onDelete: (id: string) => void;
}

export function JourneyList({ journeys, onDelete }: JourneyListProps) {
  if (journeys.length === 0) {
    return (
      <div className="text-center py-12">
        <Train className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No journeys recorded</h3>
        <p className="text-muted-foreground">
          Start by adding your first train journey
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {journeys.map((journey) => (
        <div
          key={journey.id}
          className="bg-card border border-border rounded-lg overflow-hidden animate-slide-up"
        >
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(journey.createdAt), 'PPP')}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(journey.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="space-y-0">
              {journey.legs.map((leg, index) => (
                <div key={leg.id} className="journey-leg">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{leg.fromStation}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{leg.toStation}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{leg.departureTime} - {leg.arrivalTime}</span>
                        {leg.operator && (
                          <>
                            <span>·</span>
                            <span>{leg.operator}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-muted-foreground">
                        {leg.trainUid}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leg.runDate}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
