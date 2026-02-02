import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { searchStations } from '@/lib/stations';
import { MapPin } from 'lucide-react';

interface StationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

export function StationInput({ value, onChange, placeholder, label }: StationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof searchStations>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      setSuggestions(searchStations(value));
    } else {
      setSuggestions([]);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (station: { code: string; name: string }) => {
    onChange(station.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto animate-slide-up">
          {suggestions.map((station) => (
            <button
              key={station.code}
              onClick={() => handleSelect(station)}
              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="station-badge text-xs">{station.code}</span>
              <span className="text-sm text-foreground">{station.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
