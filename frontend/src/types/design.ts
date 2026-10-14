export interface Category {
  label: string;
  value: number;  // what the chart draws, 0-100
  color: string;
  score?: number; // category's own similarity, 0-100
}