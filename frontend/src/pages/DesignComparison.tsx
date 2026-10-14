import { useState } from "react";
import ConnectionStatus from "../components/ConnectionStatus";
import ScoreBreakdown from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import ChatInput from "../components/ChatInput";
import {
  DESIGN_CHANGES,
  DESIGN_CHANGES_BY_CATEGORY,
} from "../data/changes";
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

  const changes = selected
    ? DESIGN_CHANGES_BY_CATEGORY[selected.label] ?? []
    : DESIGN_CHANGES;

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
      <ChangesList changes={changes} />
      <ChatInput />
    </div>
  );
}