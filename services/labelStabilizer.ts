
import { StatusLabel } from './statusMapper';

/**
 * Severity Model for the 6 Public Labels
 */
const SEVERITY_MAP: Record<StatusLabel, number> = {
  "UNRELIABLE": 3,
  "DELAYED": 3,
  "FLUCTUATING": 2,
  "OKAY": 1,
  "RELIABLE": 0,
  "ON TRACK": 0,
};

/**
 * Recovery Constraints
 */
const HOLD_TIMES: Record<number, number> = {
  0: 90, // Reaching peak status requires long stability
  1: 60, // OKAY state hold
  2: 30, // Fluctuating hold
  3: 0,  // Escalation is immediate (0ms hold)
};

const CONFIRMATIONS: Record<number, number> = {
  0: 3, // 3 polls to reach RELIABLE/ON TRACK
  1: 2, 
  2: 1, 
  3: 1, // 1 poll to trigger UNRELIABLE/DELAYED
};

export interface StabilizerState {
  currentLabel: StatusLabel;
  candidateLabel: StatusLabel | null;
  candidateCount: number;
  lastChangeTs: number;
}

/**
 * Resolves a stable user-facing label from a potentially noisy candidate.
 */
export const resolveStableLabel = (
  state: StabilizerState,
  candidateLabel: StatusLabel,
  now: number = Date.now()
): StatusLabel => {
  const currentSeverity = SEVERITY_MAP[state.currentLabel];
  const candidateSeverity = SEVERITY_MAP[candidateLabel];

  // 1. Initialization (Safe start at OKAY or higher if immediate)
  if (!state.currentLabel) {
    state.currentLabel = candidateLabel;
    state.lastChangeTs = now;
    return candidateLabel;
  }

  // 2. Fast Escalation
  // If the new label is worse, we update instantly
  if (candidateSeverity > currentSeverity) {
    state.currentLabel = candidateLabel;
    state.lastChangeTs = now;
    state.candidateCount = 0;
    state.candidateLabel = null;
    return candidateLabel;
  }

  // 3. No Change
  if (candidateLabel === state.currentLabel) {
    state.candidateCount = 0;
    state.candidateLabel = null;
    return state.currentLabel;
  }

  // 4. Earned Recovery (Downgrade)
  if (candidateSeverity < currentSeverity) {
    // Track the candidate
    if (state.candidateLabel !== candidateLabel) {
      state.candidateLabel = candidateLabel;
      state.candidateCount = 1;
    } else {
      state.candidateCount += 1;
    }

    const elapsed = (now - state.lastChangeTs) / 1000;
    const requiredHold = HOLD_TIMES[currentSeverity];
    const requiredConf = CONFIRMATIONS[candidateSeverity];

    if (elapsed >= requiredHold && state.candidateCount >= requiredConf) {
      // RULE: Stepwise Descent
      // If we are at 3 (UNRELIABLE) and want to go to 0, we MUST pass through 1 (OKAY)
      if (currentSeverity === 3 && candidateSeverity === 0) {
        state.currentLabel = "OKAY";
      } else {
        state.currentLabel = candidateLabel;
      }
      
      state.lastChangeTs = now;
      state.candidateCount = 0;
      state.candidateLabel = null;
      return state.currentLabel;
    }

    // Requirements not met, keep current
    return state.currentLabel;
  }

  // Within same severity level (e.g. RELIABLE <-> ON TRACK)
  // We allow horizontal switching with small confirmation but no hold time
  if (candidateSeverity === currentSeverity) {
      state.currentLabel = candidateLabel;
      return candidateLabel;
  }

  return state.currentLabel;
};
