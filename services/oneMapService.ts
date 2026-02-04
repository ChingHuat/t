
import { JourneyResponse, JourneyStep } from '../types';

const BASE_URL = "https://bus.pingthecloud.xyz";
const BACKEND_API_KEY = "sgbus-jacky-2026";

export interface JourneyParams {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  transport?: 'bus' | 'mrt' | 'transit';
}

export interface JourneyResult {
  data: JourneyResponse;
  debug: {
    url: string;
    method: string;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
    status: number;
    statusText: string;
    timestamp: string;
  };
}

export class BackendError extends Error {
  status?: number;
  statusText?: string;
  payload?: any;
  debug?: any;

  constructor(message: string, status?: number, statusText?: string, payload?: any, debug?: any) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.statusText = statusText;
    this.payload = payload;
    this.debug = debug;
  }
}

/**
 * Fetches multiple route options from the backend.
 */
export const fetchBackendJourney = async (params: JourneyParams): Promise<JourneyResult> => {
  const query = new URLSearchParams({
    fromLat: params.fromLat.toString(),
    fromLng: params.fromLng.toString(),
    toLat: params.toLat.toString(),
    toLng: params.toLng.toString(),
    transport: params.transport || 'transit'
  });

  const url = `${BASE_URL}/journey-onemap?${query.toString()}`;
  
  const requestHeaders = {
    'Accept': 'application/json',
    'x-api-key': BACKEND_API_KEY
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      mode: 'cors'
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const debugInfo = {
      url,
      method: 'GET',
      requestHeaders,
      responseHeaders,
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    };

    let responsePayload: any;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      responsePayload = await response.json().catch(() => ({}));
    } else {
      responsePayload = await response.text().catch(() => "Unable to read response body");
    }

    if (!response.ok) {
      throw new BackendError(
        `Backend returned ${response.status}`, 
        response.status, 
        response.statusText, 
        responsePayload, 
        debugInfo
      );
    }

    // Mapping logic to find the array of routes/itineraries
    let items: any[] = [];

    if (Array.isArray(responsePayload)) {
      items = responsePayload;
    } else if (responsePayload.routes && Array.isArray(responsePayload.routes)) {
      items = responsePayload.routes;
    } else if (responsePayload.itineraries && Array.isArray(responsePayload.itineraries)) {
      items = responsePayload.itineraries;
    } else if (responsePayload.plan?.itineraries && Array.isArray(responsePayload.plan.itineraries)) {
      items = responsePayload.plan.itineraries;
    } else if (responsePayload.data && Array.isArray(responsePayload.data)) {
      items = responsePayload.data;
    }

    // ENHANCEMENT: Transform items and capture stop codes
    const mappedItems = items.map(itinerary => ({
      ...itinerary,
      steps: (itinerary.steps || itinerary.legs || []).map((step: any) => {
        // Aggressively capture stop codes from the new backend format
        const fromCode = step.fromBusStopCode || step.fromCode || step.stopCode || step.fromStopId;
        const toCode = step.toBusStopCode || step.toCode || step.endStopCode;
        
        return {
          ...step,
          type: (['SUBWAY', 'RAIL', 'TRAM', 'METRO', 'MRT'].includes(step.type?.toUpperCase())) ? 'MRT' : step.type,
          fromBusStopCode: fromCode ? String(fromCode).match(/\d{5}/)?.[0] : undefined,
          toBusStopCode: toCode ? String(toCode).match(/\d{5}/)?.[0] : undefined
        } as JourneyStep;
      })
    }));

    return { 
      data: { itineraries: mappedItems } as JourneyResponse, 
      debug: debugInfo 
    };

  } catch (err: any) {
    if (err instanceof BackendError) throw err;
    throw new BackendError(
      err.message || "Network connection failed",
      0,
      "NetworkError",
      null,
      { url, timestamp: new Date().toISOString(), error: err.message }
    );
  }
};
