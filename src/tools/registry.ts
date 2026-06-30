// ============================================================
// src/tools/registry.ts — Tool 注册中心
// ============================================================

import type { ToolResult } from "../../spec/types.js";
import { GetUserLocationTool } from "./location.js";
import { SearchAttractionsTool, CheckAttractionAvailabilityTool } from "./attractions.js";
import { SearchRestaurantsTool, CheckRestaurantAvailabilityTool } from "./restaurants.js";
import { SearchBreakPlacesTool } from "./breaks.js";
import { GenerateFollowUpTool } from "./followup.js";
import { EstimateTransitTool } from "./transit.js";

/** 宽松的 Tool 接口 — 用于注册表统一管理 */
interface AnyTool {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (input: any) => Promise<ToolResult<any>> | ToolResult<any>;
}

/** Tool注册表 */
class ToolRegistry {
  private tools = new Map<string, AnyTool>();

  constructor() {
    const list: AnyTool[] = [
      new GetUserLocationTool(),
      new SearchAttractionsTool(),
      new SearchRestaurantsTool(),
      new SearchBreakPlacesTool(),
      new CheckAttractionAvailabilityTool(),
      new CheckRestaurantAvailabilityTool(),
      new GenerateFollowUpTool(),
      new EstimateTransitTool(),
    ];
    for (const t of list) {
      this.tools.set(t.name, t);
    }
  }

  get(name: string): AnyTool | undefined {
    return this.tools.get(name);
  }

  list(): string[] {
    return [...this.tools.keys()];
  }
}

/** 全局单例 */
export const toolRegistry = new ToolRegistry();
