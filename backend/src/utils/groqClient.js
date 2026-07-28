function normalizeUsage(usage = {}) {
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens ?? usage.promptTokens ?? 0) || 0;
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens ?? usage.completionTokens ?? 0) || 0;
  const totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? inputTokens + outputTokens) || 0;
  return { inputTokens, outputTokens, totalTokens };
}

function estimateCost(modelName, usage = {}) {
  const model = String(modelName || "").toLowerCase();
  const rates =
    /gpt-4\.1|gpt-4o|gpt-4\.5/.test(model) ? { input: 5, output: 15 } :
    /o1|o3/.test(model) ? { input: 15, output: 60 } :
    {
      input: Number(process.env.LLM_INPUT_COST_PER_1M || 0),
      output: Number(process.env.LLM_OUTPUT_COST_PER_1M || 0),
    };

  if (!rates.input && !rates.output) return null;

  const normalized = normalizeUsage(usage);
  const estimated =
    (normalized.inputTokens / 1_000_000) * rates.input +
    (normalized.outputTokens / 1_000_000) * rates.output;

  return Number(estimated.toFixed(6));
}

function buildUsageSummary() {
  return {
    provider: "openai",
    model: "",
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };
}

function addUsageSummary(summary, usageResult = {}) {
  if (!summary || typeof summary !== "object") return summary;

  const normalized = normalizeUsage(usageResult.usage || usageResult);
  summary.calls += 1;
  summary.provider = usageResult.provider || summary.provider || "openai";
  summary.model = usageResult.model || summary.model || "";
  summary.inputTokens += normalized.inputTokens;
  summary.outputTokens += normalized.outputTokens;
  summary.totalTokens += normalized.totalTokens;

  const cost = Number(usageResult.estimatedCost);
  if (Number.isFinite(cost)) {
    summary.estimatedCost = Number((summary.estimatedCost + cost).toFixed(6));
  }

  return summary;
}

function formatUsageSummary(summary) {
  const normalized = normalizeUsage(summary || {});
  return {
    provider: String(summary?.provider || "openai"),
    model: String(summary?.model || ""),
    calls: Number(summary?.calls || 0),
    inputTokens: normalized.inputTokens,
    outputTokens: normalized.outputTokens,
    totalTokens: normalized.totalTokens,
    estimatedCost: Number.isFinite(Number(summary?.estimatedCost)) ? Number(summary.estimatedCost) : null,
  };
}

async function generateFromOpenAI(prompt) {
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || "gpt-4.1";
  const maxTokens = Number(process.env.LLM_MAX_TOKENS || 30000);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${details}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const finishReason = choice?.finish_reason;
  if (finishReason && finishReason !== "stop") {
    throw new Error(
      `LLM response stopped with finish_reason=${finishReason}. ` +
      "The generated script may be truncated. Try a shorter flow, a larger LLM_MAX_TOKENS value, or a bigger model."
    );
  }

  const usage = normalizeUsage(data.usage || {});
  return {
    text: choice?.message?.content || "",
    usage,
    estimatedCost: estimateCost(model, usage),
    model,
    provider: "openai",
  };
}

module.exports = {
  generateFromOpenAI,
  buildUsageSummary,
  addUsageSummary,
  formatUsageSummary,
  normalizeUsage,
};

// async function generateFromClaude(prompt) {
//   const apiKey = process.env.ANTHROPIC_API_KEY;
//   const model = process.env.ANTHROPIC_LLM_MODEL;
//   const maxTokens = Number(process.env.LLM_MAX_TOKENS || 30000);
//   if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing");
//   if (!model) throw new Error("ANTHROPIC_LLM_MODEL is missing");
//   const res = await fetch("https://api.anthropic.com/v1/messages", {
//     method: "POST",
//     headers: {
//       "x-api-key": apiKey,
//       "anthropic-version": "2023-06-01",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model,
//       temperature: 0.2,
//       max_tokens: maxTokens,
//       messages: [{ role: "user", content: prompt }],
//     }),
//   });
//   if (!res.ok) {
//     const details = await res.text();
//     throw new Error(`Anthropic request failed (${res.status}): ${details}`);
//   }
//   const data = await res.json();
//   const stopReason = data.stop_reason;
//   if (stopReason && stopReason !== "end_turn") {
//     throw new Error(`LLM response stopped with stop_reason=${stopReason}. The generated script may be truncated.`);
//   }
//   const textBlock = data.content?.find((block) => block.type === "text");
//   const usage = normalizeUsage(data.usage || {});
//   return { text: textBlock?.text || "", usage, estimatedCost: estimateCost(model, usage), model, provider: "anthropic" };
// }

// async function generateFromGroq(prompt) {
//   const baseUrl = (process.env.GROQ_API_URL || process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
//   const apiKey = process.env.GROQ_API_KEY;
//   const model = process.env.LLM_MODEL || "llama3-70b-8192";
//   if (!apiKey) throw new Error("GROQ_API_KEY is missing");
//   const res = await fetch(`${baseUrl}/chat/completions`, {
//     method: "POST",
//     headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model,
//       temperature: 0.2,
//       messages: [{ role: "user", content: prompt }],
//     }),
//   });
//   if (!res.ok) {
//     const details = await res.text();
//     throw new Error(`Groq request failed (${res.status}): ${details}`);
//   }
//   const data = await res.json();
//   return data.choices[0].message.content;
// }
