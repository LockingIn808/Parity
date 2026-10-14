import { useState } from "react";
import ConnectionStatus from "../components/ConnectionStatus";
import ScoreBreakdown from "../components/ScoreBreakdown";
import type { Category } from "../types/design";

// Mock data. Overall comes out to about 87.
const CATEGORIES: Category[] = [
  { label: "Contrast",    score: 75, value: 0, color: "#5B8DF7" },
  { label: "Labels",      score: 90, value: 0, color: "#9370F0" },
  { label: "Semantics",   score: 95, value: 0, color: "#FFC85C" },
  { label: "Interaction", score: 88, value: 0, color: "#FF8A8F" },
];

export default function AccessibilityScore() {
  const [selected, setSelected] = useState<Category | null>(null);

  return (
    <div className="space-y-6">
      <ConnectionStatus link="figma.com/file/XYZ" />
      <ScoreBreakdown
        title="Accessibility Score"
        categories={CATEGORIES}
        centerLabel="Accessible"
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  );
}