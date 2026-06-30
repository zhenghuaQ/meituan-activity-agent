// ============================================================
// src/core/logger.ts — 统一结构化日志（pino）
//
// 设计：
// - 开发/演示环境用 pino-pretty 彩色易读；生产用 JSON 结构化。
// - 通过 LOG_LEVEL 控制级别（默认 info），LOG_PRETTY=false 可强制 JSON。
// - 用 childLogger(mod) 给各模块打 { mod } 标签，便于检索与 Trace 聚合。
//
// 注意：CLI 展示输出（demo / eval 报告）仍走 console，属"界面"非"日志"。
// ============================================================

import pino from "pino";

const level = process.env.LOG_LEVEL || "info";
const pretty =
  process.env.LOG_PRETTY !== "false" && process.env.NODE_ENV !== "production";

export const logger = pino({
  level,
  ...(pretty
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

/** 创建带模块标签的子 logger */
export function childLogger(mod: string) {
  return logger.child({ mod });
}
