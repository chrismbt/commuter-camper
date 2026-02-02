import { Train } from 'lucide-react';

export function Header() {
  return (
    <header className="gradient-rail text-primary-foreground py-8 px-4">
      <div className="max-w-3xl mx-auto">
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
    </header>
  );
}
