
export interface OneMapRouteParams {
  start: string;
  end: string;
  routeType: 'pt' | 'walk' | 'cycle';
  mode?: 'TRANSIT' | 'BUS' | 'RAIL';
  maxWalkDistance?: number;
}

const API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMDk0OCwiZm9yZXZlciI6ZmFsc2UsImlzcyI6Ik9uZU1hcCIsImlhdCI6MTc2ODUzMjUwNiwibmJmIjoxNzY4NTMyNTA2LCJleHAiOjE3Njg3OTE3MDYsImp0aSI6ImI2OGM2NmE2LTQ2ZjgtNDIwOS1hMzQwLTk3MTE4NGZjYjczNSJ9.7MRhCZ-tyH_2g-ht_TGDA068fgJxAqRGqXQPGdxZEItVHep_CtrmiFnZTwSQGE96C-PyNtYH9wMy8_VrlRrgPnKuXBsG4G4gc9wLpqadOoCCayp9U4vSIeIvKn_H4RCrw0ez6dryKL0ojagOs6eCDRwNjE59zj2dryyAgfG4nyEAb11G5YrXXqV8ElaoDWYwE7GgQbVyCT7cLs0eUUNsHW1A1JOS9z_UWUjWYiw8WGnu6oI4F7Noqm_Zj2rprBhPTbvzwvG0FZd733u2CX-R5GQBXKcxc6YZukLchdzpaQijJRgbp2pBBw2f_LK0LuF4w-LZ2T83o2U1nGyz7eoQ-w";

export const searchOneMapAddress = async (query: string) => {
  const targetUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Address search failed.');
  return response.json();
};

const getSingaporeTime = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  return {
    date: `${getPart('month')}-${getPart('day')}-${getPart('year')}`,
    time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
    hour: parseInt(getPart('hour'), 10)
  };
};

const normalizeCoords = (coordStr: string) => {
  try {
    const [lat, lng] = coordStr.split(',').map(s => parseFloat(s.trim()));
    if (isNaN(lat) || isNaN(lng)) return coordStr.trim();
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  } catch {
    return coordStr.trim();
  }
};

export const fetchOneMapRoute = async (params: OneMapRouteParams): Promise<any> => {
  const baseUrl = 'https://www.onemap.gov.sg/api/public/routingsvc/route';
  const sgTime = getSingaporeTime();
  
  const start = normalizeCoords(params.start);
  const end = normalizeCoords(params.end);

  if (start === end) {
    return {
      actualRouteType: 'walk',
      itineraries: [{
        duration: 0,
        walkDistance: 0,
        legs: [{ mode: 'WALK', from: { name: 'Origin' }, to: { name: 'Destination' }, duration: 0 }]
      }]
    };
  }

  const queryParts = [`start=${start}`, `end=${end}`, `routeType=${params.routeType}`];
  
  if (params.routeType === 'pt') {
    queryParts.push(`date=${sgTime.date}`);
    queryParts.push(`time=${sgTime.time}`);
    queryParts.push(`mode=${params.mode || 'TRANSIT'}`);
    queryParts.push(`maxWalkDistance=${params.maxWalkDistance || 1000}`); 
    queryParts.push(`numItineraries=3`);
  }

  const targetUrl = `${baseUrl}?${queryParts.join('&')}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' },
    });

    const data = await response.json().catch(() => ({ error: "Failed to parse API response.", rawStatus: response.status }));
    
    if (!response.ok) {
        return { data, error: `OneMap API Error: Status ${response.status}`, url: targetUrl };
    }
    
    const hasNoItineraries = !data.itineraries || data.itineraries.length === 0;
    
    if (hasNoItineraries) {
      return { data, error: data.error || data.message || "No itineraries found for this route.", url: targetUrl };
    }

    return { data, url: targetUrl };
  } catch (err: any) {
    return { error: `Network error or failed request: ${err.message}`, url: targetUrl };
  }
};
