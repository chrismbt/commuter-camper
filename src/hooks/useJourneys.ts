import { useState, useEffect } from 'react';
import { Journey, JourneyLeg } from '@/types/train';

const STORAGE_KEY = 'train-journeys';

export function useJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setJourneys(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored journeys:', e);
      }
    }
  }, []);

  const saveJourneys = (updatedJourneys: Journey[]) => {
    setJourneys(updatedJourneys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJourneys));
  };

  const addJourney = (legs: JourneyLeg[]) => {
    const newJourney: Journey = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      legs,
    };
    saveJourneys([newJourney, ...journeys]);
    return newJourney;
  };

  const deleteJourney = (id: string) => {
    saveJourneys(journeys.filter((j) => j.id !== id));
  };

  const clearAllJourneys = () => {
    saveJourneys([]);
  };

  return {
    journeys,
    addJourney,
    deleteJourney,
    clearAllJourneys,
  };
}
