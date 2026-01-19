
import { Drift, Confidence, Stability } from '../types';

export type StatusLabel = 
  | "ON TRACK"
  | "RELIABLE"
  | "OKAY"
  | "FLUCTUATING"
  | "DELAYED"
  | "UNRELIABLE";

export interface StatusInfo {
  label: StatusLabel;
  hex: string;
}

/**
 * Maps raw backend telemetry to exactly 6 public status labels.
 * Evaluates in strict priority order (top-down).
 */
export const mapTelemetryToStatus = (
  confidence: Confidence,
  drift: Drift,
  stability: Stability
): StatusLabel => {
  // 1. UNRELIABLE (Priority 1)
  if (confidence === "LOW") return "UNRELIABLE";

  // 2. DELAYED (Priority 2)
  if (drift === "UP") return "DELAYED";

  // 3. FLUCTUATING (Priority 3)
  if (stability === "UNSTABLE") return "FLUCTUATING";

  // 4. RELIABLE (Priority 4)
  if (confidence === "HIGH" && drift === "DOWN" && stability === "STABLE") {
    return "RELIABLE";
  }

  // 5. ON TRACK (Priority 5)
  if (
    confidence === "HIGH" &&
    stability === "STABLE" &&
    (drift === "STABLE" || drift === "UNKNOWN")
  ) {
    return "ON TRACK";
  }

  // 6. OKAY (Default/Priority 6)
  // Maps Medium confidence and Stable/Unknown stability
  return "OKAY";
};

/**
 * Returns the theme colors for the public status labels.
 */
export const getStatusTheme = (label: StatusLabel): StatusInfo => {
  const themes: Record<StatusLabel, string> = {
    "UNRELIABLE": "#DC2626", // Red-600
    "DELAYED": "#F97316",    // Orange-500
    "FLUCTUATING": "#FACC15", // Yellow-400
    "RELIABLE": "#16A34A",   // Green-600
    "ON TRACK": "#10B981",   // Emerald-500
    "OKAY": "#94A3B8",       // Slate-400
  };
  return { label, hex: themes[label] };
};

// Legacy support for existing components
export const getStatusInfo = (drift: Drift, confidence: Confidence, stability: Stability): StatusInfo => {
  const label = mapTelemetryToStatus(confidence, drift, stability);
  return getStatusTheme(label);
};
