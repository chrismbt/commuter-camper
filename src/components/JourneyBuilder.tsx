import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StationInput } from './StationInput';
import { TrainCard } from './TrainCard';
import { JourneyLeg, TrainService } from '@/types/train';
import { searchTrains } from '@/lib/trainApi';
import { getStationByName } from '@/lib/stations';
import { Search, Plus, Save, X, Train, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JourneyBuilderProps {
  onSave: (legs: JourneyLeg[]) => void;
  onCancel: () => void;
}

export function JourneyBuilder({ onSave, onCancel }: JourneyBuilderProps) {
  const [legs, setLegs] = useState<JourneyLeg[]>([]);
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [searchResults, setSearchResults] = useState<TrainService[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<TrainService | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!fromStation || !toStation) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setSelectedTrain(null);
    setSearchError(null);
    
    // Look up CRS codes for the stations
    const fromStationData = getStationByName(fromStation);
    const toStationData = getStationByName(toStation);
    
    if (!fromStationData) {
      setSearchError(`Could not find station code for "${fromStation}". Please select a station from the suggestions.`);
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    if (!toStationData) {
      setSearchError(`Could not find station code for "${toStation}". Please select a station from the suggestions.`);
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    const result = await searchTrains(fromStationData.code, toStationData.code, date, time);
    
    if (result.success && result.data) {
      setSearchResults(result.data);
    } else {
      setSearchError(result.error || 'Failed to search trains. Please try again.');
      setSearchResults([]);
    }
    
    setIsSearching(false);
  };

  const handleAddLeg = () => {
    if (!selectedTrain) return;
    
    const newLeg: JourneyLeg = {
      id: crypto.randomUUID(),
      trainUid: selectedTrain.trainUid,
      runDate: selectedTrain.runDate,
      fromStation: selectedTrain.origin,
      toStation: selectedTrain.destination,
      departureTime: selectedTrain.departureTime,
      arrivalTime: selectedTrain.arrivalTime,
      operator: selectedTrain.atocName,
    };
    
    setLegs([...legs, newLeg]);
    
    // Reset for next leg
    setFromStation(selectedTrain.destination);
    setToStation('');
    setSearchResults([]);
    setSelectedTrain(null);
    setHasSearched(false);
  };

  const handleRemoveLeg = (id: string) => {
    setLegs(legs.filter((leg) => leg.id !== id));
  };

  const handleSave = () => {
    if (selectedTrain) {
      // Add the currently selected train as well
      const finalLeg: JourneyLeg = {
        id: crypto.randomUUID(),
        trainUid: selectedTrain.trainUid,
        runDate: selectedTrain.runDate,
        fromStation: selectedTrain.origin,
        toStation: selectedTrain.destination,
        departureTime: selectedTrain.departureTime,
        arrivalTime: selectedTrain.arrivalTime,
        operator: selectedTrain.atocName,
      };
      onSave([...legs, finalLeg]);
    } else if (legs.length > 0) {
      onSave(legs);
    }
  };

  const canSave = legs.length > 0 || selectedTrain !== null;

  return (
    <div className="space-y-6">
      {/* Current legs */}
      {legs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Journey legs</h3>
          {legs.map((leg, index) => (
            <div
              key={leg.id}
              className="flex items-center gap-3 p-3 bg-muted rounded-lg animate-slide-up"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {leg.fromStation} → {leg.toStation}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leg.departureTime} - {leg.arrivalTime} · {leg.operator}
                </p>
              </div>
              <p className="text-xs font-mono text-muted-foreground">{leg.trainUid}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemoveLeg(leg.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StationInput
            value={fromStation}
            onChange={setFromStation}
            label="From"
            placeholder="e.g. London Paddington"
          />
          <StationInput
            value={toStation}
            onChange={setToStation}
            label="To"
            placeholder="e.g. Bristol Temple Meads"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Departure time
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={!fromStation || !toStation || isSearching}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search trains
            </>
          )}
        </Button>
      </div>

      {/* Search error */}
      {searchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {/* Search results */}
      {hasSearched && !isSearching && !searchError && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {searchResults.length > 0 
              ? `${searchResults.length} trains found` 
              : 'No trains found'}
          </h3>
          
          {searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Train className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No services found for this route and time.</p>
              <p className="text-sm">Try adjusting your search criteria.</p>
            </div>
          )}
          
          <div className="space-y-2">
            {searchResults.map((train) => (
              <TrainCard
                key={train.trainUid}
                train={train}
                isSelected={selectedTrain?.trainUid === train.trainUid}
                onSelect={() => setSelectedTrain(train)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedTrain && (
        <div className="flex gap-3 pt-4 border-t border-border animate-slide-up">
          <Button
            variant="outline"
            onClick={handleAddLeg}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another train
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save journey
          </Button>
        </div>
      )}

      {/* Cancel / Save without selection */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {legs.length > 0 && !selectedTrain && (
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save {legs.length} leg{legs.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
}
