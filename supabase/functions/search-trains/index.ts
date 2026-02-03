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
    
    // Find the destination station in the location list and get its arrival time
    // Look for pattern: <div class="location"><a...>Station Name</a></div>...<div class="gbtt"><div class="arr">HHMM</div>
    // The structure is: location row with station name, then arrival time in gbtt arr div
    
    // First, find all location rows
    const destinationLower = destinationStation.toLowerCase();
    
    // Match location rows - each row contains location and times
    const rowRegex = /<div[^>]*class="call[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="call|<\/div>\s*<\/div>)/gi;
    
    // Simpler approach: find the station name and look for nearby arrival time
    // Pattern: station name followed by arrival time in gbtt arr
    const stationRegex = new RegExp(
      `<div[^>]*class="location"[^>]*>[^<]*<a[^>]*>([^<]*${destinationLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*)<\\/a>`,
      'i'
    );
    
    const stationMatch = html.match(stationRegex);
    if (!stationMatch) {
      // Try a broader match for the destination
      const broadRegex = new RegExp(destinationLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!broadRegex.test(html)) return null;
    }
    
    // Find the section containing this station and extract the arrival time
    // Look for the calling point entry with this station
    const callingPointRegex = new RegExp(
      `<div[^>]*class="call[^"]*"[^>]*>[\\s\\S]*?${destinationLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?<div[^>]*class="gbtt"[^>]*>[\\s\\S]*?<div[^>]*class="arr"[^>]*>(\\d{4})<\\/div>`,
      'i'
    );
    
    const arrivalMatch = html.match(callingPointRegex);
    if (arrivalMatch) {
      const time = arrivalMatch[1];
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    
    // Alternative: try to find GBTT arrival time near the destination name
    // The service page shows times in format: <div class="gbtt"><div class="arr">1045</div><div class="dep"></div></div>
    const altRegex = new RegExp(
      `${destinationLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,500}<div[^>]*class="arr"[^>]*>(\\d{4})<\\/div>`,
      'i'
    );
    
    const altMatch = html.match(altRegex);
    if (altMatch) {
      const time = altMatch[1];
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    
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

function extractOriginStationName(html: string): string {
  // Extract from header: <h3>London Paddington <small>around 0900 on 04/02/2026</small></h3>
  const headerMatch = html.match(/<h3>\s*([^<]+?)\s*<small>/i);
  return headerMatch ? headerMatch[1].trim() : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fromCrs, toCrs, date, time } = await req.json();

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
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch from RTT: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('Received HTML length:', html.length);
    
    // Extract origin station name from the page header
    const originStationName = extractOriginStationName(html);
    console.log('Origin station:', originStationName);
    
    // Parse the HTML to extract train services
    const parsedTrains = parseSearchResultsToTrains(html);
    console.log('Parsed trains:', parsedTrains.length);

    // Fetch arrival times for each train (in parallel, limit to first 10 for performance)
    const trainsToFetch = parsedTrains.slice(0, 10);
    const arrivalPromises = trainsToFetch.map(train => 
      fetchArrivalTime(train.uid, train.runDate, train.destination)
    );
    
    const arrivalTimes = await Promise.all(arrivalPromises);
    
    // Build the final train services with arrival times
    const trains: TrainService[] = trainsToFetch.map((train, index) => ({
      trainUid: train.uid,
      runDate: train.runDate,
      serviceUid: `${train.runDate.replace(/-/g, '')}${train.uid}`,
      atocCode: train.atocCode,
      atocName: getOperatorName(train.atocCode),
      origin: train.origin === 'Origin' ? originStationName : train.origin,
      destination: train.destination,
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