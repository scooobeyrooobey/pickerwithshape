export interface Mood {
  id: string;
  label: string;
  /** Position of the label, measured as horizontal offset (in px) from track center. Negative = left of knob. */
  offsetX: number;
  /** Vertical offset (in px) from arc baseline (negative = higher). Forms the visual arc. */
  offsetY: number;
}

/**
 * Five mood stops. Knob value is in [0, 1].
 * Stops at value: Awful=0, Meh=0.25, Okay=0.5, Good=0.75, Amazing=1.
 */
export const MOODS: Mood[] = [
  { id: 'awful', label: 'Awful', offsetX: -148, offsetY: 0 },
  { id: 'meh', label: 'Meh', offsetX: -77, offsetY: 0 },
  { id: 'okay', label: 'Okay', offsetX: 0, offsetY: 0 },
  { id: 'good', label: 'Good', offsetX: 61, offsetY: 0 },
  { id: 'amazing', label: 'Amazing', offsetX: 145, offsetY: 0 },
];

export const MOOD_VALUES = [0, 0.25, 0.5, 0.75, 1];

export function valueToMoodIndex(value: number): number {
  let nearest = 0;
  let minDist = Infinity;
  for (let i = 0; i < MOOD_VALUES.length; i++) {
    const d = Math.abs(MOOD_VALUES[i] - value);
    if (d < minDist) {
      minDist = d;
      nearest = i;
    }
  }
  return nearest;
}
