
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

/**
 * Fetches routing information from OneMap Public API.
 * 
 * API rules:
 * - Base URL: https://www.onemap.gov.sg/api/public/routingsvc/route
 * - Method: GET
 * - Auth: X-Api-Key header
 */
export const fetchOneMapRoute = async (params: OneMapRouteParams) => {
  const baseUrl = 'https://www.onemap.gov.sg/api/public/routingsvc/route';
  const urlParams = new URLSearchParams({
    start: params.start,
    end: params.end,
    routeType: params.routeType,
  });

  if (params.mode) urlParams.append('mode', params.mode);
  if (params.maxWalkDistance) urlParams.append('maxWalkDistance', params.maxWalkDistance.toString());
  if (params.numItineraries) urlParams.append('numItineraries', params.numItineraries.toString());
  if (params.date) urlParams.append('date', params.date);
  if (params.time) urlParams.append('time', params.time);

  // OneMap API Key provided by the user
  const apiKey = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMDk0OCwiZm9yZXZlciI6ZmFsc2UsImlzcyI6Ik9uZU1hcCIsImlhdCI6MTc2ODUzMjUwNiwibmJmIjoxNzY4NTMyNTA2LCJleHAiOjE3Njg3OTE3MDYsImp0aSI6ImI2OGM2NmE2LTQ2ZjgtNDIwOS1hMzQwLTk3MTE4NGZjYjczNSJ9.7MRhCZ-tyH_2g-ht_TGDA068fgJxAqRGqXQPGdxZEItVHep_CtrmiFnZTwSQGE96C-PyNtYH9wMy8_VrlRrgPnKuXBsG4G4gc9wLpqadOoCCayp9U4vSIeIvKn_H4RCrw0ez6dryKL0ojagOs6eCDRwNjE59zj2dryyAgfG4nyEAb11G5YrXXqV8ElaoDWYwE7GgQbVyCT7cLs0eUUNsHW1A1JOS9z_UWUjWYiw8WGnu6oI4F7Noqm_Zj2rprBhPTbvzwvG0FZd733u2CX-R5GQBXKcxc6YZukLchdzpaQijJRgbp2pBBw2f_LK0LuF4w-LZ2T83o2U1nGyz7eoQ-w";
  
  const response = await fetch(`${baseUrl}?${urlParams.toString()}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('OneMap API Authentication failed. The provided token may have expired.');
    }
    const errText = await response.text();
    throw new Error(`OneMap Error (${response.status}): ${errText || 'Routing failed'}`);
  }

  return response.json();
};
