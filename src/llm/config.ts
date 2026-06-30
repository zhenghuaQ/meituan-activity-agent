// ============================================================
// src/llm/config.ts — LLM 配置（OpenAI 兼容接口 + Mock 降级）
// ============================================================

import OpenAI from "openai";

export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

let _config: LLMConfig | null = null;

export function getLLMConfig(): LLMConfig {
  if (_config) return _config;

  const baseURL = process.env.LLM_BASE_URL || "";
  const apiKey = process.env.LLM_API_KEY || "";
  const model = process.env.LLM_MODEL || "deepseek-chat";
  const enabled = !!(baseURL && apiKey);

  _config = { baseURL, apiKey, model, enabled };
  return _config;
}

let _client: OpenAI | null = null;

export function getLLMClient(): OpenAI | null {
  const config = getLLMConfig();
  if (!config.enabled) return null;

  if (!_client) {
    _client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
  }
  return _client;
}

export function resetLLMConfig(): void {
  _config = null;
  _client = null;
}