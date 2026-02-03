import { useState, useEffect, useCallback } from 'react';
import { Journey, JourneyLeg } from '@/types/train';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchJourneys = useCallback(async () => {
    if (!user) {
      setJourneys([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch journeys
    const { data: journeysData, error: journeysError } = await supabase
      .from('journeys')
      .select('*')
      .order('created_at', { ascending: false });

    if (journeysError) {
      console.error('Error fetching journeys:', journeysError);
      setLoading(false);
      return;
    }

    // Fetch all legs for these journeys
    const journeyIds = journeysData.map((j) => j.id);
    
    if (journeyIds.length === 0) {
      setJourneys([]);
      setLoading(false);
      return;
    }

    const { data: legsData, error: legsError } = await supabase
      .from('journey_legs')
      .select('*')
      .in('journey_id', journeyIds)
      .order('leg_order', { ascending: true });

    if (legsError) {
      console.error('Error fetching journey legs:', legsError);
      setLoading(false);
      return;
    }

    // Map to Journey type
    const mappedJourneys: Journey[] = journeysData.map((journey) => ({
      id: journey.id,
      createdAt: journey.created_at,
      deviceId: journey.device_id || undefined,
      legs: legsData
        .filter((leg) => leg.journey_id === journey.id)
        .map((leg) => ({
          id: leg.id,
          trainUid: leg.train_uid,
          runDate: leg.run_date,
          fromStation: leg.from_station,
          toStation: leg.to_station,
          departureTime: leg.departure_time,
          arrivalTime: leg.arrival_time,
          operator: leg.operator || undefined,
        })),
    }));

    setJourneys(mappedJourneys);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  const addJourney = async (legs: JourneyLeg[], deviceId: number): Promise<Journey | null> => {
    if (!user) return null;

    // Create the journey with device_id
    const { data: journeyData, error: journeyError } = await supabase
      .from('journeys')
      .insert({ user_id: user.id, device_id: deviceId })
      .select()
      .single();

    if (journeyError || !journeyData) {
      console.error('Error creating journey:', journeyError);
      return null;
    }

    // Create the legs
    const legsToInsert = legs.map((leg, index) => ({
      journey_id: journeyData.id,
      train_uid: leg.trainUid,
      run_date: leg.runDate,
      from_station: leg.fromStation,
      to_station: leg.toStation,
      departure_time: leg.departureTime,
      arrival_time: leg.arrivalTime,
      operator: leg.operator || null,
      leg_order: index,
    }));

    const { error: legsError } = await supabase
      .from('journey_legs')
      .insert(legsToInsert);

    if (legsError) {
      console.error('Error creating journey legs:', legsError);
      // Clean up the journey if legs failed
      await supabase.from('journeys').delete().eq('id', journeyData.id);
      return null;
    }

    const newJourney: Journey = {
      id: journeyData.id,
      createdAt: journeyData.created_at,
      deviceId,
      legs,
    };

    setJourneys((prev) => [newJourney, ...prev]);
    return newJourney;
  };

  const getLastUsedDeviceId = (): number | undefined => {
    if (journeys.length === 0) return undefined;
    return journeys[0].deviceId;
  };

  const deleteJourney = async (id: string) => {
    const { error } = await supabase.from('journeys').delete().eq('id', id);

    if (error) {
      console.error('Error deleting journey:', error);
      return;
    }

    setJourneys((prev) => prev.filter((j) => j.id !== id));
  };

  const clearAllJourneys = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('journeys')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing journeys:', error);
      return;
    }

    setJourneys([]);
  };

  return {
    journeys,
    loading,
    addJourney,
    deleteJourney,
    clearAllJourneys,
    refetch: fetchJourneys,
    getLastUsedDeviceId,
  };
}
