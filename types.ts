
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
  latitude?: number;
  longitude?: number;
}

export interface FavoriteService {
  busStopCode: string;
  busStopName: string;
  serviceNo: string;
}

export interface JourneyStep {
  type: "WALK" | "BUS" | "MRT" | "RAIL" | "SUBWAY" | "TRAM";
  service?: string;
  from: string;
  fromBusStopCode?: string;
  to: string;
  toBusStopCode?: string;
  stops?: number;
  minutes: number;
  meters?: number;
}

export interface Itinerary {
  id?: number;
  recommended?: boolean;
  summary: {
    totalMinutes: number;
    walkMinutes: number;
    walkMeters: number;
    transferCount: number;
    modes: string[];
  };
  steps: JourneyStep[];
  fare?: string;
}

export interface JourneyResponse {
  itineraries: Itinerary[];
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
}

export interface AlertStatusResponse {
  alerts: {
    id: string;
    busStopCode: string;
    serviceNo: string;
    threshold: number;
    firedStages: {
      arrived: boolean;
    };
  }[];
}
