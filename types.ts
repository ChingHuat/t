

export type Drift = "DOWN" | "UP" | "STABLE" | "UNKNOWN";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Stability = "STABLE" | "UNSTABLE" | "UNKNOWN";

export interface BusArrivalInfo {
  EstimatedArrival: string;
  Monitored: number;
  Load?: string;
  Feature?: string;
  Type?: string;
}

export interface BusService {
  ServiceNo: string;
  NextBus: BusArrivalInfo;
  NextBus2: BusArrivalInfo;
  NextBus3: BusArrivalInfo;
  // Fix: Added "Arr" to the eta type to permit comparisons in the UI components (e.g., ServiceRow.tsx) 
  // and align with the logic that handles both numeric minutes and "Arriving" status.
  eta: number | "NA" | "Arr";
  drift: Drift;
  confidence: Confidence;
  stability: Stability;
}

export interface BusStopArrivalResponse {
  busStopCode: string;
  busStopName: string;
  roadName: string;
  services: BusService[];
}

export interface WeatherResponse {
  busStopCode: string;
  rain_mm: number;
  level: string;
  station_id: string;
  updated_at: string;
}

export interface FavoriteBusStop {
  code: string;
  name: string;
  road?: string;
}

export interface FavoriteService {
  busStopCode: string;
  busStopName: string;
  serviceNo: string;
}

export interface AlertRequest {
  chatId: string;
  busStopCode: string;
  serviceNo: string;
  threshold: number;
}

export interface CancelAlertRequest {
  chatId: string;
  alertId: string;
}

export interface AlertResponse {
  alertId: string;
  status: string;
}

export interface AlertStatus {
  id: string;
  busStopCode: string;
  serviceNo: string;
  threshold: number;
  firedStages: {
    ready: boolean;
    leave: boolean;
    arrived: boolean;
  };
  createdAt: number;
}

export interface AlertStatusResponse {
  alerts: AlertStatus[];
}
