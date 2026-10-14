import { useState } from "react";
import ConnectionStatus from "../components/ConnectionStatus";
import ScoreBreakdown from "../components/ScoreBreakdown";
import type { Category } from "../types/design";

// Mock data. The backend will supply real scores later.
const CATEGORIES: Category[] = [
  { label: "Fonts",   score: 44, value: 0, color: "#5B8DF7" },
  { label: "Color",   score: 48, value: 0, color: "#9370F0" },
  { label: "Spacing", score: 32, value: 0, color: "#FFC85C" },
  { label: "Sizing",  score: 64, value: 0, color: "#FF8A8F" },
];

export default function DesignComparison() {
  const [selected, setSelected] = useState<Category | null>(null);

  return (
    <div className="space-y-6">
      <ConnectionStatus link="figma.com/file/XYZ" />
      <ScoreBreakdown
        title="Design Comparison"
        categories={CATEGORIES}
        centerLabel="Similar"
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  );
}