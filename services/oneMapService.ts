
export interface OneMapRouteParams {
  start: string;
  end: string;
  routeType: 'pt' | 'walk' | 'cycle';
  mode?: 'TRANSIT' | 'BUS' | 'RAIL';
  maxWalkDistance?: number;
}

/**
 * Handles OneMap Authentication and Token Persistence
 */
const ONEMAP_AUTH_KEY = 'sg_bus_onemap_token';
const ONEMAP_EXPIRY_KEY = 'sg_bus_onemap_expiry';
const ONEMAP_CREDS_KEY = 'sg_bus_onemap_creds';

// Fallback token (Provided by user - used ONLY if login never attempted)
const FALLBACK_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMDk0OCwiZm9yZXZlciI6ZmFsc2UsImlzcyI6Ik9uZU1hcCIsImlhdCI6MTc2ODUzMjUwNiwibmJmIjoxNzY4NTMyNTA2LCJleHAiOjE3Njg3OTE3MDYsImp0aSI6ImI2OGM2NmE2LTQ2ZjgtNDIwOS1hMzQwLTk3MTE4NGZjYjczNSJ9.7MRhCZ-tyH_2g-ht_TGDA068fgJxAqRGqXQPGdxZEItVHep_CtrmiFnZTwSQGE96C-PyNtYH9wMy8_VrlRrgPnKuXBsG4G4gc9wLpqadOoCCayp9U4vSIeIvKn_H4RCrw0ez6dryKL0ojagOs6eCDRwNjE59zj2dryyAgfG4nyEAb11G5YrXXqV8ElaoDWYwE7GgQbVyCT7cLs0eUUNsHW1A1JOS9z_UWUjWYiw8WGnu6oI4F7Noqm_Zj2rprBhPTbvzwvG0FZd733u2CX-R5GQBXKcxc6YZukLchdzpaQijJRgbp2pBBw2f_LK0LuF4w-LZ2T83o2U1nGyz7eoQ-w";

/**
 * Authenticates with OneMap using credentials.
 * The correct endpoint for OneMap 2.0 is 'getToken'.
 * If you hit '/api/auth/post/login' or similar, the server returns 403 
 * "Missing Authentication Token" because it treats it as a protected data route.
 */
export const loginToOneMap = async (email: string, password: string): Promise<string> => {
  // Correct OneMap 2.0 Authentication Endpoint
  const targetUrl = 'https://www.onemap.gov.sg/api/auth/post/getToken';
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  let response;
  try {
    response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        password: password 
      })
    });
  } catch (netErr: any) {
    throw new Error(`Connection Error: ${netErr.message}. The CORS proxy may be down.`);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || 'Authentication Failed';
    // Stringify diagnostic info for the UI debugger
    throw new Error(`${errorMsg} | Raw: ${JSON.stringify({
      status: response.status,
      msg: errorMsg,
      server_response: data,
      attempted_url: targetUrl,
      method: 'POST'
    })}`);
  }

  if (!data?.access_token) {
    throw new Error(`Login succeeded but token was missing from response | Raw: ${JSON.stringify(data)}`);
  }

  const token = data.access_token;
  localStorage.setItem(ONEMAP_AUTH_KEY, token);
  // Tokens are valid for 72 hours. We set expiry to 70 hours for safety.
  const expiry = Date.now() + (70 * 60 * 60 * 1000);
  localStorage.setItem(ONEMAP_EXPIRY_KEY, expiry.toString());
  
  return token;
};

/**
 * Retrieves a valid token, refreshing if credentials exist
 */
const getValidToken = async (): Promise<string> => {
  const token = localStorage.getItem(ONEMAP_AUTH_KEY);
  const expiryStr = localStorage.getItem(ONEMAP_EXPIRY_KEY);
  const credsStr = localStorage.getItem(ONEMAP_CREDS_KEY);

  const now = Date.now();
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

  // Refresh logic: If expired or missing
  if (!token || now >= expiry) {
    if (credsStr) {
      try {
        const { email, password } = JSON.parse(credsStr);
        return await loginToOneMap(email, password);
      } catch (err) {
        console.error("Auto-renewal failed:", err);
        return token || FALLBACK_TOKEN;
      }
    }
    return token || FALLBACK_TOKEN;
  }

  return token;
};

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
    const token = await getValidToken();
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
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
