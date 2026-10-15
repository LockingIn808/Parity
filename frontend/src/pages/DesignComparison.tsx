import { useState } from "react";
import ScoreBreakdown from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import ChatInput from "../components/ChatInput";
import {
  DESIGN_CATEGORIES,
  DESIGN_CHANGES,
  DESIGN_CHANGES_BY_CATEGORY,
  type Category,
} from "../global";

export default function DesignComparison() {
  const [selected, setSelected] = useState<Category | null>(null);

  const changes = selected
    ? DESIGN_CHANGES_BY_CATEGORY[selected.label] ?? []
    : DESIGN_CHANGES;

  return (
    <div className="space-y-4">
      <ScoreBreakdown
        title="Design Comparison"
        categories={DESIGN_CATEGORIES}
        centerLabel="Similar"
        selected={selected}
        onSelect={setSelected}
      />
      <ChangesList changes={changes} />
      <ChatInput />
    </div>
  );
}