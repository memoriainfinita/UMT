/**
 * Clave patterns and other common rhythmic patterns as boolean arrays.
 * Each array has 16 steps (one measure of 4/4 in 16th notes) unless noted.
 * true = onset, false = rest.
 */

export interface ClavePattern {
  name: string;
  steps: readonly boolean[];
  description: string;
}

export const CLAVE_PATTERNS: Record<string, ClavePattern> = {
  'son-3-2': {
    name: 'Son Clave 3-2',
    // X . . X . . X . | . . X . X . . .
    steps: [1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Cuban son clave - 3 side first, 2 side second.',
  },
  'son-2-3': {
    name: 'Son Clave 2-3',
    // X . . . X . X . | . X . . X . . .
    steps: [1,0,0,0,1,0,1,0,0,1,0,0,1,0,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Cuban son clave - 2 side first, 3 side second.',
  },
  'rumba-3-2': {
    name: 'Rumba Clave 3-2',
    // X . . X . . . X | . . X . X . . .
    steps: [1,0,0,1,0,0,0,1,0,0,1,0,1,0,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Cuban rumba clave - 3 side first, 2 side second.',
  },
  'rumba-2-3': {
    name: 'Rumba Clave 2-3',
    // X . . . X . X . | . . X . . X . .
    steps: [1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Cuban rumba clave - 2 side first, 3 side second.',
  },
  'bossa': {
    name: 'Bossa Nova Clave',
    // X . . X . . X . | . . X . . X . .
    steps: [1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Brazilian bossa nova clave - hybrid of son and rumba.',
  },
  'tresillo': {
    name: 'Tresillo',
    // X . . X . . X . (8 steps) - Euclidean E(3,8)
    steps: [1,0,0,1,0,0,1,0].map(Boolean) as unknown as readonly boolean[],
    description: '3-pulse figure over 8 steps (3+3+2). Ubiquitous in Cuban and West African music.',
  },
  'cinquillo': {
    name: 'Cinquillo',
    // X . X X . X . X (8 steps) - 5 pulses over 8
    steps: [1,0,1,1,0,1,0,1].map(Boolean) as unknown as readonly boolean[],
    description: '5-pulse figure over 8 steps. Common in Cuban danzón.',
  },
  'habanera': {
    name: 'Habanera',
    // X . . X X . X . (8 steps)
    steps: [1,0,0,1,1,0,1,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Habanera rhythm - foundational to tango and Cuban music.',
  },
  'cascara': {
    name: 'Cascara',
    // X . X X . X X . X . X . X X . . (16 steps)
    steps: [1,0,1,1,0,1,1,0,1,0,1,0,1,1,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Cuban cascara pattern played on the shell of the timbales.',
  },
  'samba': {
    name: 'Samba',
    // X . X . X X . X X . X . X X . . (16 steps - partido alto)
    steps: [1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,0].map(Boolean) as unknown as readonly boolean[],
    description: 'Brazilian samba partido alto pattern.',
  },
};
