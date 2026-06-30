# AI出行决策 Agent — 设计文档

## 一、概述

构建一个本地场景短时活动**智能决策** Agent，接受自然语言目标，**一键决策**输出可解释的最优出行方案。

> **产品定位：核心竞争力是「一键决策」**（多维评分 + 可解释 + 个性化）。
> 系统**不做下单、预订、取号、支付、配送下单**等交易/履约动作，决策完成即为流程终点。

技术栈：TypeScript + Node.js (tsx 运行时)  
设计范式：Specification-Driven Development (SDD) + Harness Engineering

## 二、Planning 策略

采用 **分层递进式决策（Hierarchical Progressive Planning）**，共 5 阶段：

| 阶段 | 名称 | 功能 | 输入 → 输出 |
|------|------|------|-------------|
| S1 | intent_parsing | LLM 提取结构化约束 | 自然语言 → StructuredConstraints |
| S2 | follow_up_questions | 追问确认（主导角色/忌口/预算） | Constraints → FollowUpQuestion[] |
| S3 | candidate_generation | 搜索景点+餐厅+茶歇，组合方案 | Constraints → PlanCandidate[] (≤4) |
| S4 | feasibility_check | 可用性校验 + 通勤评估 | Candidates → ValidCandidates |
| S5 | fine_scheduling | 时间线编排 + 可行性评分 + 一键决策最优方案 | Candidates → SelectedPlan |

**设计考量**：
- 先粗筛后精校，避免无效 API 调用（先用距离+人群标签过滤，再逐个查可用性）
- 追问仅触发于 `needsFollowUp=true` 的角色（kids/elderly），避免过度交互
- 多 Tool 并行调用（S3 同时搜索 3 种地点）

## 三、工具调用链路

共 8 个 Tool（**仅决策相关，无下单/预订/取号/配送下单**），按决策流程组织：

```
用户输入
  ↓
get_user_location              → 获取用户定位（Mock→高德API）
  ↓
search_attractions            → 搜索景点（人群+距离+当地特色+关键词）
search_restaurants            → 搜索餐厅（忌口+儿童友好+老年餐）
search_break_places           → 搜索茶歇地点（茶馆/咖啡厅/儿童乐园）
  ↓
generate_followup_questions   → 生成追问（如需）
  ↓
check_attraction_availability → 查票余量（决策输入）
check_restaurant_availability → 查座位+排队（决策输入）
estimate_transit              → 通勤时间预估（多条路线，选最快）
  ↓
→ 多维评分 + 最优决策输出（流程终点，不下单）
```

每个 Tool 返回 `ToolResult<T>`（ok/degraded/failed），包含 `ToolTrace` 可回放。

## 四、用户模型设计

### 4.1 主导角色（LeadRole）
从自然语言推断出行主轴，决定规划倾向：

| LeadRole | 场景 | 茶歇偏好 | 是否追问 |
|----------|------|---------|---------|
| kids | 带娃 | 儿童室内乐园 | ✅ |
| elderly | 陪老人 | 茶馆 | ✅ |
| mixed_family | 老+小 | 茶馆 | ❌ (直接推断) |
| partner | 二人世界 | 咖啡/甜品 | ❌ |
| friends_group | 朋友聚会 | 咖啡/甜品 | ❌ |
| solo_relax | 独自 | 咖啡 | ❌ |

### 4.2 年龄分层与忌口推理
```
AgeGroup: { youngChildren(0-10), teens(10-15), adults(16-50), seniors(50+) }
  ↓ 自动推断
DietaryInference: { lightDiet, kidsFriendly, lowCalorie, softFood }
  ↓ 结合年龄+减肥标志 → 追问确认
dietaryRestrictions: ["轻油盐", "软食", ...]
```

### 4.3 茶歇决策链
```
LeadRole → breakPreference → search_break_places → 插入方案
  elderly   → tea_house    → 找附近茶馆
  kids      → kids_indoor_play → 找儿童主题乐园
  其他      → cafe_dessert → 找咖啡厅/甜品店
```

## 五、交通拥堵模型

**核心原则：用户要最短耗时，不关心拥堵等级。**

- 真实地图 API 返回多条路线，Agent 选 `estimatedMinutes` 最小的
- `TransitEstimate` 包含 `routes[]`（多条备选）、`best`（最优路线）、`bufferMinutes`（20%缓冲）
- 拥堵等级仅用于展示（🟢🟡🔴⛔），不影响排序
- 通勤惩罚按绝对耗时扣分：≤15min→0, ≤30min→-5, ≤45min→-10, >45min→-20

## 六、异常处理机制

| 异常 | 处理策略 |
|------|----------|
| 所有候选餐厅满座 | 扩大搜索半径，重新推荐 |
| 门票售罄 | 替换同类景点，重新编排 |
| 排队>30min | 标记方案不可行，降级到备选 |
| 通勤>90min | 直接扣40分，大概率过滤掉 |
| 用户拒绝方案 | 展示次优方案 |
| Mock API 超时 | Tool 层统一 catch → ToolResult.failed |

## 七、项目结构

```
ai-activity-agent/
├── spec/                  # SDD 契约层（类型 + 工具签名 + 约束规则）
│   ├── types.ts           # 核心类型（Group/Plan/Activity/Trace/ToolResult）
│   ├── tools.ts           # 8个决策Tool的完整输入输出签名
│   ├── constraints.ts     # 约束检查 + 可行性评分算法
│   ├── transit.ts         # 交通模型（拥堵等级/路线/惩罚分/Mock算法）
│   └── index.ts
├── src/
│   ├── data/mock.ts       # Mock数据集（6景点+5茶歇+6餐厅）
│   ├── tools/             # Tool实现层（8个决策Tool+基类+Registry，无下单/预订）
│   │   ├── base.ts        # BaseTool/SyncBaseTool (Trace自动记录)
│   │   ├── registry.ts    # 全局Tool注册中心单例
│   │   ├── location.ts    # get_user_location
│   │   ├── attractions.ts # 景点搜索/查余量
│   │   ├── restaurants.ts # 餐厅搜索/查位
│   │   ├── breaks.ts      # 茶歇搜索
│   │   ├── followup.ts    # 追问生成
│   │   └── transit.ts     # 通勤预估
│   ├── intent/parser.ts   # 意图解析（Mock LLM →关键词匹配）
│   ├── planner/
│   │   ├── engine.ts      # 5阶段一键决策引擎
│   │   └── scheduler.ts   # 时间线编排器（顺推法）
│   └── demo.ts            # CLI Demo 入口
├── eval/                  # Harness Engineering
│   ├── cases.ts           # 测试用例（家庭/朋友/老人/情侣4场景）
│   ├── metrics.ts         # 方案质量评分
│   └── runner.ts          # 自动评估运行器
├── DESIGN.md              # 本文件
├── package.json
└── tsconfig.json
```

## 八、运行方式

```bash
# 安装依赖
npm install

# 运行 CLI Demo
npm run demo

# 运行评估套件
npm run eval
```

## 九、后续扩展方向

- 替换 Mock LLM 为真实 API（OpenAI function calling structured output）
- 替换 Mock 通勤为高德/百度地图 Directions API
- 替换 Mock 定位为浏览器 Geolocation API
- 增加天气 API → 动态调整室内/室外景点权重
- Web UI（复用现有类型定义，Next.js + trpc）
