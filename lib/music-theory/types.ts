export type Cents = number;
export type Hertz = number;
export type Ratio = [number, number] | number;

export interface Pitch {
  frequency: Hertz;
  cents: Cents; // Relative to a reference
}
