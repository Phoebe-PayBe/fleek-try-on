import { useReducer, useMemo } from 'react';
import type { Demographic, SizeCode, VtoMatrix, VtoVariant } from '../types';

interface VtoState {
  demographicIndex: number;
  sizeIndex: number;
}

type VtoAction =
  | { type: 'NEXT_DEMOGRAPHIC' }
  | { type: 'PREV_DEMOGRAPHIC' }
  | { type: 'NEXT_SIZE' }
  | { type: 'PREV_SIZE' }
  | { type: 'SET_DEMOGRAPHIC'; index: number }
  | { type: 'SET_SIZE'; index: number };

/** Wrap an index so navigation cycles round at both ends. */
function wrap(index: number, length: number): number {
  return (index + length) % length;
}

function makeReducer(demographicCount: number, sizeCount: number) {
  return function reducer(state: VtoState, action: VtoAction): VtoState {
    switch (action.type) {
      case 'NEXT_DEMOGRAPHIC':
        return { ...state, demographicIndex: wrap(state.demographicIndex + 1, demographicCount) };
      case 'PREV_DEMOGRAPHIC':
        return { ...state, demographicIndex: wrap(state.demographicIndex - 1, demographicCount) };
      case 'NEXT_SIZE':
        return { ...state, sizeIndex: wrap(state.sizeIndex + 1, sizeCount) };
      case 'PREV_SIZE':
        return { ...state, sizeIndex: wrap(state.sizeIndex - 1, sizeCount) };
      case 'SET_DEMOGRAPHIC':
        return { ...state, demographicIndex: wrap(action.index, demographicCount) };
      case 'SET_SIZE':
        return { ...state, sizeIndex: wrap(action.index, sizeCount) };
      default:
        return state;
    }
  };
}

export interface UseVtoSelectionResult {
  demographic: Demographic;
  size: SizeCode;
  demographicIndex: number;
  sizeIndex: number;
  currentVariant: VtoVariant;
  nextDemographic: () => void;
  prevDemographic: () => void;
  nextSize: () => void;
  prevSize: () => void;
  setSizeIndex: (index: number) => void;
}

/**
 * Encapsulates all VTO viewer state: which demographic and size are selected,
 * plus derived lookup of the current variant from the matrix.
 */
export function useVtoSelection(
  demographics: Demographic[],
  sizes: SizeCode[],
  matrix: VtoMatrix,
  initial: { demographicIndex?: number; sizeIndex?: number } = {},
): UseVtoSelectionResult {
  const reducer = useMemo(
    () => makeReducer(demographics.length, sizes.length),
    [demographics.length, sizes.length],
  );

  const [state, dispatch] = useReducer(reducer, {
    demographicIndex: initial.demographicIndex ?? 0,
    sizeIndex: initial.sizeIndex ?? 0,
  });

  const demographic = demographics[state.demographicIndex];
  const size = sizes[state.sizeIndex];
  const currentVariant = matrix[demographic][size];

  return {
    demographic,
    size,
    demographicIndex: state.demographicIndex,
    sizeIndex: state.sizeIndex,
    currentVariant,
    nextDemographic: () => dispatch({ type: 'NEXT_DEMOGRAPHIC' }),
    prevDemographic: () => dispatch({ type: 'PREV_DEMOGRAPHIC' }),
    nextSize: () => dispatch({ type: 'NEXT_SIZE' }),
    prevSize: () => dispatch({ type: 'PREV_SIZE' }),
    setSizeIndex: (index: number) => dispatch({ type: 'SET_SIZE', index }),
  };
}
