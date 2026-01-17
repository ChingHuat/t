
import { StatusLabel } from './statusMapper';

/**
 * Severity Model: 
 * Warnings must appear fast; reassurance must be earned.
 */
const SEVERITY_MAP: Record<StatusLabel, number> = {
  "INITIALIZING": 0,
  "ESTIMATING": 0,
  "RELIABLE": 1,
  "ONTRACK": 1,
  "IMPROVING": 1,
  "OKAY": 1,
  "UNCERTAIN": 1,
  "FLUCTUATING": 2,
  "SLOWING": 2,
  "DELAYING": 2,
  "DISRUPTED": 3,
  "UNRELIABLE": 3,
};

/**
 * Minimum Hold Time (s): How long we must stay in the current severity 
 * before allowed to downgrade.
 */
const HOLD_TIMES: Record<number, number> = {
  0: 60,
  1: 90,
  2: 30,
  3: 0,
};

/**
 * Confirmation Counts: How many consecutive polls the new candidate
 * must be seen before it is accepted as a downgrade.
 */
const CONFIRMATIONS: Record<number, number> = {
  0: 2,
  1: 3,
  2: 2,
  3: 1,
};

/**
 * Intermediate step defaults when descending severity.
 */
const DEFAULT_FOR_SEVERITY: Record<number, StatusLabel> = {
  3: "UNRELIABLE",
  2: "DELAYING",
  1: "OKAY",
  0: "ESTIMATING"
};

export interface StabilizerState {
  currentLabel: StatusLabel;
  candidateLabel: StatusLabel | null;
  candidateCount: number;
  lastChangeTs: number;
}

/**
 * Resolves a stable user-facing label from a potentially noisy candidate.
 * 
 * Rules:
 * 1. Immediate escalation if candidate is higher severity.
 * 2. Slow recovery (Hold time + confirmations) if candidate is lower severity.
 * 3. Stepwise de-escalation (pass through intermediate severities).
 * 4. No label flicker/oscillation.
 */
export const resolveStableLabel = (
  state: StabilizerState,
  candidateLabel: StatusLabel,
  now: number = Date.now()
): StatusLabel => {
  const currentSeverity = SEVERITY_MAP[state.currentLabel];
  const candidateSeverity = SEVERITY_MAP[candidateLabel];

  // 1. Initialization
  if (!state.currentLabel) {
    state.currentLabel = candidateLabel;
    state.lastChangeTs = now;
    state.candidateCount = 0;
    state.candidateLabel = null;
    return candidateLabel;
  }

  // 2. Immediate Escalation
  if (candidateSeverity > currentSeverity) {
    state.currentLabel = candidateLabel;
    state.lastChangeTs = now;
    state.candidateCount = 0;
    state.candidateLabel = null;
    return candidateLabel;
  }

  // 3. Staying at same severity
  if (candidateSeverity === currentSeverity) {
    // We allow switching within same severity immediately for drift-based variations (e.g. SLOWING to DELAYING)
    state.currentLabel = candidateLabel;
    state.candidateCount = 0;
    state.candidateLabel = null;
    // Note: lastChangeTs is NOT updated here to ensure hold time for potential recovery is preserved
    return candidateLabel;
  }

  // 4. Slow Recovery (Downgrade)
  if (candidateSeverity < currentSeverity) {
    // Track the recovery candidate
    if (state.candidateLabel !== candidateLabel) {
      state.candidateLabel = candidateLabel;
      state.candidateCount = 1;
    } else {
      state.candidateCount += 1;
    }

    const holdTimeElapsed = (now - state.lastChangeTs) / 1000;
    const minHoldTime = HOLD_TIMES[currentSeverity];
    const requiredConfirmations = CONFIRMATIONS[candidateSeverity];

    // Check if both duration and confirmation requirements are met
    if (holdTimeElapsed >= minHoldTime && state.candidateCount >= requiredConfirmations) {
      // Rule: Improvements must pass through intermediate severities.
      // We only drop by ONE severity level per step.
      const targetSeverity = currentSeverity - 1;
      
      let nextLabel: StatusLabel;
      if (SEVERITY_MAP[candidateLabel] === targetSeverity) {
        // If the candidate IS the target severity, use it
        nextLabel = candidateLabel;
      } else {
        // Otherwise, use a safe intermediate default
        nextLabel = DEFAULT_FOR_SEVERITY[targetSeverity];
      }

      state.currentLabel = nextLabel;
      state.lastChangeTs = now;
      state.candidateCount = 0;
      state.candidateLabel = null;
      return nextLabel;
    }

    // Still in hold/confirmation period: return current
    return state.currentLabel;
  }

  return state.currentLabel;
};
