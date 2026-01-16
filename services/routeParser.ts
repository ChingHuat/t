
export interface JourneySegment {
  mode: 'WALK' | 'BUS' | 'MRT' | 'UNKNOWN';
  description: string;
  duration: number; // in minutes
  distance: number; // in meters
  service?: string;
  stops?: number;
  line?: string;
  destination?: string;
}

/**
 * Parses the complex `route_instructions` from OneMap API legs
 * into a simplified, human-readable journey timeline.
 * 
 * LOGIC:
 * 1. Iterates through all instructions from all legs.
 * 2. Groups consecutive steps by transport mode (Walk, Bus, MRT).
 * 3. Collapses multiple walking steps into a single summary segment.
 * 4. Extracts bus service number and counts stops between boarding and alighting.
 * 5. Extracts MRT line name and destination from instructions.
 * 6. Ignores turn-by-turn directions to keep the output clean.
 */
export const parseRouteInstructions = (legs: any[]): JourneySegment[] => {
  const segments: JourneySegment[] = [];
  let currentSegment: JourneySegment | null = null;
  let rawInstructions: any[] = [];

  // Flatten all instructions from all legs into one array
  legs.forEach(leg => {
    if (leg.route_instructions) {
      rawInstructions = rawInstructions.concat(leg.route_instructions.map((inst: any) => ({ ...inst, legMode: leg.mode })));
    }
  });

  rawInstructions.forEach(([instruction, street, distance, , , duration], index) => {
    const text = instruction.toLowerCase();
    let mode: JourneySegment['mode'] = 'UNKNOWN';

    if (text.includes('walk')) mode = 'WALK';
    else if (text.includes('bus')) mode = 'BUS';
    else if (text.includes('mrt') || text.includes('train')) mode = 'MRT';

    // Ignore irrelevant turn-by-turn details
    if (text.startsWith('turn ') || text.startsWith('continue')) {
        if(currentSegment?.mode === 'WALK'){
            currentSegment.distance += distance;
            currentSegment.duration += Math.round(duration / 60);
        }
        return;
    }

    if (mode !== currentSegment?.mode) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = {
        mode,
        description: '',
        duration: Math.round(duration / 60),
        distance
      };
    } else {
      currentSegment.duration += Math.round(duration / 60);
      currentSegment.distance += distance;
    }
    
    // Logic for BUS segments
    if (mode === 'BUS') {
      if (text.includes('board')) {
        const serviceMatch = text.match(/bus\s+\[(\w+)\]/);
        if(serviceMatch) currentSegment.service = serviceMatch[1];
        
        // Find the corresponding alight instruction to count stops
        let stopCount = 0;
        for(let i = index + 1; i < rawInstructions.length; i++){
            const nextInstructionText = rawInstructions[i][0].toLowerCase();
            if(nextInstructionText.includes('pass')){
                stopCount++;
            }
            if(nextInstructionText.includes('alight')){
                currentSegment.stops = stopCount + 1; // including alight stop
                break;
            }
        }
        currentSegment.description = `Board bus at ${street}`;

      } else if (text.includes('alight')) {
        currentSegment.description = `Alight at ${street}`;
      }
    }
    
    // Logic for MRT segments
    else if (mode === 'MRT') {
      const lineMatch = text.match(/\[(\w+\s+line)\]/i);
      if(lineMatch) currentSegment.line = lineMatch[1].replace(' Line', '');
      
      const towardsMatch = text.match(/towards\s+(.+)/i);
      if(towardsMatch) currentSegment.destination = towardsMatch[1];

      if(text.includes('board')){
        currentSegment.description = `Board MRT at ${street}`;
      } else if(text.includes('alight')){
        currentSegment.description = `Alight at ${street}`;
      }

    } 
    
    // Logic for WALK segments
    else if (mode === 'WALK') {
      if (text.includes('destination')) {
        currentSegment.description = 'Walk to destination';
      } else if (text.includes('bus stop')) {
        currentSegment.description = `Walk to ${street}`;
      } else if(text.includes('station')) {
        currentSegment.description = `Walk to ${street}`;
      } else {
         if(!currentSegment.description){
             currentSegment.description = 'Walk';
         }
      }
    }
  });

  if (currentSegment) segments.push(currentSegment);
  
  // Final pass to consolidate walking descriptions
  segments.forEach(seg => {
      if(seg.mode === 'WALK'){
          seg.description = `${seg.description} (${seg.distance}m · ${seg.duration} min)`;
      }
  });

  // Filter out any intermediate bus/mrt instructions that are not board/alight
  return segments.filter(s => {
      if((s.mode === 'BUS' || s.mode === 'MRT') && !s.description) return false;
      return true;
  });
};
