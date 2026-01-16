
export interface OneMapRouteParams {
  start: string;
  end: string;
  routeType: 'pt' | 'walk' | 'drive' | 'cycle';
  mode?: 'TRANSIT' | 'BUS' | 'RAIL';
  maxWalkDistance?: number;
  numItineraries?: number;
  date?: string;
  time?: string;
}

// The OneMap JWT provided by the user
const API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMDk0OCwiZm9yZXZlciI6ZmFsc2UsImlzcyI6Ik9uZU1hcCIsImlhdCI6MTc2ODUzMjUwNiwibmJmIjoxNzY4NTMyNTA2LCJleHAiOjE3Njg3OTE3MDYsImp0aSI6ImI2OGM2NmE2LTQ2ZjgtNDIwOS1hMzQwLTk3MTE4NGZjYjczNSJ9.7MRhCZ-tyH_2g-ht_TGDA068fgJxAqRGqXQPGdxZEItVHep_CtrmiFnZTwSQGE96C-PyNtYH9wMy8_VrlRrgPnKuXBsG4G4gc9wLpqadOoCCayp9U4vSIeIvKn_H4RCrw0ez6dryKL0ojagOs6eCDRwNjE59zj2dryyAgfG4nyEAb11G5YrXXqV8ElaoDWYwE7GgQbVyCT7cLs0eUUNsHW1A1JOS9z_UWUjWYiw8WGnu6oI4F7Noqm_Zj2rprBhPTbvzwvG0FZd733u2CX-R5GQBXKcxc6YZukLchdzpaQijJRgbp2pBBw2f_LK0LuF4w-LZ2T83o2U1nGyz7eoQ-w";

/**
 * Searches for addresses in Singapore using OneMap Search API.
 */
export const searchOneMapAddress = async (query: string) => {
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Search service unavailable');
  return response.json();
};

/**
 * Fetches routing information. 
 * Note: For JWT tokens, OneMap usually expects the 'Authorization' header.
 */
export const fetchOneMapRoute = async (params: OneMapRouteParams) => {
  // Using the standard routing endpoint which is more compatible with JWTs
  const baseUrl = 'https://www.onemap.gov.sg/api/common/routing/route';
  const urlParams = new URLSearchParams({
    start: params.start,
    end: params.end,
    routeType: params.routeType,
  });

  if (params.mode) urlParams.append('mode', params.mode);
  if (params.maxWalkDistance) urlParams.append('maxWalkDistance', params.maxWalkDistance.toString());
  if (params.numItineraries) urlParams.append('numItineraries', params.numItineraries.toString());

  const response = await fetch(`${baseUrl}?${urlParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': API_KEY, // Standard JWT header for OneMap
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    const status = response.status;
    let detail = 'Routing failed';
    try {
      const errJson = await response.json();
      detail = errJson.error || errJson.message || detail;
    } catch {
      detail = await response.text() || detail;
    }
    
    if (status === 401 || status === 403) {
      throw new Error(`Auth Error (${status}): Check if the JWT token is expired or invalid.`);
    }
    throw new Error(`OneMap ${status}: ${detail}`);
  }

  return response.json();
};
