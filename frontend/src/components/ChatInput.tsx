import { useState } from "react";

interface Props {
  placeholder?: string;
  onSend?: (text: string) => void;
}

export default function ChatInput({
  placeholder = "Ask Parity about this page...",
  onSend,
}: Props) {
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    onSend?.(text.trim());
    setText("");
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white py-1.5 pl-5 pr-1.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder={placeholder}
        aria-label="Ask Parity"
        className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-slate-400"
      />
      <button
        type="button"
        onClick={send}
        aria-label="Send"
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-[#8A8CF2] text-white hover:bg-[#7F82E8]"
      >
        →
      </button>
    </div>
  );
}