import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    res.status(500).json({ error: "OpenAI API key is not configured" });
    return;
  }

  try {
    const { messages } = req.body as { messages: { role: string; content: string }[] };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages format" });
      return;
    }

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages,
          stream: true,
        }),
      }
    );

    if (!openaiRes.ok) {
      const error = await openaiRes.json();
      console.error("OpenAI API error:", error);
      res.status(openaiRes.status).json({ error: "OpenAI API request failed", details: error });
      return;
    }

    if (!openaiRes.body) {
      res.status(500).json({ error: "No response body from OpenAI" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n").filter((l) => l.startsWith("data:"));
      for (const line of lines) {
        const payload = line.replace(/^data:\s*/, "");
        if (payload === "[DONE]") {
          res.write(`event: done\ndata: {}\n\n`);
          res.end();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices[0].delta?.content;
          if (delta) {
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch (e) {
          console.error("Error parsing OpenAI response:", e);
          // Continue processing other chunks even if one fails
        }
      }
    }
    res.end();
  } catch (error: any) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
