export async function* parseSSE(stream: ReadableStream<Uint8Array> | null): AsyncGenerator<unknown> {
  if (!stream) {
    return;
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");

        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          yield JSON.parse(data);
        } catch {
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
