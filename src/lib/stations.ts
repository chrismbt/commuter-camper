// Import the complete UK railway stations list
import stationsData from '@/data/stations.json';

export interface Station {
  code: string;
  name: string;
}

// Transform the JSON data into our format
export const ukStations: Station[] = stationsData.stations.map((station) => ({
  code: station["CRS Code"],
  name: station["Station Name"],
}));

export function searchStations(query: string): Station[] {
  const lowerQuery = query.toLowerCase();
  return ukStations.filter(
    (station) =>
      station.name.toLowerCase().includes(lowerQuery) ||
      station.code.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit results for performance
}

export function getStationByName(name: string): Station | undefined {
  // Try exact match first
  const exactMatch = ukStations.find(
    (station) => station.name.toLowerCase() === name.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // Try partial match (for cases where user typed slightly different name)
  return ukStations.find(
    (station) => station.name.toLowerCase().includes(name.toLowerCase()) ||
                 name.toLowerCase().includes(station.name.toLowerCase())
  );
}

export function getStationByCode(code: string): Station | undefined {
  return ukStations.find(
    (station) => station.code.toLowerCase() === code.toLowerCase()
  );
}
