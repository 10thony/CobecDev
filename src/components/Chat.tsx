import React, {
  useState,
  useEffect,
  useRef,
  FormEvent,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  chatId: Id<"chats">;
  content: string;
  role: "user" | "assistant";
  userId?: Id<"users">;
};

type LocalMessage = {
  content: string;
  role: "user" | "assistant";
  createdAt: number;
};

export default function Chat() {
  // load persisted history
  const convexHistory = useQuery(api.messages.list, { chatId: "skip" as Id<"chats"> }) || [];
  const addMessage = useMutation(api.messages.send);

  // local UI state
  const [messages, setMessages] = useState<(Message | LocalMessage)[]>(convexHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // mirror convex → local
  useEffect(() => {
    setMessages(convexHistory);
  }, [convexHistory]);

  // scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const userMsg: LocalMessage = {
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    await addMessage({
      chatId: "skip" as Id<"chats">, content: userMsg.content,
      apiKey: ""
    });
    setInput("");
    // placeholder for assistant
    const assistantPlaceholder: LocalMessage = {
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, assistantPlaceholder]);

    // start streaming from our API
    setStreaming(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.body) {
      console.error("No response body");
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";
    let placeholderIndex = messages.length; // where we inserted it

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n").filter((l) =>
        l.startsWith("data:")
      );
      for (const line of lines) {
        const payload = line.replace(/^data:\s*/, "");
        if (payload === "{}") {
          // end marker
          break;
        }
        const { delta } = JSON.parse(payload);
        if (delta) {
          assistantText += delta;
          setMessages((msgs) => {
            const copy = [...msgs];
            copy[placeholderIndex] = {
              ...copy[placeholderIndex],
              content: assistantText,
            };
            return copy;
          });
        }
      }
    }
    // persist final assistant message
    await addMessage({
      chatId: "skip" as Id<"chats">, content: assistantText,
      apiKey: ""
    });
    setStreaming(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <div
        style={{
          border: "1px solid #ccc",
          padding: 12,
          height: 400,
          overflowY: "auto",
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "8px 0" }}>
            <strong>{m.role === "user" ? "You" : "AI"}:</strong>{" "}
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          style={{ width: "80%", padding: 8 }}
          placeholder="Type a message…"
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
