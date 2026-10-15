# 问题报告：Chatflow Agent 检索的知识库引用在前端不展示 / 展示不准

- 日期：2026-10-14
- Dify 版本：1.17.1（api git commit `8387590ace`）
- 前端：`webapp-conversation` fork（`Alixy-ai/webapp-conversation`，git commit `42b49e2`），通过 Dify **Service API**（APP_KEY）接入
- 场景：Chatflow 画布中使用 **Agent 节点（agent_v2）**，在 Agent 的知识集里配置知识库，由 Agent 调用 `knowledge_base_search` 工具检索，模型生成最终回答；期望在回答气泡下方展示知识库文档引用

---

## 1. 问题描述

1. **前端回答后没有任何引用/来源信息**。官方 Chat 的回答下方本应有 "CITATIONS" 区块，但 agent 检索路径下始终为空。
2. **即使能拿到引用，也存在语义问题**：Agent 多次搜索召回的块不一定都被最终答案使用，把全部召回列成"引用"会造成误导，需要区分：
   - **参考来源（consulted）**：本次回答参考了哪些资料（= 全部召回）；
   - **引用（cited）**：答案实际使用了哪些块（需要模型显式标注）。

## 2. 结论摘要（TL;DR）

- 前端引用区的唯一数据源是 `message.metadata.retriever_resources`（`message_end` 事件下发）。
- Chatflow 中唯一原生生产该数据的是 **LLM 节点**：当其 **Context** 绑定 Knowledge Retrieval 节点的 `result` 时发出 `RunRetrieverResourceEvent`（另有 Agent App 模式的 `DatasetIndexToolCallbackHandler`）。
- **Agent 节点（经典策略 Agent 与 agent_v2 知识路径）在所有路径上都不会上报检索资源**，所以引用永远为空；且 agent_v2 的工具检索结果目前在 API 侧被直接丢弃，前端 SSE 里也没有命中数据。
- 推荐方案：**A. 从 Agent 会话快照侧信道持出命中（consulted）**，在其上叠加 **B. 模型 marker 标注 `[S3]` 过滤（cited）**。两条合起来既不改协议、又支持历史会话。

## 3. 引用数据链路（现状）

```
前端 <Citation> 区块
  ← message_end.metadata.retriever_resources
  ← MessageCycleManager.handle_retriever_resources()   [按 (dataset_id, document_id) 去重、重排 position]
  ← QueueRetrieverResourcesEvent
  ← workflow_app_runner（NodeRunRetrieverResourceEvent 转换）
  ← RunRetrieverResourceEvent
  ← LLM 节点 _build_array_context_event()（唯一生产者）

Agent App（非本次场景）：
  DatasetRetrieverTool → DatasetIndexToolCallbackHandler.return_retriever_resource_info()
    → 直接 publish QueueRetrieverResourcesEvent

agent_v2 知识路径（本次场景，数据在此丢失）：
  Agent 模型 → knowledge_base_search 工具 → Dify 内层 API /inner/api/knowledge/retrieve
    → 结构化命中 → _format_observation() 纯文本 → 模型
    →（API 侧只记录事件计数，命中被丢弃）
```

关键开关：`show_retrieve_source`（应用配置 `retriever_resource.enabled`）。Debugger/预览强制开启（`api/core/app/apps/advanced_chat/app_generator.py:206`）；发布后的 Web App 需在「编排 → 功能 → 引用」打开。前端引用块仅在流式结束后渲染（`!responding`）。

## 4. 根因分析（逐文件）

| # | 位置 | 事实 |
|---|------|------|
| 1 | `api/core/workflow/nodes/agent/message_transformer.py:67` | 经典 Agent 节点的消息循环没有 `RETRIEVER_RESOURCES` 分支，检索资源消息被忽略 |
| 2 | `api/core/tools/workflow_as_tool/tool.py:138` | workflow 工具只取 `outputs`，丢弃 `data.metadata`（含内层流程产生的 `retriever_resources`） |
| 3 | `dify-agent/src/dify_agent/layers/knowledge/layer.py:431`（`_format_observation`） | 知识工具只把命中渲染成纯文本编号列表给模型；编号每次搜索从 1 重新开始（跨搜索不唯一） |
| 4 | `dify-agent/src/dify_agent/layers/knowledge/configs.py:241`（`DifyKnowledgeRuntimeState`） | 只持久化 eager（user_query 集）结果，`knowledge_base_search` 的结构化命中不落状态 |
| 5 | `api/core/workflow/nodes/agent_v2/agent_node.py:538` | 收到 agent 后端 stream event 时只调 `_record_stream_metadata()` 记计数器，工具调用结果被丢弃，不产生任何引用事件 |

结论：agent_v2 场景下，前端既拿不到结构化命中，也拿不到"被使用"的信息。

## 5. 前端数据可得性分析（重要）

- 本 fork 走 **Service API**，而 Service API 使用 `convert_stream_full_response`（`api/core/app/apps/base_app_generate_response_converter.py`），`node_finished` 事件是 `model_dump` **全量**下发，`outputs` 不会被抹掉；
- 只有 simple 路径（WEB_APP 等）才会用 `to_ignore_detail_dict()` 把 `inputs/process_data/outputs` 置 `None`（`api/core/app/apps/advanced_chat/generate_response_converter.py:147`、`api/core/app/entities/task_entities.py:460`）；
- 因此**画布上 Knowledge Retrieval 节点的 `outputs.result`（含 `metadata._source`：dataset/document/segment/score/hit_count/word_count/index_node_hash/content）在 fork 前端是可得的**（`app/components/index.tsx:640` 的 `onNodeFinished` 已存入 `workflowProcess.tracing`），截断阈值也很宽松（1000 数组项 / 100k 字符 / 1MB，`api/configs/feature/__init__.py`）；
- 但 agent_v2 的 `knowledge_base_search` 工具结果**不在** SSE 里（第 4 节 #5），纯前端无法还原。

**免费侧信道**：layer 的 `runtime_state` 会原样进入 `CompositorSessionSnapshot`（`dify-agent/src/agenton/compositor/schemas.py:100` 的 `layers[].runtime_state`），而 `RunSucceededEvent.session_snapshot` 本来就发回 Dify API。**把命中写入知识层 runtime_state，即可不改协议传到 API 侧。**

## 6. 方案对比

| 方案 | 语义 | 后端改动 | 前端改动 | 历史会话 | 风险 |
|------|------|----------|----------|----------|------|
| **A. 快照侧信道持出全部命中** | consulted（参考来源） | dify-agent 知识层 + agent_v2 节点（约 3 处） | 启用 `message_end.metadata.retriever_resources` + Citation UI | ✅ 自动（Dify 存 message metadata，`/messages` 返回） | 低 |
| **B. 在 A 基础上加模型 marker** | cited（引用） | A + 稳定 ref + 提示词 + API 侧过滤 | marker 解析 + 两级 UI | ✅ | 模型漏标/乱标，需校验与兜底 |
| **C. 基于 KB RETRIEVAL 节点 outputs 的纯前端提取** | consulted | 无 | `onNodeFinished` 提取 `outputs.result` + Citation UI | ⚠️ 仅同一浏览器会话（`localProcess` 同寿命），跨刷新需自建持久化 | 画布结构依赖（需存在 KB 节点，且走 Service API full response） |
| **D. LLM 节点 Context 绑定检索 result** | consulted | 无（改画布） | 启用一行注释 | ✅ | 会多一次模型调用或需替换 Agent，丢失 Agent 工具能力 |
| **E. 模型输出 `[文档名]` 轻量标注** | cited（仅名字） | 无 | 解析方括号渲染名字 chip | ❌ | 无片段/score/链接，名字可能打错 |

## 7. 推荐实施路径（A + B）

### 阶段 A：持出命中（consulted 先跑通）

1. `dify-agent/src/dify_agent/layers/knowledge/configs.py`
   - `DifyKnowledgeRuntimeState` 增加 `search_results`（ref → `DifyKnowledgeResult`）与自增计数；eager 路径同样记录结构化结果。
2. `dify-agent/src/dify_agent/layers/knowledge/layer.py`
   - `_retrieve_for_set` 成功后把命中的结构化结果写入 runtime_state（可通过 `output`/`_set` 等渠道回传）；`_format_observation` 可选加 `[S{n}]` 前缀（阶段 B 需要）。
3. `api/core/workflow/nodes/agent_v2/agent_node.py`
   - 终态事件里读 `terminal_event.session_snapshot` → 定位知识层 `runtime_state.search_results` → 转换为 `RetrievalSourceMetadata` → 在 `_run`（`agent_node.py:131` 已是生成器）中 `yield RunRetrieverResourceEvent(retriever_resources=..., context="")`。
   - 之后自动经 `workflow_app_runner` → `QueueRetrieverResourcesEvent` → message metadata 下发。
4. 前端 fork（`webapp-conversation`）
   - `app/components/index.tsx:556` `onMessageEnd`：启用 `responseItem.citation = messageEnd.metadata.retriever_resources`（现为第 576 行的注释）。
   - `app/components/chat/answer/index.tsx`：新增引用条（可移植官方 `web/app/components/base/chat/chat/citation/{index,popup}.tsx`），分组、弹层、score/hit info。
   - 文案按 consulted 语义使用「参考来源 / 检索到的资料」。

### 阶段 B：cited 过滤（只显示真正用到的）

1. （dify-agent）给每条命中分配**全局稳定 ref**（`[S1] [S2] …`，计数存 runtime_state，跨多次搜索与断点恢复不重号），observation 文本前缀该 ref；
2. （提示词）在 Agent soul 或 `knowledge_base_search` 的 tool description 中要求：引用事实时在句末标 `[S3]`；
3. （API）解析最终 output 中的 `[S\d+]`，只把被引用的 ref 作为 `RunRetrieverResourceEvent` 发出（或全发 + `used` 标记）；
4. （前端）正文中的 `[S3]` 渲染为上标/角标，footer 只列被引用的；建议做两级 UI：「本次引用 N 条」+ 折叠的「其他检索结果 M 条」。

## 8. 风险与兜底

- **模型漏标/乱标**：前端正则捞 `[S\d+]` 后必须校验 ref 是否存在，未知标记直接吞掉；需定义兜底——零标记时退化为"全量参考来源"或"不展示引用"。
- **ref 稳定性**：计数必须存 runtime_state，否则会话续跑/多次搜索会重号，导致映射错乱。
- **cited 只是模型自报**：前端只能验证标记存在性，无法证明内容真来自该块，不要把文案写成"已验证来源"。
- **历史会话**：方案 A/B 因数据落在 Dify message metadata 而天然支持；方案 C 需自建持久化（可在 `app/api/apps/[slug]/chat-messages/route.ts` tee SSE 后写入 `data/apps.db`）。

## 9. 附录：关键文件索引

Dify（`/Users/bradley/pgm/dify/dify`）：
- `api/core/app/apps/base_app_generate_response_converter.py`（SERVICE_API=full / 其他=simple）
- `api/core/app/apps/advanced_chat/generate_response_converter.py:147`、`api/core/app/entities/task_entities.py:460`（simple 路径抹掉 outputs）
- `api/core/app/apps/workflow_app_runner.py:627`（NodeRunRetrieverResourceEvent → QueueRetrieverResourcesEvent）
- `api/core/app/task_pipeline/message_cycle_manager.py:184`（handle_retriever_resources：去重/position/开关）
- `graphon/nodes/llm/node.py`（`_build_array_context_event` / `_convert_to_original_retriever_resource`）
- `api/core/workflow/nodes/knowledge_retrieval/knowledge_retrieval_node.py`（KB 节点 outputs）
- `api/core/workflow/nodes/agent_v2/agent_node.py:131,538`（agent_v2 生成器 / stream_event 丢弃点）
- `api/core/workflow/nodes/agent/message_transformer.py:67`（经典 Agent 无 RETRIEVER_RESOURCES 分支）
- `api/core/tools/workflow_as_tool/tool.py:138`（workflow 工具丢 metadata）

dify-agent（`/Users/bradley/pgm/dify/dify/dify-agent`）：
- `src/dify_agent/layers/knowledge/layer.py:431`（`_format_observation`）
- `src/dify_agent/layers/knowledge/configs.py:241`（`DifyKnowledgeRuntimeState`）
- `src/agenton/compositor/schemas.py:100`（`CompositorSessionSnapshot.layers[].runtime_state` 侧信道）
- `src/dify_agent/protocol/schemas.py`（RunSucceededEvent.session_snapshot）

webapp-conversation fork（`/Users/bradley/softdata/multica/pro/webapp-conversation`）：
- `app/components/index.tsx:556`（onMessageEnd，576 行为注释掉的 citation 赋值）、`:640`（onNodeFinished）、`:166`（localProcess 复用）
- `app/components/chat/type.ts:58`（`CitationItem`，字段与 `retriever_resources` 对齐）
- `app/components/chat/answer/index.tsx`（回答渲染，引用条插入点）
- `app/components/workflow/workflow-process.tsx` / `node.tsx`（现有 tracing 展示，含 outputs）
- `app/api/apps/[slug]/chat-messages/route.ts`（SSE 透传，可加持久化）