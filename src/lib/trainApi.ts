import { supabase } from '@/integrations/supabase/client';
import { TrainService } from '@/types/train';

interface SearchTrainsResponse {
  success: boolean;
  data?: TrainService[];
  error?: string;
}

export async function searchTrains(
  fromCrs: string,
  toCrs: string,
  date: string,
  time: string,
  fromName?: string,
  toName?: string
): Promise<SearchTrainsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('search-trains', {
      body: { fromCrs, toCrs, date, time, fromName, toName },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
    }

    return data as SearchTrainsResponse;
  } catch (err) {
    console.error('Search trains error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to search trains' 
    };
  }
}
