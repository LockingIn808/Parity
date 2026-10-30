import { useRef, useState } from "react";
import { askParity } from "../lib/api";

export interface QA {
  id: number;
  question: string;
  answer?: string;
  error?: string;
}

/** Question/answer list for one element's results. getContext is read at ask time so answers use the latest results. */
export function useAsk(getContext: () => object) {
  const [items, setItems] = useState<QA[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const context = useRef(getContext);
  context.current = getContext;

  const ask = async (question: string) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, question }]);
    setBusy(true);
    try {
      const { answer } = await askParity(context.current(), question);
      setItems((list) => list.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "The AI could not answer.";
      setItems((list) => list.map((x) => (x.id === id ? { ...x, error: message } : x)));
    } finally {
      setBusy(false);
    }
  };

  return { items, busy, ask };
}
