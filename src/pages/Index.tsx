import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { JourneyBuilder } from '@/components/JourneyBuilder';
import { JourneyList } from '@/components/JourneyList';
import { AuthForm } from '@/components/AuthForm';
import { useJourneys } from '@/hooks/useJourneys';
import { useAuth } from '@/hooks/useAuth';
import { JourneyLeg } from '@/types/train';
import { Plus, History, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const { journeys, loading: journeysLoading, addJourney, deleteJourney } = useJourneys();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleSaveJourney = async (legs: JourneyLeg[]) => {
    const result = await addJourney(legs);
    if (result) {
      setIsBuilding(false);
      toast({
        title: 'Journey saved',
        description: `Recorded ${legs.length} train${legs.length > 1 ? 's' : ''} in your journey log.`,
      });
    } else {
      toast({
        title: 'Failed to save journey',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteJourney(id);
    toast({
      title: 'Journey deleted',
      description: 'The journey has been removed from your log.',
    });
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm />;
  }

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
                  {journeysLoading ? 'Loading...' : `${journeys.length} journey${journeys.length !== 1 ? 's' : ''} recorded`}
                </span>
              </div>
              <Button onClick={() => setIsBuilding(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New journey
              </Button>
            </div>
            
            {journeysLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <JourneyList journeys={journeys} onDelete={handleDelete} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
