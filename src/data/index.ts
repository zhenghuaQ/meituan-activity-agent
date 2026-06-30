// ============================================================
// src/data/index.ts — 数据源工厂（单例）
//
// 依据配置特性开关选择 Provider：
//   flags.amap=on 且有 Key → AmapProvider（降级链指向 Mock）
//   否则                    → MockProvider
// 工具/引擎只调用 getDataSource()，对具体实现无感知。
// ============================================================

import type { DataSource } from "../../spec/datasource.js";
import { getAppConfig } from "../core/config.js";
import { childLogger } from "../core/logger.js";
import { MockProvider } from "./providers/mock-provider.js";
import { AmapProvider } from "./providers/amap-provider.js";

const log = childLogger("data:factory");

let _dataSource: DataSource | null = null;

function build(): DataSource {
  const cfg = getAppConfig();
  const mock = new MockProvider();

  if (cfg.flags.amap && process.env.AMAP_API_KEY) {
    log.info("数据源：AmapProvider（降级链 → Mock）");
    return new AmapProvider({
      apiKey: process.env.AMAP_API_KEY,
      fallback: mock,
    });
  }

  log.info("数据源：MockProvider（无高德 Key 或已关闭）");
  return mock;
}

/** 获取全局数据源单例 */
export function getDataSource(): DataSource {
  if (!_dataSource) _dataSource = build();
  return _dataSource;
}

/** 重置数据源（测试 / 配置变更后用） */
export function resetDataSource(): void {
  _dataSource = null;
}

export { MockProvider } from "./providers/mock-provider.js";
export { AmapProvider } from "./providers/amap-provider.js";
export { predictCrowd } from "./crowd.js";
