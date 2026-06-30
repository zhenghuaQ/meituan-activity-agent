// ============================================================
// src/tools/base.ts — Tool 基类 + Trace + 判别式联合
// ============================================================

import type { ToolTrace, ToolResult } from "../../spec/types.js";

/**
 * 通用 Tool 基类。
 * 所有 Tool 实现继承此类，自动获得 Trace 能力。
 */
export abstract class BaseTool<TInput, TOutput> {
  abstract name: string;
  abstract run(input: TInput): Promise<TOutput>;

  /** 执行并包装为 ToolResult，自动记录 Trace */
  async execute(input: TInput): Promise<ToolResult<TOutput>> {
    const start = performance.now();
    const timestamp = Date.now();

    try {
      const output = await this.run(input);
      const trace: ToolTrace = {
        toolName: this.name,
        input,
        output,
        latencyMs: Math.round(performance.now() - start),
        timestamp,
      };
      return { status: "ok", data: output, trace };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const trace: ToolTrace = {
        toolName: this.name,
        input,
        output: errorMsg,
        latencyMs: Math.round(performance.now() - start),
        timestamp,
      };
      return { status: "failed", error: errorMsg, trace };
    }
  }
}

/** 同步执行版本 */
export abstract class SyncBaseTool<TInput, TOutput> {
  abstract name: string;
  abstract run(input: TInput): TOutput;

  execute(input: TInput): ToolResult<TOutput> {
    const start = performance.now();
    const timestamp = Date.now();

    try {
      const output = this.run(input);
      const trace: ToolTrace = {
        toolName: this.name,
        input,
        output,
        latencyMs: Math.round(performance.now() - start),
        timestamp,
      };
      return { status: "ok", data: output, trace };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const trace: ToolTrace = {
        toolName: this.name,
        input,
        output: errorMsg,
        latencyMs: Math.round(performance.now() - start),
        timestamp,
      };
      return { status: "failed", error: errorMsg, trace };
    }
  }
}
