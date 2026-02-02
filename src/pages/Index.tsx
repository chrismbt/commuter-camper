import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { JourneyBuilder } from '@/components/JourneyBuilder';
import { JourneyList } from '@/components/JourneyList';
import { useJourneys } from '@/hooks/useJourneys';
import { JourneyLeg } from '@/types/train';
import { Plus, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const { journeys, addJourney, deleteJourney } = useJourneys();
  const { toast } = useToast();

  const handleSaveJourney = (legs: JourneyLeg[]) => {
    addJourney(legs);
    setIsBuilding(false);
    toast({
      title: 'Journey saved',
      description: `Recorded ${legs.length} train${legs.length > 1 ? 's' : ''} in your journey log.`,
    });
  };

  const handleDelete = (id: string) => {
    deleteJourney(id);
    toast({
      title: 'Journey deleted',
      description: 'The journey has been removed from your log.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        {isBuilding ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Record a journey</h2>
            <JourneyBuilder
              onSave={handleSaveJourney}
              onCancel={() => setIsBuilding(false)}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <History className="h-5 w-5" />
                <span className="font-medium">
                  {journeys.length} journey{journeys.length !== 1 ? 's' : ''} recorded
                </span>
              </div>
              <Button onClick={() => setIsBuilding(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New journey
              </Button>
            </div>
            
            <JourneyList journeys={journeys} onDelete={handleDelete} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
