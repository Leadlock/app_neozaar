/**
 * Shared LLM Client — Azure AI Foundry / Azure OpenAI + Direct OpenAI fallback.
 *
 * PROVIDER SELECTION (automatic, based on environment variables):
 *
 *   Azure AI Foundry / Azure OpenAI  ← when AZURE_OPENAI_ENDPOINT is set
 *   Direct OpenAI API                ← fallback when AZURE_OPENAI_ENDPOINT is absent
 *
 * This means:
 *   - Production uses Azure AI Foundry with no code changes.
 *   - Local development works with a plain OPENAI_API_KEY.
 *   - Switching providers requires only env var changes, never code changes.
 *
 * REQUIRED ENV VARS (Azure):
 *   AZURE_OPENAI_ENDPOINT    — e.g. https://my-resource.openai.azure.com
 *   AZURE_OPENAI_API_KEY     — Azure OpenAI resource key
 *   AZURE_OPENAI_DEPLOYMENT  — deployment/model name, e.g. "gpt-4o"
 *   AZURE_OPENAI_API_VERSION — API version, e.g. "2024-02-01"
 *
 * REQUIRED ENV VARS (Direct OpenAI fallback):
 *   OPENAI_API_KEY           — OpenAI platform API key
 *   OPENAI_MODEL             — model name, e.g. "gpt-4o"  (default: "gpt-4o")
 *
 * USAGE (all callers — identical regardless of provider):
 *   import { getLLMClient, getLLMModel } from "../lib/llmClient";
 *   const client = getLLMClient();
 *   const response = await client.chat.completions.create({
 *     model: getLLMModel(),
 *     messages: [...],
 *   });
 *
 * ── Ported from Proposal Studio (openai ^4.52.7) into neozaar_backend (openai ^6.10.0) ──
 * Verified against the installed openai@6.10.0 API surface:
 *   - `require("openai")` still exposes `.default` (the OpenAI class) and a
 *     named `AzureOpenAI` export — same shape as v4.
 *   - `AzureOpenAI`'s constructor still accepts { endpoint, apiKey, apiVersion, deployment }.
 *   - `client.chat.completions.create({ model, messages, temperature, response_format })`
 *     is unchanged.
 * No code changes were required for the v4 → v6 jump.
 */

const OpenAIModule = require("openai");
const OpenAI = OpenAIModule.default;
const { AzureOpenAI } = OpenAIModule;

// ─────────────────────────────────────────────────────────────────────────────
// Provider detection
// ─────────────────────────────────────────────────────────────────────────────

function getProvider() {
  return process.env.AZURE_OPENAI_ENDPOINT ? "azure" : "openai";
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton client — instantiated once per process
// ─────────────────────────────────────────────────────────────────────────────

let _client = null;

/**
 * Returns the appropriate LLM client based on environment configuration.
 * Throws a descriptive error if required variables are missing.
 */
function getLLMClient() {
  if (_client) return _client;

  const provider = getProvider();

  if (provider === "azure") {
    let endpoint     = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey     = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";

    // Strip accidental path suffixes that cause 404s with the AzureOpenAI SDK.
    // The SDK appends its own path — it only needs the bare resource base URL.
    //   ✅  https://my-resource.openai.azure.com
    //   ❌  https://my-resource.openai.azure.com/openai/v1       → stripped
    //   ❌  https://my-resource.openai.azure.com/openai/deployments/gpt-4o → stripped
    const stripped = endpoint.replace(/\/openai(\/.*)?$/, "");
    if (stripped !== endpoint) {
      console.warn(
        `[LLMClient] AZURE_OPENAI_ENDPOINT had a trailing path ("${endpoint.slice(stripped.length)}") ` +
        `that was automatically removed.\n` +
        `The AzureOpenAI SDK requires only the base resource URL: ${stripped}\n` +
        `Update your .env to avoid this warning:\n` +
        `  AZURE_OPENAI_ENDPOINT=${stripped}`
      );
      endpoint = stripped;
    }

    // Detect placeholder values left over from .env.example
    if (endpoint.includes("<") || endpoint.includes(">") || !endpoint.startsWith("https://")) {
      throw new Error(
        "[LLMClient] AZURE_OPENAI_ENDPOINT contains a placeholder value: " + endpoint + "\n" +
        "Replace it with your real Azure OpenAI endpoint, e.g.:\n" +
        "  AZURE_OPENAI_ENDPOINT=https://my-resource.openai.azure.com\n" +
        "Find it in: Azure Portal → Azure OpenAI resource → Keys and Endpoint"
      );
    }

    if (!apiKey || apiKey.includes("<") || apiKey.includes(">")) {
      throw new Error(
        "[LLMClient] AZURE_OPENAI_API_KEY is missing or contains a placeholder.\n" +
        "Set it to your real Azure OpenAI key from:\n" +
        "  Azure Portal → Azure OpenAI resource → Keys and Endpoint → Key 1"
      );
    }

    _client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
      deployment,
    });

    console.info(
      `[LLMClient] Provider: Azure AI Foundry | Endpoint: ${endpoint} | Deployment: ${deployment}`
    );
  } else {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "[LLMClient] OPENAI_API_KEY is required when AZURE_OPENAI_ENDPOINT is not set.\n" +
        "Copy .env.example to .env and add your OpenAI API key."
      );
    }

    _client = new OpenAI({ apiKey });

    console.info(`[LLMClient] Provider: OpenAI Direct | Model: ${getLLMModel()}`);
  }

  return _client;
}

/**
 * Returns the model/deployment name to use in chat completion calls.
 *
 * Azure:        AZURE_OPENAI_DEPLOYMENT  (the deployment is the model name on Azure)
 * Direct OpenAI: OPENAI_MODEL            (default: "gpt-4o")
 */
function getLLMModel() {
  if (getProvider() === "azure") {
    return process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

/**
 * Reset the singleton — used in tests to force re-initialisation with
 * different environment variables.
 */
function resetLLMClient() {
  _client = null;
}

module.exports = { getProvider, getLLMClient, getLLMModel, resetLLMClient };
