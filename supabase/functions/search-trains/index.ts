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

function parseHtmlToTrains(html: string, fromStation: string, toStation: string, date: string): TrainService[] {
  const trains: TrainService[] = [];
  
  // Match service links with pattern /service/gb-nr:UID/DATE/detailed
  // Example: <a class="service " href="https://www.realtimetrains.co.uk/service/gb-nr:L76080/2026-02-04/detailed">
  const serviceRegex = /<a[^>]*class="service[^"]*"[^>]*href="[^"]*\/service\/gb-nr:([A-Z0-9]+)\/(\d{4}-\d{2}-\d{2})[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  
  let match;
  while ((match = serviceRegex.exec(html)) !== null) {
    const uid = match[1];
    const runDate = match[2];
    const serviceContent = match[3];
    
    // Extract departure time from <div class="time plan d gbtt">0840</div>
    const depTimeMatch = serviceContent.match(/<div[^>]*class="time plan d[^"]*"[^>]*>(\d{4})<\/div>/i);
    if (!depTimeMatch) continue;
    
    const depTime = depTimeMatch[1];
    const departureTime = `${depTime.substring(0, 2)}:${depTime.substring(2, 4)}`;
    
    // Extract arrival time from <div class="time plan a gbtt">0839</div>
    const arrTimeMatch = serviceContent.match(/<div[^>]*class="time plan a[^"]*"[^>]*>(\d{4})<\/div>/i);
    const arrTime = arrTimeMatch ? arrTimeMatch[1] : depTime;
    const arrivalTime = `${arrTime.substring(0, 2)}:${arrTime.substring(2, 4)}`;
    
    // Extract origin from <div class="location o"><span>London Waterloo</span></div>
    const originMatch = serviceContent.match(/<div[^>]*class="location o[^"]*"[^>]*><span>([^<]+)<\/span><\/div>/i);
    const origin = originMatch ? originMatch[1].trim() : fromStation;
    
    // Extract destination from <div class="location d"><span>London Waterloo</span></div>
    const destMatch = serviceContent.match(/<div[^>]*class="location d[^"]*"[^>]*><span>([^<]+)<\/span><\/div>/i);
    const destination = destMatch ? destMatch[1].trim() : toStation;
    
    // Extract platform from <div class="platform c exp">10</div>
    const platformMatch = serviceContent.match(/<div[^>]*class="platform[^"]*"[^>]*>(\d+[a-zA-Z]?)<\/div>/i);
    const platform = platformMatch ? platformMatch[1] : undefined;
    
    // Extract TOC from <div class="toc">SW</div>
    const tocMatch = serviceContent.match(/<div[^>]*class="toc"[^>]*>([^<]+)<\/div>/i);
    const atocCode = tocMatch ? tocMatch[1].trim() : 'XX';
    
    // Extract train ID from <div class="tid">2O11</div>
    const tidMatch = serviceContent.match(/<div[^>]*class="tid"[^>]*>([^<]+)<\/div>/i);
    const trainId = tidMatch ? tidMatch[1].trim() : '';
    
    // Get operator name from ATOC code
    const atocName = getOperatorName(atocCode);
    
    trains.push({
      trainUid: uid,
      runDate,
      serviceUid: `${runDate.replace(/-/g, '')}${uid}`,
      atocCode,
      atocName,
      origin,
      destination,
      departureTime,
      arrivalTime,
      platform,
      trainId,
    });
  }
  
  // Deduplicate by UID
  const seen = new Set<string>();
  const uniqueTrains = trains.filter(t => {
    if (seen.has(t.trainUid)) return false;
    seen.add(t.trainUid);
    return true;
  });
  
  return uniqueTrains.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
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
    
    // Parse the HTML to extract train services
    const trains = parseHtmlToTrains(html, fromCrs, toCrs, date);
    console.log('Parsed trains:', trains.length);

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
