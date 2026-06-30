// ============================================================
// src/server/openapi.ts — OpenAPI 3.0 文档（手写，零依赖）
//
// 仅描述对外契约，作为前端联调与交付物的一部分；
// 由 /openapi.json 提供，/docs 用 CDN 版 Swagger UI 渲染。
// ============================================================

export function getOpenApiSpec(version: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "AI出行决策 API",
      version,
      description:
        "AI 智能出行/活动决策引擎。仅决策，不做任何下单/支付/履约。支持同步决策与 SSE 流式决策。",
    },
    servers: [{ url: "/", description: "当前服务" }],
    paths: {
      "/health": {
        get: {
          summary: "健康检查",
          responses: { "200": { description: "服务状态与特性开关" } },
        },
      },
      "/api/decide": {
        post: {
          summary: "同步一键决策",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DecideRequest" },
              },
            },
          },
          responses: {
            "200": { description: "决策结果（首推 + 帕累托多方案 + 可解释）" },
            "400": { description: "参数错误" },
            "429": { description: "触发限流" },
          },
        },
      },
      "/api/decide/stream": {
        get: {
          summary: "SSE 流式决策（实时推送 5 阶段过程）",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" }, description: "自然语言需求" },
            { name: "segment", in: "query", required: false, schema: { type: "string" }, description: "用户分层" },
            { name: "weather", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: { "200": { description: "text/event-stream，事件：stage / done / error" } },
        },
      },
      "/api/segments": {
        get: { summary: "列出用户分层", responses: { "200": { description: "分层列表" } } },
      },
      "/api/profiles": {
        get: { summary: "列出画像", responses: { "200": { description: "画像数组" } } },
        post: {
          summary: "创建/更新画像",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ProfileRequest" } },
            },
          },
          responses: { "200": { description: "已保存画像" } },
        },
      },
      "/api/profiles/{id}": {
        get: {
          summary: "获取画像",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "画像" }, "404": { description: "未找到" } },
        },
        delete: {
          summary: "删除画像",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "删除结果" } },
        },
      },
      "/api/metrics": {
        get: { summary: "运行时指标快照", responses: { "200": { description: "指标" } } },
      },
      "/api/admin/flags": {
        get: { summary: "查看运行时降级开关", responses: { "200": { description: "开关状态" } } },
        post: {
          summary: "设置运行时降级开关",
          requestBody: {
            content: { "application/json": { schema: { $ref: "#/components/schemas/FlagsRequest" } } },
          },
          responses: { "200": { description: "更新后的开关" } },
        },
      },
    },
    components: {
      schemas: {
        DecideRequest: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", description: "自然语言需求，如『周末带老婆孩子下午出去玩』" },
            segment: { type: "string", description: "用户分层（与 profileId 二选一）" },
            profileId: { type: "string", description: "已保存画像 ID" },
            autoSegment: { type: "boolean", description: "无画像时自动分层" },
            weather: { type: "string", enum: ["clear", "rain", "snow", "hot", "cold", "unknown"] },
          },
        },
        ProfileRequest: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            segment: { type: "string" },
            override: { type: "object" },
          },
        },
        FlagsRequest: {
          type: "object",
          properties: {
            rateLimit: { type: "boolean" },
            forceMockIntent: { type: "boolean" },
            cache: { type: "boolean" },
          },
        },
      },
    },
  };
}
