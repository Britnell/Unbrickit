import { useState } from "react";

export default function ChatPage() {
  const [running, setRunning] = useState(false);
  return (
    <div className="grid place-items-center p-8">
      <button className="button" onClick={() => setRunning(!running)}>
        {running ? "⏹ Stop" : "▶ Start"}
      </button>
    </div>
  );
}
