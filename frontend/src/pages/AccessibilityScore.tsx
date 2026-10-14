import { useState } from "react";
import ConnectionStatus from "../components/ConnectionStatus";
import ScoreBreakdown from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import ChatInput from "../components/ChatInput";
import {
  ACCESSIBILITY_CATEGORIES,
  ACCESSIBILITY_CHANGES,
  ACCESSIBILITY_CHANGES_BY_CATEGORY,
  type Category,
} from "../global";

export default function AccessibilityScore() {
  const [selected, setSelected] = useState<Category | null>(null);

  const changes = selected
    ? ACCESSIBILITY_CHANGES_BY_CATEGORY[selected.label] ?? []
    : ACCESSIBILITY_CHANGES;

  return (
    <div className="space-y-4">
      <ConnectionStatus link="figma.com/file/XYZ" />
      <ScoreBreakdown
        title="Accessibility Score"
        categories={ACCESSIBILITY_CATEGORIES}
        centerLabel="Accessible"
        selected={selected}
        onSelect={setSelected}
      />
      <ChangesList changes={changes} />
      <ChatInput />
    </div>
  );
}