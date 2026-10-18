/**
 * Reads the agent's streamed reply, calling `onChunk` with the text so far.
 * Falls back to a readable message if the connection drops midway.
 */
export async function streamAgent(
  message: string,
  history: { role: string; text: string }[],
  onChunk: (soFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!response.ok) {
    // Auth and validation errors come back as JSON. Anything else (a crash,
    // a gateway timeout) is HTML, so fall back to the status.
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.error ??
        `Sprout could not answer just now (error ${response.status}). Please try again.`,
    );
  }

  if (!response.body) throw new Error("No reply came back.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let soFar = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    soFar += decoder.decode(value, { stream: true });
    onChunk(soFar);
  }

  return soFar;
}
