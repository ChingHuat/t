
import { 
  BusStopArrivalResponse, 
  WeatherResponse, 
  AlertRequest, 
  CancelAlertRequest, 
  AlertResponse, 
  AlertStatusResponse, 
  ScheduleAlertRequest, 
  ScheduleAlertResponse, 
  ScheduledAlertStatusResponse,
  CancelScheduledAlertRequest
} from '../types';

const BASE_URL = "https://bus.pingthecloud.xyz";
const TIMEOUT_MS = 10000;
const BACKEND_API_KEY = "sgbus-jacky-2026";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const secureFetch = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'x-api-key': BACKEND_API_KEY,
        ...options.headers,
      },
    });
    clearTimeout(id);
    
    if (!response.ok) {
      let errorData = null;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch (e) {
        errorData = "Could not parse error body";
      }
      
      if (response.status === 404) {
        throw new ApiError(`Resource not found (404).`, 404, errorData);
      }
      
      if (response.status === 400) {
        const detail = typeof errorData === 'object' ? (errorData.message || JSON.stringify(errorData)) : errorData;
        throw new ApiError(detail || "Invalid Request (400)", 400, errorData);
      }
      
      throw new ApiError(`Request failed with status ${response.status}`, response.status, errorData);
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. The server is taking too long to respond.');
    }
    throw error;
  }
};

export const fetchBusArrival = async (busStopCode: string): Promise<BusStopArrivalResponse> => {
  const response = await secureFetch(`${BASE_URL}/bus/${busStopCode}`);
  return response.json();
};

export const searchBusStops = async (query: string) => {
  const response = await secureFetch(`${BASE_URL}/bus-stops/search?q=${encodeURIComponent(query)}`);
  return response.json();
};

export const searchAddresses = async (query: string) => {
  const response = await secureFetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
  return response.json();
};

export const fetchWeather = async (busStopCode: string): Promise<WeatherResponse> => {
  const response = await secureFetch(`${BASE_URL}/weather/rain/${busStopCode}`);
  return response.json();
};

export const registerAlert = async (data: AlertRequest): Promise<AlertResponse> => {
  const response = await secureFetch(`${BASE_URL}/register-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: Number(data.chatId),
      busStopCode: Number(data.busStopCode),
      serviceNo: String(data.serviceNo),
      threshold: Number(data.threshold)
    }),
  });
  return response.json();
};

export const scheduleAlert = async (data: ScheduleAlertRequest): Promise<ScheduleAlertResponse> => {
  const response = await secureFetch(`${BASE_URL}/schedule-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: Number(data.chatId),
      busStopCode: Number(data.busStopCode),
      serviceNo: String(data.serviceNo),
      targetTime: data.targetTime
    }),
  });
  return response.json();
};

export const cancelAlert = async (data: CancelAlertRequest): Promise<void> => {
  await secureFetch(`${BASE_URL}/alerts/cancel`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: Number(data.chatId),
      alertId: data.alertId
    }),
  });
};

export const cancelScheduledAlert = async (data: CancelScheduledAlertRequest): Promise<void> => {
  await secureFetch(`${BASE_URL}/schedule-alert/cancel`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: Number(data.chatId),
      scheduledAlertId: data.scheduledAlertId
    }),
  });
};

export const triggerCommute = async (data: { 
  chatId: string; 
  stopCode: string; 
  serviceNo: string | string[]; 
  walkTime: number; 
  mode: 'home' | 'back' 
}): Promise<any> => {
  const response = await secureFetch(`${BASE_URL}/api/commute-trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: Number(data.chatId),
      stopCode: String(data.stopCode),
      serviceNo: data.serviceNo,
      walkTime: Number(data.walkTime),
      mode: String(data.mode)
    }),
  });
  return response.json();
};

export const cancelCommute = async (data: { 
  chatId: string; 
  stopCode: string;
  serviceNo: string;
  mode: 'home' | 'back' 
}): Promise<any> => {
  const response = await secureFetch(`${BASE_URL}/api/commute-cancel`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: Number(data.chatId),
      stopCode: String(data.stopCode),
      serviceNo: String(data.serviceNo),
      mode: String(data.mode)
    }),
  });
  return response.json();
};

export const fetchAlertStatus = async (chatId: string): Promise<AlertStatusResponse> => {
  const response = await secureFetch(`${BASE_URL}/alerts/status?chatId=${chatId}`);
  return response.json();
};

export const fetchScheduledAlertStatus = async (chatId: string): Promise<ScheduledAlertStatusResponse> => {
  const response = await secureFetch(`${BASE_URL}/schedule-alerts/status?chatId=${chatId}`);
  return response.json();
};

export const checkApiStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/health`, { 
      cache: 'no-cache',
      headers: { 'x-api-key': BACKEND_API_KEY }
    });
    return response.ok;
  } catch {
    return false;
  }
};
