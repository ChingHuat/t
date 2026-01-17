
import { BusStopArrivalResponse, WeatherResponse, AlertRequest, CancelAlertRequest, AlertResponse, AlertStatusResponse } from '../types';

const BASE_URL = "https://bus.pingthecloud.xyz";
const TIMEOUT_MS = 10000;

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
        ...options.headers,
      },
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. The server is taking too long to respond.');
    }
    throw error;
  }
};

export const fetchBusArrival = async (busStopCode: string): Promise<BusStopArrivalResponse> => {
  const response = await secureFetch(`${BASE_URL}/bus/${busStopCode}`);
  if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
  return response.json();
};

export const searchBusStops = async (query: string) => {
  const response = await secureFetch(`${BASE_URL}/bus-stops/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) return { results: [] };
  return response.json();
};

export const searchAddresses = async (query: string) => {
  const response = await secureFetch(`${BASE_URL}/onemap/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) return { results: [] };
  return response.json();
};

export const fetchWeather = async (busStopCode: string): Promise<WeatherResponse> => {
  const response = await secureFetch(`${BASE_URL}/weather/rain/${busStopCode}`);
  if (!response.ok) throw new Error('Weather data unavailable');
  return response.json();
};

export const registerAlert = async (data: AlertRequest): Promise<AlertResponse> => {
  const response = await secureFetch(`${BASE_URL}/register-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to register alert');
  return response.json();
};

export const cancelAlert = async (data: CancelAlertRequest): Promise<void> => {
  const response = await secureFetch(`${BASE_URL}/alerts/cancel`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to cancel alert');
};

export const fetchAlertStatus = async (chatId: string): Promise<AlertStatusResponse> => {
  const response = await secureFetch(`${BASE_URL}/alerts/status?chatId=${chatId}`);
  if (!response.ok) throw new Error('Failed to fetch alert status');
  return response.json();
};

export const checkApiStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/health`, { cache: 'no-cache' });
    return response.ok;
  } catch {
    return false;
  }
};
