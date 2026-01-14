
import { BusStopArrivalResponse, WeatherResponse, AlertRequest, CancelAlertRequest, AlertResponse, AlertStatusResponse } from '../types';

/**
 * Updated BASE_URL as per user request.
 */
const BASE_URL = "https://bus.pingthecloud.xyz";

const TIMEOUT_MS = 10000;

/**
 * Enhanced fetch with timeout and same-origin configuration.
 */
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

/**
 * GET /bus/{busStopCode}
 */
export const fetchBusArrival = async (busStopCode: string): Promise<BusStopArrivalResponse> => {
  try {
    const response = await secureFetch(`${BASE_URL}/bus/${busStopCode}`);
    if (!response.ok) {
      if (response.status === 404) throw new Error('Bus stop code not found.');
      throw new Error(`Server responded with status ${response.status}`);
    }
    return response.json();
  } catch (err: any) {
    if (err.message.includes('fetch') || err.name === 'TypeError') {
      throw new Error('Network error: Unable to reach the bus server. Please check your internet connection.');
    }
    throw err;
  }
};

/**
 * GET /bus-stops/search?q={query}
 */
export const searchBusStops = async (query: string) => {
  const response = await secureFetch(`${BASE_URL}/bus-stops/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) return { results: [] };
  return response.json();
};

/**
 * GET /weather/rain/{busStopCode}
 */
export const fetchWeather = async (busStopCode: string): Promise<WeatherResponse> => {
  const response = await secureFetch(`${BASE_URL}/weather/rain/${busStopCode}`);
  if (!response.ok) {
    throw new Error('Weather data unavailable');
  }
  return response.json();
};

/**
 * POST /register-alert
 */
export const registerAlert = async (data: AlertRequest): Promise<AlertResponse> => {
  const response = await secureFetch(`${BASE_URL}/register-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to register alert');
  }
  return response.json();
};

/**
 * DELETE /alerts/cancel
 */
export const cancelAlert = async (data: CancelAlertRequest): Promise<void> => {
  const response = await secureFetch(`${BASE_URL}/alerts/cancel`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to cancel alert');
  }
};

/**
 * GET /alerts/status?chatId={chatId}
 */
export const fetchAlertStatus = async (chatId: string): Promise<AlertStatusResponse> => {
  const response = await secureFetch(`${BASE_URL}/alerts/status?chatId=${chatId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch alert status');
  }
  return response.json();
};

/**
 * GET /health
 * Diagnostic tool to check backend proxy availability.
 */
export const checkApiStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/health`, { cache: 'no-cache' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * External links for the Telegram bot.
 */
export const getTelegramBotLink = (busStop: string, service: string) => {
  return `https://t.me/TransitAI_bot?start=alert_${busStop}_${service}`;
};
