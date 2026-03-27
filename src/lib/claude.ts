import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client singleton.
 * All Claude API calls go through this instance.
 */
const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

/**
 * Calls the Claude API and returns the raw text response.
 * Logs token usage and latency to console in development.
 *
 * @param params.system  - System prompt establishing Claude's role.
 * @param params.user    - User message (the actual prompt content).
 * @param params.model   - Model ID. Defaults to claude-sonnet-4-6.
 * @param params.maxTokens - Max tokens for the response.
 * @returns The text content of Claude's first response message.
 */
export async function callClaude({
  system,
  user,
  model = "claude-sonnet-4-6",
  maxTokens = 2000,
  apiKey,
}: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  apiKey?: string;
}): Promise<string> {
  const start = Date.now();
  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  const latencyMs = Date.now() - start;

  console.log(
    `[claude] model=${model} input=${message.usage.input_tokens} output=${message.usage.output_tokens} stop=${message.stop_reason} latency=${latencyMs}ms`
  );

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error(`Unexpected Claude response type: ${block.type}`);
  }

  return block.text;
}
