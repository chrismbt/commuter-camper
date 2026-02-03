import { Train, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="gradient-rail text-primary-foreground py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-foreground/10 rounded-lg">
                <Train className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">Train Journey Log</h1>
            </div>
            <p className="text-primary-foreground/80">
              Record and track your train journeys
            </p>
          </div>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
