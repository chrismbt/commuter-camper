// Common UK railway stations for autocomplete
export const ukStations = [
  { code: 'PAD', name: 'London Paddington' },
  { code: 'KGX', name: 'London Kings Cross' },
  { code: 'EUS', name: 'London Euston' },
  { code: 'VIC', name: 'London Victoria' },
  { code: 'WAT', name: 'London Waterloo' },
  { code: 'STP', name: 'London St Pancras' },
  { code: 'LBG', name: 'London Bridge' },
  { code: 'CHX', name: 'London Charing Cross' },
  { code: 'FST', name: 'London Fenchurch Street' },
  { code: 'MYB', name: 'London Marylebone' },
  { code: 'BHM', name: 'Birmingham New Street' },
  { code: 'MAN', name: 'Manchester Piccadilly' },
  { code: 'MCO', name: 'Manchester Oxford Road' },
  { code: 'LIV', name: 'Liverpool Lime Street' },
  { code: 'LDS', name: 'Leeds' },
  { code: 'SHF', name: 'Sheffield' },
  { code: 'BRI', name: 'Bristol Temple Meads' },
  { code: 'NCL', name: 'Newcastle' },
  { code: 'EDB', name: 'Edinburgh Waverley' },
  { code: 'GLC', name: 'Glasgow Central' },
  { code: 'GLQ', name: 'Glasgow Queen Street' },
  { code: 'CDF', name: 'Cardiff Central' },
  { code: 'RDG', name: 'Reading' },
  { code: 'OXF', name: 'Oxford' },
  { code: 'CBG', name: 'Cambridge' },
  { code: 'NRW', name: 'Norwich' },
  { code: 'BHI', name: 'Brighton' },
  { code: 'SOT', name: 'Southampton Central' },
  { code: 'PMH', name: 'Portsmouth Harbour' },
  { code: 'EXD', name: 'Exeter St Davids' },
  { code: 'PLY', name: 'Plymouth' },
  { code: 'PNZ', name: 'Penzance' },
  { code: 'YRK', name: 'York' },
  { code: 'NOT', name: 'Nottingham' },
  { code: 'LEI', name: 'Leicester' },
  { code: 'COV', name: 'Coventry' },
  { code: 'MKC', name: 'Milton Keynes Central' },
  { code: 'SWI', name: 'Swindon' },
  { code: 'BTH', name: 'Bath Spa' },
  { code: 'CHM', name: 'Cheltenham Spa' },
];

export function searchStations(query: string): typeof ukStations {
  const lowerQuery = query.toLowerCase();
  return ukStations.filter(
    (station) =>
      station.name.toLowerCase().includes(lowerQuery) ||
      station.code.toLowerCase().includes(lowerQuery)
  );
}
