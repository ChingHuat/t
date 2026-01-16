
import { Drift, Confidence, Stability } from '../types';

export type StatusLabel = 
  | "RELIABLE" | "ONTRACK" | "IMPROVING" | "OKAY" 
  | "SLOWING" | "DELAYING" | "ESTIMATING" | "UNCERTAIN" 
  | "FLUCTUATING" | "DISRUPTED" | "UNRELIABLE" | "INITIALIZING";

export interface StatusInfo {
  label: StatusLabel;
  hex: string;
}

interface StatusMapping extends StatusInfo {
  drift: Drift;
  confidence: Confidence;
  stability: Stability;
}

const statusTable: StatusMapping[] = [
  { "drift": "DOWN", "confidence": "HIGH", "stability": "STABLE", "label": "RELIABLE", "hex": "#16A34A" },
  { "drift": "STABLE", "confidence": "HIGH", "stability": "STABLE", "label": "ONTRACK", "hex": "#16A34A" },
  { "drift": "UP", "confidence": "HIGH", "stability": "STABLE", "label": "SLOWING", "hex": "#FB923C" },
  { "drift": "UNKNOWN", "confidence": "HIGH", "stability": "STABLE", "label": "ONTRACK", "hex": "#16A34A" },

  { "drift": "DOWN", "confidence": "HIGH", "stability": "UNSTABLE", "label": "FLUCTUATING", "hex": "#F97316" },
  { "drift": "STABLE", "confidence": "HIGH", "stability": "UNSTABLE", "label": "UNCERTAIN", "hex": "#FACC15" },
  { "drift": "UP", "confidence": "HIGH", "stability": "UNSTABLE", "label": "DISRUPTED", "hex": "#DC2626" },
  { "drift": "UNKNOWN", "confidence": "HIGH", "stability": "UNSTABLE", "label": "UNCERTAIN", "hex": "#FACC15" },

  { "drift": "DOWN", "confidence": "HIGH", "stability": "UNKNOWN", "label": "IMPROVING", "hex": "#22C55E" },
  { "drift": "STABLE", "confidence": "HIGH", "stability": "UNKNOWN", "label": "ONTRACK", "hex": "#16A34A" },
  { "drift": "UP", "confidence": "HIGH", "stability": "UNKNOWN", "label": "DELAYING", "hex": "#F97316" },
  { "drift": "UNKNOWN", "confidence": "HIGH", "stability": "UNKNOWN", "label": "ESTIMATING", "hex": "#9CA3AF" },

  { "drift": "DOWN", "confidence": "MEDIUM", "stability": "STABLE", "label": "IMPROVING", "hex": "#22C55E" },
  { "drift": "STABLE", "confidence": "MEDIUM", "stability": "STABLE", "label": "OKAY", "hex": "#EAB308" },
  { "drift": "UP", "confidence": "MEDIUM", "stability": "STABLE", "label": "SLOWING", "hex": "#FB923C" },
  { "drift": "UNKNOWN", "confidence": "MEDIUM", "stability": "STABLE", "label": "ESTIMATING", "hex": "#9CA3AF" },

  { "drift": "DOWN", "confidence": "MEDIUM", "stability": "UNSTABLE", "label": "FLUCTUATING", "hex": "#F97316" },
  { "drift": "STABLE", "confidence": "MEDIUM", "stability": "UNSTABLE", "label": "UNCERTAIN", "hex": "#FACC15" },
  { "drift": "UP", "confidence": "MEDIUM", "stability": "UNSTABLE", "label": "DISRUPTED", "hex": "#DC2626" },
  { "drift": "UNKNOWN", "confidence": "MEDIUM", "stability": "UNSTABLE", "label": "UNCERTAIN", "hex": "#FACC15" },

  { "drift": "DOWN", "confidence": "MEDIUM", "stability": "UNKNOWN", "label": "IMPROVING", "hex": "#22C55E" },
  { "drift": "STABLE", "confidence": "MEDIUM", "stability": "UNKNOWN", "label": "OKAY", "hex": "#EAB308" },
  { "drift": "UP", "confidence": "MEDIUM", "stability": "UNKNOWN", "label": "DELAYING", "hex": "#F97316" },
  { "drift": "UNKNOWN", "confidence": "MEDIUM", "stability": "UNKNOWN", "label": "ESTIMATING", "hex": "#9CA3AF" },

  { "drift": "DOWN", "confidence": "LOW", "stability": "STABLE", "label": "FLUCTUATING", "hex": "#F97316" },
  { "drift": "STABLE", "confidence": "LOW", "stability": "STABLE", "label": "UNCERTAIN", "hex": "#FACC15" },
  { "drift": "UP", "confidence": "LOW", "stability": "STABLE", "label": "UNRELIABLE", "hex": "#B91C1C" },
  { "drift": "UNKNOWN", "confidence": "LOW", "stability": "STABLE", "label": "UNCERTAIN", "hex": "#FACC15" },

  { "drift": "DOWN", "confidence": "LOW", "stability": "UNSTABLE", "label": "FLUCTUATING", "hex": "#F97316" },
  { "drift": "STABLE", "confidence": "LOW", "stability": "UNSTABLE", "label": "UNRELIABLE", "hex": "#B91C1C" },
  { "drift": "UP", "confidence": "LOW", "stability": "UNSTABLE", "label": "FLUCTUATING", "hex": "#F97316" },
  { "drift": "UNKNOWN", "confidence": "LOW", "stability": "UNSTABLE", "label": "UNRELIABLE", "hex": "#B91C1C" },

  { "drift": "DOWN", "confidence": "LOW", "stability": "UNKNOWN", "label": "UNCERTAIN", "hex": "#FACC15" },
  { "drift": "STABLE", "confidence": "LOW", "stability": "UNKNOWN", "label": "UNRELIABLE", "hex": "#B91C1C" },
  { "drift": "UP", "confidence": "LOW", "stability": "UNKNOWN", "label": "UNRELIABLE", "hex": "#B91C1C" },
  { "drift": "UNKNOWN", "confidence": "LOW", "stability": "UNKNOWN", "label": "INITIALIZING", "hex": "#6B7280" }
];

export const getStatusInfo = (drift: Drift, confidence: Confidence, stability: Stability): StatusInfo => {
  const match = statusTable.find(s => 
    s.drift === drift && 
    s.confidence === confidence && 
    s.stability === stability
  );
  return match ? { label: match.label, hex: match.hex } : { label: "INITIALIZING", hex: "#6B7280" };
};
