const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TrainService {
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
  trainId?: string;
}

interface ParsedTrain {
  uid: string;
  runDate: string;
  departureTime: string;
  origin: string;
  destination: string;
  platform?: string;
  atocCode: string;
  trainId?: string;
}

function parseSearchResultsToTrains(html: string): ParsedTrain[] {
  const trains: ParsedTrain[] = [];
  
  // Match service links with pattern /service/gb-nr:UID/DATE/detailed
  const serviceRegex = /<a[^>]*class="service[^"]*"[^>]*href="[^"]*\/service\/gb-nr:([A-Z0-9]+)\/(\d{4}-\d{2}-\d{2})[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  
  let match;
  while ((match = serviceRegex.exec(html)) !== null) {
    const uid = match[1];
    const runDate = match[2];
    const serviceContent = match[3];
    
    // Extract departure time from <div class="time plan d gbtt">0840</div>
    const depTimeMatch = serviceContent.match(/<div[^>]*class="time plan d[^"]*gbtt[^"]*"[^>]*>(\d{4})<\/div>/i);
    if (!depTimeMatch) continue;
    
    const depTime = depTimeMatch[1];
    const departureTime = `${depTime.substring(0, 2)}:${depTime.substring(2, 4)}`;
    
    // Extract origin - check for "Starts here" or actual location
    let origin = '';
    const startsHereMatch = serviceContent.match(/<div[^>]*class="location o[^"]*"[^>]*>[^<]*Starts here[^<]*<\/div>/i);
    if (startsHereMatch) {
      // Origin is the searched station - we'll get it from the page header
      origin = 'Origin';
    } else {
      const originMatch = serviceContent.match(/<div[^>]*class="location o[^"]*"[^>]*><span>([^<]+)<\/span><\/div>/i);
      origin = originMatch ? originMatch[1].trim() : '';
    }
    
    // Extract destination from <div class="location d"><span>Bristol Temple Meads</span></div>
    const destMatch = serviceContent.match(/<div[^>]*class="location d[^"]*"[^>]*><span>([^<]+)<\/span><\/div>/i);
    const destination = destMatch ? destMatch[1].trim() : '';
    
    // Extract platform from <div class="platform c exp">10</div>
    const platformMatch = serviceContent.match(/<div[^>]*class="platform[^"]*"[^>]*>(\d+[a-zA-Z]?)<\/div>/i);
    const platform = platformMatch ? platformMatch[1] : undefined;
    
    // Extract TOC from <div class="toc">SW</div>
    const tocMatch = serviceContent.match(/<div[^>]*class="toc"[^>]*>([^<]+)<\/div>/i);
    const atocCode = tocMatch ? tocMatch[1].trim() : 'XX';
    
    // Extract train ID from <div class="tid">2O11</div>
    const tidMatch = serviceContent.match(/<div[^>]*class="tid"[^>]*>([^<]+)<\/div>/i);
    const trainId = tidMatch ? tidMatch[1].trim() : '';
    
    trains.push({
      uid,
      runDate,
      departureTime,
      origin,
      destination,
      platform,
      atocCode,
      trainId,
    });
  }
  
  // Deduplicate by UID
  const seen = new Set<string>();
  return trains.filter(t => {
    if (seen.has(t.uid)) return false;
    seen.add(t.uid);
    return true;
  });
}

async function fetchArrivalTime(uid: string, runDate: string, destinationStation: string): Promise<string | null> {
  try {
    const url = `https://www.realtimetrains.co.uk/service/gb-nr:${uid}/${runDate}/detailed`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // The RTT service page has calling points in a specific structure
    // Each calling point is in a div with class "call" or similar
    // We need to find the specific row for our destination station
    
    const destinationLower = destinationStation.toLowerCase().trim();
    
    // Split HTML into calling point sections
    // Look for pattern where station name is in a location div followed by times in gbtt div
    // Structure: <div class="location">...<a>Station Name</a>...</div>...<div class="gbtt"><div class="arr">HHMM</div>
    
    // Find all calling points by splitting on the call div pattern
    const callingPoints = html.split(/<div[^>]*class="[^"]*\bcall\b[^"]*"[^>]*>/i);
    
    for (const point of callingPoints) {
      // Check if this calling point contains our destination station
      // Look for the station name in a link
      const stationMatch = point.match(/<a[^>]*>([^<]+)<\/a>/i);
      if (!stationMatch) continue;
      
      const stationName = stationMatch[1].toLowerCase().trim();
      
      // Check if this station matches our destination (partial match for flexibility)
      if (!stationName.includes(destinationLower) && !destinationLower.includes(stationName)) {
        continue;
      }
      
      // Found our station! Now extract the arrival time
      // Look for the GBTT arrival time: <div class="arr">HHMM</div>
      // We need to be careful to get the GBTT (booked) time, not the actual time
      
      // Pattern 1: <div class="gbtt">...<div class="arr">1234</div>
      const gbttMatch = point.match(/<div[^>]*class="[^"]*\bgbtt\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
      if (gbttMatch) {
        const gbttContent = gbttMatch[1];
        const arrMatch = gbttContent.match(/<div[^>]*class="[^"]*\barr\b[^"]*"[^>]*>(\d{4})<\/div>/i);
        if (arrMatch) {
          const time = arrMatch[1];
          console.log(`Found arrival time ${time} for ${destinationStation} on service ${uid}`);
          return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
        }
      }
      
      // Pattern 2: Direct arr div in the calling point
      const directArrMatch = point.match(/<div[^>]*class="[^"]*\barr\b[^"]*\bgbtt\b[^"]*"[^>]*>(\d{4})<\/div>/i);
      if (directArrMatch) {
        const time = directArrMatch[1];
        console.log(`Found arrival time (alt) ${time} for ${destinationStation} on service ${uid}`);
        return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
      }
      
      // Pattern 3: arr with plan class
      const planArrMatch = point.match(/<div[^>]*class="[^"]*\btime\b[^"]*\bplan\b[^"]*\ba\b[^"]*"[^>]*>(\d{4})<\/div>/i);
      if (planArrMatch) {
        const time = planArrMatch[1];
        console.log(`Found arrival time (plan) ${time} for ${destinationStation} on service ${uid}`);
        return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
      }
    }
    
    console.log(`Could not find arrival time for ${destinationStation} on service ${uid}`);
    return null;
  } catch (error) {
    console.error(`Error fetching arrival time for ${uid}:`, error);
    return null;
  }
}

function getOperatorName(atocCode: string): string {
  const mapping: Record<string, string> = {
    'GW': 'Great Western Railway',
    'SW': 'South Western Railway',
    'SE': 'Southeastern',
    'TL': 'Thameslink',
    'VT': 'Avanti West Coast',
    'XC': 'CrossCountry',
    'NT': 'Northern',
    'EM': 'East Midlands Railway',
    'GR': 'LNER',
    'SR': 'ScotRail',
    'TP': 'TransPennine Express',
    'LE': 'Greater Anglia',
    'CC': 'c2c',
    'CH': 'Chiltern Railways',
    'LM': 'West Midlands Trains',
    'LO': 'London Overground',
    'XR': 'Elizabeth line',
    'ME': 'Merseyrail',
    'SN': 'Southern',
    'GX': 'Gatwick Express',
    'AW': 'Transport for Wales',
    'HT': 'Hull Trains',
    'GC': 'Grand Central',
    'HX': 'Heathrow Express',
    'IL': 'Island Line',
    'LT': 'London Underground',
  };
  
  return mapping[atocCode] || atocCode;
}

function getStationNameFromCrs(crs: string): string {
  // Common UK station CRS to name mapping
  const mapping: Record<string, string> = {
    'PAD': 'London Paddington',
    'BRI': 'Bristol Temple Meads',
    'BPW': 'Bristol Parkway',
    'BTM': 'Bristol Temple Meads',
    'EUS': 'London Euston',
    'KGX': 'London Kings Cross',
    'VIC': 'London Victoria',
    'WAT': 'London Waterloo',
    'CHX': 'London Charing Cross',
    'LST': 'London Liverpool Street',
    'STP': 'London St Pancras',
    'MAN': 'Manchester Piccadilly',
    'MCV': 'Manchester Victoria',
    'BHM': 'Birmingham New Street',
    'LDS': 'Leeds',
    'EDB': 'Edinburgh Waverley',
    'GLC': 'Glasgow Central',
    'CLJ': 'Clapham Junction',
    'VXH': 'Vauxhall',
    'RDG': 'Reading',
    'OXF': 'Oxford',
    'CBG': 'Cambridge',
    'NCL': 'Newcastle',
    'YRK': 'York',
    'SHF': 'Sheffield',
    'NTG': 'Nottingham',
    'LIV': 'Liverpool Lime Street',
    'CRE': 'Crewe',
    'SOU': 'Southampton Central',
    'BHD': 'Brighton',
    'GTW': 'Gatwick Airport',
    'LTN': 'Luton Airport Parkway',
    'STN': 'Stansted Airport',
    'EXD': 'Exeter St Davids',
    'PLY': 'Plymouth',
    'PNZ': 'Penzance',
    'CDF': 'Cardiff Central',
    'SWA': 'Swansea',
    'NWP': 'Newport',
    'ABD': 'Aberdeen',
    'INV': 'Inverness',
  };
  
  return mapping[crs] || crs;
}

function extractOriginStationName(html: string): string {
  // Extract from header: <h3>London Paddington <small>around 0900 on 04/02/2026</small></h3>
  const headerMatch = html.match(/<h3>\s*([^<]+?)\s*<small>/i);
  return headerMatch ? headerMatch[1].trim() : '';
}

function extractDestinationStationName(html: string): string {
  // Extract destination from the search results page
  // Look for pattern in the page title or breadcrumb: "to Bristol Temple Meads"
  // Or from the search filter display
  const toMatch = html.match(/to\s+(?:gb-nr:)?([A-Z]{3})\s*<\/a>\s*<\/li>/i);
  if (toMatch) {
    // We found a CRS code, but we need the name
    // Look for the station name in a different pattern
  }
  
  // Try to find in the page structure - look for destination in filter or breadcrumb
  const destMatch = html.match(/<li[^>]*class="[^"]*dest[^"]*"[^>]*>([^<]+)<\/li>/i);
  if (destMatch) {
    return destMatch[1].trim();
  }
  
  // Try another pattern - the "to" link in navigation
  const toNavMatch = html.match(/class="to"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
  if (toNavMatch) {
    return toNavMatch[1].trim();
  }
  
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fromCrs, toCrs, date, time, fromName, toName } = await req.json();

    if (!fromCrs || !toCrs || !date || !time) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: fromCrs, toCrs, date, time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format time to HHMM
    const timeFormatted = time.replace(':', '');
    
    // Build the RTT URL - use detailed view which has better structure
    const url = `https://www.realtimetrains.co.uk/search/detailed/gb-nr:${fromCrs}/to/gb-nr:${toCrs}/${date}/${timeFormatted}`;
    
    console.log('Fetching RTT URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error('RTT fetch failed:', response.status, response.statusText);
      
      // Provide more helpful error messages based on status
      let errorMessage = `Failed to fetch from RTT: ${response.status}`;
      if (response.status === 400) {
        errorMessage = `No route found between ${fromCrs} and ${toCrs}. One or both station codes may be invalid, or there may be no direct services on this route.`;
      } else if (response.status === 404) {
        errorMessage = `Route not found. Please check the station codes are correct.`;
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('Received HTML length:', html.length);
    
    // Use station names from frontend if provided, otherwise extract/lookup
    let originStationName = fromName || extractOriginStationName(html);
    if (!originStationName) {
      originStationName = getStationNameFromCrs(fromCrs);
    }
    console.log('Origin station:', originStationName);
    
    // Parse the HTML to extract train services
    const parsedTrains = parseSearchResultsToTrains(html);
    console.log('Parsed trains:', parsedTrains.length);

    // Use destination name from frontend if provided, otherwise extract/lookup
    let destinationStationName = toName || extractDestinationStationName(html);
    if (!destinationStationName) {
      destinationStationName = getStationNameFromCrs(toCrs);
    }
    console.log('Destination station for arrival lookup:', destinationStationName);

    // Fetch arrival times for each train at the USER'S destination (not train terminus)
    const trainsToFetch = parsedTrains.slice(0, 10);
    const arrivalPromises = trainsToFetch.map(train => 
      fetchArrivalTime(train.uid, train.runDate, destinationStationName)
    );
    
    const arrivalTimes = await Promise.all(arrivalPromises);
    
    // Build the final train services with arrival times
    const trains: TrainService[] = trainsToFetch.map((train, index) => ({
      trainUid: train.uid,
      runDate: train.runDate,
      serviceUid: `${train.runDate.replace(/-/g, '')}${train.uid}`,
      atocCode: train.atocCode,
      atocName: getOperatorName(train.atocCode),
      // Ensure UI and saved legs reflect the user's searched leg,
      // not the train's full route origin/terminus.
      origin: originStationName,
      destination: destinationStationName,
      departureTime: train.departureTime,
      arrivalTime: arrivalTimes[index] || train.departureTime, // fallback to departure if not found
      platform: train.platform,
      trainId: train.trainId,
    }));
    
    // Sort by departure time
    trains.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    return new Response(
      JSON.stringify({ success: true, data: trains }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-trains:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});