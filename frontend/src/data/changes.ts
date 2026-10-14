import type { Change } from "../types/changes";

const BLUE = "#5B8DF7";
const PURPLE = "#9370F0";
const YELLOW = "#FFC85C";
const RED = "#FF8A8F";

// Design Comparison, overview
export const DESIGN_CHANGES: Change[] = [
  { id: "d1", label: "Fonts are different", color: BLUE },
  { id: "d2", label: "Spacing in headings", color: YELLOW },
  { id: "d3", label: "Difference in Color Palette", color: PURPLE },
  { id: "d4", label: "Sizing mismatch", color: RED },
];

// Design Comparison, one category selected
export const DESIGN_CHANGES_BY_CATEGORY: Record<string, Change[]> = {
  Fonts: [
    { id: "df1", label: "Change #1", color: BLUE },
    { id: "df2", label: "Change #2", color: BLUE },
    { id: "df3", label: "Change #3", color: BLUE },
  ],
  Color: [
    { id: "dc1", label: "Change #1", color: PURPLE },
    { id: "dc2", label: "Change #2", color: PURPLE },
    { id: "dc3", label: "Change #3", color: PURPLE },
  ],
  Spacing: [
    { id: "ds1", label: "Change #1", color: YELLOW },
    { id: "ds2", label: "Change #2", color: YELLOW },
    { id: "ds3", label: "Change #3", color: YELLOW },
  ],
  Sizing: [
    { id: "dz1", label: "Change #1", color: RED },
    { id: "dz2", label: "Change #2", color: RED },
    { id: "dz3", label: "Change #3", color: RED },
  ],
};

// Accessibility Score, overview
export const ACCESSIBILITY_CHANGES: Change[] = [
  { id: "a1", label: "Low color Contrast", color: BLUE },
  { id: "a2", label: "Missing image alt text", color: PURPLE },
  { id: "a3", label: "Non-descriptive links", color: YELLOW },
  { id: "a4", label: "Missing form labels", color: RED },
];

// Accessibility Score, one category selected
export const ACCESSIBILITY_CHANGES_BY_CATEGORY: Record<string, Change[]> = {
  Contrast: [
    { id: "ac1", label: "Change #1", color: BLUE },
    { id: "ac2", label: "Change #2", color: BLUE },
    { id: "ac3", label: "Change #3", color: BLUE },
  ],
  Labels: [
    { id: "al1", label: "Change #1", color: PURPLE },
    { id: "al2", label: "Change #2", color: PURPLE },
    { id: "al3", label: "Change #3", color: PURPLE },
  ],
  Semantics: [
    { id: "as1", label: "Change #1", color: YELLOW },
    { id: "as2", label: "Change #2", color: YELLOW },
    { id: "as3", label: "Change #3", color: YELLOW },
  ],
  Interaction: [
    { id: "ai1", label: "Change #1", color: RED },
    { id: "ai2", label: "Change #2", color: RED },
    { id: "ai3", label: "Change #3", color: RED },
  ],
};