import { TrainService } from '@/types/train';

// Mock data generator for demo purposes
// In production, this would be replaced with actual RTT API calls
export function generateMockTrains(
  fromStation: string,
  toStation: string,
  departureTime: string,
  date: string
): TrainService[] {
  const baseHour = parseInt(departureTime.split(':')[0]);
  const operators = [
    { code: 'GW', name: 'Great Western Railway' },
    { code: 'SW', name: 'South Western Railway' },
    { code: 'SE', name: 'Southeastern' },
    { code: 'TL', name: 'Thameslink' },
    { code: 'AW', name: 'Avanti West Coast' },
    { code: 'XC', name: 'CrossCountry' },
    { code: 'NT', name: 'Northern' },
    { code: 'EM', name: 'East Midlands Railway' },
  ];

  const trains: TrainService[] = [];
  
  for (let i = 0; i < 6; i++) {
    const departHour = (baseHour + Math.floor(i / 2)) % 24;
    const departMinute = (i % 2) * 30 + Math.floor(Math.random() * 15);
    const journeyLength = 30 + Math.floor(Math.random() * 90);
    
    const arriveMinutes = departMinute + journeyLength;
    const arriveHour = (departHour + Math.floor(arriveMinutes / 60)) % 24;
    
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const statuses: ('on-time' | 'delayed' | 'cancelled')[] = ['on-time', 'on-time', 'on-time', 'delayed', 'cancelled'];
    
    trains.push({
      trainUid: `${operator.code}${String(departHour).padStart(2, '0')}${String(departMinute).padStart(2, '0')}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      runDate: date,
      serviceUid: `${date.replace(/-/g, '')}${operator.code}${i}`,
      atocCode: operator.code,
      atocName: operator.name,
      origin: fromStation,
      destination: toStation,
      departureTime: `${String(departHour).padStart(2, '0')}:${String(departMinute).padStart(2, '0')}`,
      arrivalTime: `${String(arriveHour).padStart(2, '0')}:${String(arriveMinutes % 60).padStart(2, '0')}`,
      platform: String(Math.floor(Math.random() * 12) + 1),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }

  return trains.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}
