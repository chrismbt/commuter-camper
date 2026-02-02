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
}

function parseHtmlToTrains(html: string, fromStation: string, toStation: string, date: string): TrainService[] {
  const trains: TrainService[] = [];
  
  // Match service links with pattern /service/gb-nr:UID/DATE
  const serviceRegex = /<a[^>]*href="\/service\/gb-nr:([A-Z0-9]+)\/(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/a>/gi;
  
  let match;
  while ((match = serviceRegex.exec(html)) !== null) {
    const uid = match[1];
    const runDate = match[2];
    const linkContent = match[3];
    
    // Extract time - look for HH:MM pattern
    const timeMatch = linkContent.match(/(\d{2}):(\d{2})/);
    if (!timeMatch) continue;
    
    const departureTime = `${timeMatch[1]}:${timeMatch[2]}`;
    
    // Get the full service row context
    const rowStart = html.lastIndexOf('<div class="service', match.index);
    const rowEnd = html.indexOf('</div>', match.index + match[0].length);
    const rowContext = rowStart > -1 && rowEnd > -1 ? html.substring(rowStart, rowEnd + 6) : '';
    
    // Try to extract destination from the row
    const destMatch = rowContext.match(/class="[^"]*destination[^"]*"[^>]*>([^<]+)</i) ||
                      rowContext.match(/>([A-Z][a-z]+(?: [A-Z][a-z]+)*)</);
    const destination = destMatch ? destMatch[1].trim() : toStation;
    
    // Extract operator
    const operatorMatch = rowContext.match(/class="[^"]*toc[^"]*"[^>]*>([^<]+)</i) ||
                          rowContext.match(/title="([^"]+)"/);
    const operatorName = operatorMatch ? operatorMatch[1].trim() : 'Unknown';
    
    // Extract platform if available
    const platformMatch = rowContext.match(/[Pp]lat(?:form)?\s*(\d+[a-zA-Z]?)/);
    const platform = platformMatch ? platformMatch[1] : undefined;
    
    // Extract status
    let status: 'on-time' | 'delayed' | 'cancelled' | undefined;
    if (rowContext.toLowerCase().includes('cancelled') || rowContext.toLowerCase().includes('cancel')) {
      status = 'cancelled';
    } else if (rowContext.toLowerCase().includes('late') || rowContext.toLowerCase().includes('delayed')) {
      status = 'delayed';
    } else if (rowContext.toLowerCase().includes('on time') || rowContext.toLowerCase().includes('rt')) {
      status = 'on-time';
    }
    
    // Calculate approximate arrival time (we don't have it from the list view)
    const arrivalTime = departureTime; // Will be updated when we have detailed view
    
    // Get ATOC code from operator name
    const atocCode = getAtocCode(operatorName);
    
    trains.push({
      trainUid: uid,
      runDate,
      serviceUid: `${runDate.replace(/-/g, '')}${uid}`,
      atocCode,
      atocName: operatorName,
      origin: fromStation,
      destination,
      departureTime,
      arrivalTime,
      platform,
      status,
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

function getAtocCode(operatorName: string): string {
  const mapping: Record<string, string> = {
    'Great Western Railway': 'GW',
    'South Western Railway': 'SW',
    'Southeastern': 'SE',
    'Thameslink': 'TL',
    'Avanti West Coast': 'AW',
    'CrossCountry': 'XC',
    'Northern': 'NT',
    'East Midlands Railway': 'EM',
    'LNER': 'GR',
    'ScotRail': 'SR',
    'TransPennine Express': 'TP',
    'Greater Anglia': 'LE',
    'c2c': 'CC',
    'Chiltern Railways': 'CH',
    'West Midlands Trains': 'LM',
    'London Overground': 'LO',
    'Elizabeth line': 'XR',
    'Merseyrail': 'ME',
    'Southern': 'SN',
    'Gatwick Express': 'GX',
    'GTR': 'TL',
  };
  
  for (const [name, code] of Object.entries(mapping)) {
    if (operatorName.toLowerCase().includes(name.toLowerCase())) {
      return code;
    }
  }
  return 'XX';
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
    
    // Build the RTT URL
    const url = `https://www.realtimetrains.co.uk/search/simple/gb-nr:${fromCrs}/to/gb-nr:${toCrs}/${date}/${timeFormatted}`;
    
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
