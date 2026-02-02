export interface TrainService {
  trainUid: string;
  runDate: string;
  serviceUid: string;
  atocCode: string;
  atocName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  platform?: string;
  status?: 'on-time' | 'delayed' | 'cancelled';
}

export interface JourneyLeg {
  id: string;
  trainUid: string;
  runDate: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  arrivalTime: string;
  operator?: string;
}

export interface Journey {
  id: string;
  createdAt: string;
  legs: JourneyLeg[];
}

export interface SearchParams {
  fromStation: string;
  toStation: string;
  departureTime: string;
  date: string;
}
