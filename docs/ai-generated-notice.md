# 后台「AI 生成提示」配置 — 具体方案

> 目标：在小程序（chat web app）里向用户明示「内容由 AI 生成」，后台可开关、可自定义文案、可选择展示位置（输入框下方 hint / 每条 AI 回答下方）。
> 本文是可直接照着实现的实施方案，字段名、SQL、接口、组件落点均已对齐当前仓库代码。

## 0. 结论速览

| 项 | 决策 |
| --- | --- |
| 配置粒度 | **per-app**（跟随 `apps` 表，与 `showPoweredBy` / `icon` 同一层），不改全局 |
| 字段 | `aiNoticeEnabled: boolean`、`aiNoticeText: string`、`aiNoticePosition: 'input_hint' \| 'answer_footer'` |
| 存储 | `data/apps.db` 的 `apps` 表新增 3 列 + 幂等 `ALTER TABLE` 迁移 |
| 下发 | 复用 `toPublicApp()` 白名单 → `app/apps/[slug]/page.tsx` 的 `AppProvider` → 前端 `useApp()`，**零额外请求、无首屏闪烁** |
| 渲染 | 新组件 `app/components/chat/ai-notice.tsx`；输入区落点 `app/components/chat/index.tsx`，回答落点 `app/components/chat/answer/index.tsx` |
| 默认值 | 开关默认 **关**；文案留空 → 回退内置多语言默认文案（6 语）；位置默认 `input_hint` |
| 长度限制 | `AI_NOTICE_TEXT_MAX_LEN = 200` 字符（按 Unicode 码点计），前后端共用同一常量 |
| 语言 | MVP：自定义文案为应用级单语言，内置默认文案走 i18n（6 语言）；按语言分别配置列为 P2 |

## 1. 需求拆解与验收标准

| # | 需求点 | 验收标准 |
| --- | --- | --- |
| 1 | 后台开关 | `/admin` 新建/编辑应用可开启；关闭时前端不渲染任何提示（连占位高度都没有） |
| 2 | 自定义提示内容 | 填了文案 → 前端展示该文案；留空 → 展示内置多语言默认文案 |
| 3 | 位置：输入框下方 hint | 展示在聊天输入卡片**正下方**（居中、灰色小字），与输入区同显同隐 |
| 4 | 位置：回答消息下方 | **每条** assistant 消息气泡底部展示；流式响应中不展示，回答结束后展示 |
| 5 | 不破坏现有能力 | 反馈按钮、建议问题、引用文本、agent 思考过程、移动端抽屉布局均不受影响 |

## 2. 数据模型与存储

### 2.1 表结构（`lib/apps/db.ts`）

在 `SCHEMA` 的 `apps` 表里追加 3 列（新库直接建好）：

```sql
  ai_notice_enabled  INTEGER NOT NULL DEFAULT 0,
  ai_notice_text     TEXT    NOT NULL DEFAULT '',
  ai_notice_position TEXT    NOT NULL DEFAULT 'input_hint',
```

### 2.2 幂等迁移（老库必需）

`SCHEMA` 走的是 `CREATE TABLE IF NOT EXISTS`，**已有 db 不会自动加列**，因此在 `getDb()` 里加一次 `migrate()`：

```ts
const AI_NOTICE_COLUMNS: Array<[string, string]> = [
  ['ai_notice_enabled', 'INTEGER NOT NULL DEFAULT 0'],
  ['ai_notice_text', 'TEXT NOT NULL DEFAULT \'\''],
  ['ai_notice_position', 'TEXT NOT NULL DEFAULT \'input_hint\''],
]

/** `CREATE TABLE IF NOT EXISTS` 不会给老库补列，这里按需 ALTER，可重复执行。 */
const migrate = (db: DatabaseSync) => {
  const existing = new Set(
    (db.prepare('SELECT name FROM pragma_table_info(\'apps\')').all() as { name: string }[])
      .map(column => column.name),
  )
  for (const [name, definition] of AI_NOTICE_COLUMNS) {
    if (!existing.has(name)) { db.exec(`ALTER TABLE apps ADD COLUMN ${name} ${definition}`) }
  }
}
```

调用点（`getDb()` 内，`db.exec(SCHEMA)` 之后）：

```ts
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(SCHEMA)
  migrate(db)
```

要点：
- `pragma_table_info('apps')` 是表值函数，`node:sqlite`（Node v22.23.2）的 `prepare().all()` 可正常读取（比裸 `PRAGMA` 更稳）。
- 迁移是**加列 + 带默认值**，不重写数据、不锁表长事务，WAL 模式下在线执行安全；必须在 `getDb()` 的可写连接上执行。
- 回滚策略：三列保留即可（旧代码 `SELECT *` + `fromRow` 不读它们，天然兼容）。

> 已实测：把当前 `data/apps.db` 复制一份后执行上述 `migrate()`，三列成功追加、连跑两次不报错（幂等），既有 14 行数据全部保留且取到默认值 `0 / '' / 'input_hint'`；实测环境 `data/apps.db` 当前**还没有** `ai_notice_*` 列，与“必须迁移”的判断一致。

### 2.3 环境变量 seed（单应用老部署）

`config/server.ts`（`server-only`，避免把变量名混进前端 bundle）：

```ts
/** 默认的 AI 生成提示配置，仅用于首次 seed（apps 表为空时）。 */
const position = process.env.AI_NOTICE_POSITION
export const AI_NOTICE = {
  enabled: process.env.AI_NOTICE_ENABLED === 'true',
  text: process.env.AI_NOTICE_TEXT || '',
  position: isAiNoticePosition(position) ? position : DEFAULT_AI_NOTICE_POSITION,
}
```

`.env.example` 追加：

```bash
# ---- AI generated notice (seeded into the registry on first start) ---------
AI_NOTICE_ENABLED=false
AI_NOTICE_TEXT=
AI_NOTICE_POSITION=input_hint
```

`lib/apps/registry.ts` 的 `seedFromEnv()` 里带上这三个值（与 `showPoweredBy` 同一个 upsert）。

### 2.4 类型与映射

`config/index.ts`（单一事实来源，客户端 / 服务端 / 后台表单共用）：

```ts
// ── AI generated notice ─────────────────────────────────────────────────────
export const AI_NOTICE_POSITIONS = ['input_hint', 'answer_footer'] as const
export type AiNoticePosition = typeof AI_NOTICE_POSITIONS[number]
export const DEFAULT_AI_NOTICE_POSITION: AiNoticePosition = 'input_hint'
/** 按 Unicode 码点计数的上限，后台表单与 API 校验共用。 */
export const AI_NOTICE_TEXT_MAX_LEN = 200
export const isAiNoticePosition = (value: unknown): value is AiNoticePosition =>
  typeof value === 'string' && (AI_NOTICE_POSITIONS as readonly string[]).includes(value)
```

`lib/apps/types.ts`：

```ts
import type { AiNoticePosition } from '@/config'

export interface AppRecord {
  // …existing
  aiNoticeEnabled: boolean
  aiNoticeText: string
  aiNoticePosition: AiNoticePosition
}

export interface PublicApp {
  // …existing
  aiNoticeEnabled: boolean
  aiNoticeText: string
  aiNoticePosition: AiNoticePosition
}

export const toPublicApp = (app: AppRecord): PublicApp => ({
  // …existing
  aiNoticeEnabled: app.aiNoticeEnabled,
  aiNoticeText: app.aiNoticeText,
  aiNoticePosition: app.aiNoticePosition,
})
```

`AppInput` 已经是 `Partial<Omit<AppRecord, …>>`，三个字段自动可写，无需改。

`lib/apps/registry.ts`：

```ts
const fromRow = (row: Record<string, any>): AppRecord => ({
  // …existing
  aiNoticeEnabled: !!row.ai_notice_enabled,
  aiNoticeText: row.ai_notice_text ?? '',
  aiNoticePosition: isAiNoticePosition(row.ai_notice_position) ? row.ai_notice_position : DEFAULT_AI_NOTICE_POSITION,
})

// upsertApp 的 merged 里：
  aiNoticeEnabled: input.aiNoticeEnabled ?? existing?.aiNoticeEnabled ?? false,
  aiNoticeText: input.aiNoticeText ?? existing?.aiNoticeText ?? '',
  aiNoticePosition: input.aiNoticePosition ?? existing?.aiNoticePosition ?? DEFAULT_AI_NOTICE_POSITION,
```

INSERT / `ON CONFLICT DO UPDATE` 两处都要补列（`ai_notice_enabled` 存 `? : 0` / `? : 1`）。

## 3. 后台配置项设计（Admin UI）

### 3.1 富化后的表单模型（`app/admin/(dashboard)/_components/app-dialog.tsx`）

```ts
export interface AppFormValues {
  // …existing
  aiNoticeEnabled: boolean
  aiNoticeText: string
  aiNoticePosition: AiNoticePosition
}

export const emptyAppForm = (): AppFormValues => ({
  // …existing
  aiNoticeEnabled: false,
  aiNoticeText: '',
  aiNoticePosition: DEFAULT_AI_NOTICE_POSITION,
})

export const appToForm = (app: PublicApp): AppFormValues => ({
  // …existing
  aiNoticeEnabled: app.aiNoticeEnabled,
  aiNoticeText: app.aiNoticeText,
  aiNoticePosition: app.aiNoticePosition,
})

export const AI_NOTICE_POSITION_LABELS: Record<AiNoticePosition, string> = {
  input_hint: 'Below the input box (hint)',
  answer_footer: 'Below every answer',
}
```

提交 body 增加 `aiNoticeEnabled` / `aiNoticeText` / `aiNoticePosition` 三键（`apiKey` 空值语义保持不变）。

### 3.2 表单区块（插在 “Presentation” 分组之后）

```tsx
<p className='mt-6 text-[11px] font-medium uppercase tracking-wide text-gray-400'>AI generated notice</p>
<div className='mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2'>
  <div className='sm:col-span-2'>
    <label className='flex items-center gap-2 text-xs text-gray-600'>
      <input
        type='checkbox'
        className='h-3.5 w-3.5 rounded border-gray-300'
        checked={form.aiNoticeEnabled}
        onChange={e => set('aiNoticeEnabled', e.target.checked)}
      />
      Tell visitors that the answers are AI generated
    </label>
  </div>

  <div>
    <label className={label}>Position</label>
    <div className='mt-1 space-y-1.5'>
      {AI_NOTICE_POSITIONS.map(position => (
        <label
          key={position}
          className={cn('flex items-center gap-2 text-xs', form.aiNoticeEnabled ? 'text-gray-600' : 'text-gray-300')}
        >
          <input
            type='radio'
            name='ai-notice-position'
            className='h-3.5 w-3.5 border-gray-300'
            checked={form.aiNoticePosition === position}
            disabled={!form.aiNoticeEnabled}
            onChange={() => set('aiNoticePosition', position)}
          />
          {AI_NOTICE_POSITION_LABELS[position]}
        </label>
      ))}
    </div>
  </div>

  <div>
    <label className={label} htmlFor='app-ai-notice-text'>Custom text</label>
    <textarea
      id='app-ai-notice-text'
      rows={3}
      maxLength={AI_NOTICE_TEXT_MAX_LEN}
      className={`${input} resize-y`}
      value={form.aiNoticeText}
      disabled={!form.aiNoticeEnabled}
      placeholder='Leave empty to use the localised default'
      onChange={e => set('aiNoticeText', e.target.value)}
    />
    <p className='mt-1 flex items-center justify-between text-[11px] text-gray-400'>
      <span>Empty falls back to the built-in text for each language.</span>
      <span className='tabular-nums'>{Array.from(form.aiNoticeText).length}/{AI_NOTICE_TEXT_MAX_LEN}</span>
    </p>
  </div>
</div>
```

交互约定：
- 开关关闭 → 位置与文案控件 **disabled 但仍可见**（保留已配置值，不静默清空）。
- `maxLength` 硬限制 + 实时码点计数（emoji 不会被算成 2）。
- 文案提交前 `trim()`，全空白等同于“使用默认文案”。

### 3.3 列表页（`app/admin/(dashboard)/page.tsx`，可选）

在 Status 列旁加一个只读 pill：`aiNoticeEnabled` 时显示 `AI`，hover `title` 展示位置与文案摘要，便于运营快速核对。非必需，可延后。

## 4. 接口与数据流

### 4.1 Admin API

| 接口 | 变更 |
| --- | --- |
| `GET /api/admin/apps` | 无需改动，`toPublicApp` 自动带出三字段 |
| `POST /api/admin/apps` | 校验并透传三字段 |
| `PUT /api/admin/apps/[id]` | 同上；缺省字段保持旧值（`upsertApp` 的 `?? existing` 语义） |

新增 `lib/apps/ai-notice.ts`（`server-only`，两个路由共用）：

```ts
import 'server-only'
import { AI_NOTICE_POSITIONS, AI_NOTICE_TEXT_MAX_LEN, isAiNoticePosition } from '@/config'
import type { AiNoticePosition } from '@/config'

export interface AiNoticeInput {
  aiNoticeEnabled?: boolean
  aiNoticeText?: string
  aiNoticePosition?: AiNoticePosition
}

/** 只挑出 AI 提示相关字段；缺失表示“保持旧值”，非法返回 error。 */
export const normalizeAiNotice = (body: Record<string, unknown>): { value: AiNoticeInput } | { error: string } => {
  const value: AiNoticeInput = {}

  if (body.aiNoticeEnabled !== undefined) {
    if (typeof body.aiNoticeEnabled !== 'boolean') { return { error: 'aiNoticeEnabled must be a boolean' } }
    value.aiNoticeEnabled = body.aiNoticeEnabled
  }

  if (body.aiNoticeText !== undefined) {
    if (typeof body.aiNoticeText !== 'string') { return { error: 'aiNoticeText must be a string' } }
    const text = body.aiNoticeText.trim()
    if (Array.from(text).length > AI_NOTICE_TEXT_MAX_LEN) {
      return { error: `aiNoticeText must be at most ${AI_NOTICE_TEXT_MAX_LEN} characters` }
    }
    value.aiNoticeText = text
  }

  if (body.aiNoticePosition !== undefined) {
    if (!isAiNoticePosition(body.aiNoticePosition)) {
      return { error: `aiNoticePosition must be one of ${AI_NOTICE_POSITIONS.join(', ')}` }
    }
    value.aiNoticePosition = body.aiNoticePosition
  }

  return { value }
}
```

路由里用法（`POST` / `PUT` 一致，返回 400 的风格与现有 slug 校验保持一致）：

```ts
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const notice = normalizeAiNotice(body)
  if ('error' in notice) { return NextResponse.json({ error: notice.error }, { status: 400 }) }

  const app = upsertApp({ ...body, ...notice.value, id: body.id as string, slug: body.slug as string, apiKey: body.apiKey as string })
```

### 4.2 公共页面数据流（关键决策）

- **采用**：`toPublicApp()` → `app/apps/[slug]/page.tsx`（server component，已 `resolveApp`）→ `<AppProvider app={publicApp}>` → 客户端 `useApp()`。聊天页首屏就带着配置，不需要额外请求，也不会“先无提示后闪现”。
- **不采用**：塞进 `/api/apps/[slug]/parameters`，会多一次往返且首屏闪烁（该接口直接透传 Dify 返回，混入自有字段还会破坏语义）。
- ⚠️ `toPublicApp` 是**白名单**：漏加字段会导致前端永远读不到（静默失败），这是本次最高优先级的回归点。

## 5. 前端渲染方案

### 5.1 新组件 `app/components/chat/ai-notice.tsx`

```tsx
'use client'
import type { FC } from 'react'
import React from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiSparkling2Line } from '@remixicon/react'
import { useApp } from '@/app/components/app-context'
import type { AiNoticePosition } from '@/config'

interface IAiNoticeProps {
  placement: AiNoticePosition
  className?: string
}

const AiNotice: FC<IAiNoticeProps> = ({ placement, className }) => {
  const { t } = useTranslation()
  const { aiNoticeEnabled, aiNoticeText, aiNoticePosition } = useApp()

  if (!aiNoticeEnabled || aiNoticePosition !== placement) { return null }

  const text = aiNoticeText.trim() || (t('app.chat.aiNotice.default') as string)
  if (!text) { return null }

  return (
    <p
      role='note'
      title={text}
      className={cn(
        'flex items-center gap-1 text-xs leading-5 text-gray-400 break-words',
        placement === 'input_hint' ? 'mt-1.5 justify-center px-1 line-clamp-2' : 'mt-1',
        className,
      )}
    >
      <RiSparkling2Line className='h-3.5 w-3.5 shrink-0' />
      <span className='min-w-0'>{text}</span>
    </p>
  )
}

export default React.memo(AiNotice)
```

约定：
- 关闭时直接 `return null`（不渲染空节点，不留间距）。
- 文案一律作为**纯文本**渲染，禁止 `dangerouslySetInnerHTML`。
- 从 context 读配置而不是 prop drilling：`Answer` 是 `React.memo`，context 更新仍会重渲染，且不用改 `Chat` / `Answer` 的 props 签名。
- 图标用 `@remixicon/react` 的 `RiSparkling2Line`（已确认存在于当前依赖版本，仓库其它位置也在用 `RiSendPlane2Fill`）。

### 5.2 落点 A：输入框下方 hint（`app/components/chat/index.tsx`）

现有结构：

```tsx
<div className='sticky bottom-0 z-10 mt-4 pb-3 bg-gradient-to-t from-white via-white to-transparent'>
  <div className='rounded-2xl border border-gray-200 bg-white shadow-sm …'>…输入框与工具栏…</div>
</div>
```

改成（新增行在圆角卡片**之外**、sticky 容器**之内**）：

```tsx
  <div className='rounded-2xl border border-gray-200 bg-white shadow-sm …'>…</div>
  <AiNotice placement='input_hint' />
</div>
```

原因：
- 放进输入卡片内部会挤压输入区，且触发 `focus-within` 阴影/边框态，观感不对；放卡片外才是“输入框下方的 hint”。
- 该位置本来就在 `!isHideSendInput` 分支内 → 输入区隐藏时提示一并隐藏，语义自洽。
- `sticky + bg-gradient` 容器已处理底部渐变过渡，hint 跟着一起吸底，不必额外加背景。

### 5.3 落点 B：回答消息下方（`app/components/chat/answer/index.tsx`）

现有顺序：`workflowProcess` → `content`（`StreamdownMarkdown` / agent 思考）→ `suggestedQuestions` → 反馈操作行（`h-7`，`opacity-0 group-hover/answer:opacity-100`）。

新增在**操作行之后**（气泡最底部）：

```tsx
            <div className='mt-1 flex flex-row justify-start gap-1 h-7 opacity-0 group-hover/answer:opacity-100 transition-opacity'>
              {!feedbackDisabled && !item.feedbackDisabled && renderItemOperation()}
              {!feedbackDisabled && renderFeedbackRating(feedback?.rating)}
            </div>
            {!isResponding && !item.isError && <AiNotice placement='answer_footer' />}
```

决策与理由：
- 放在操作行下面而不是上面：操作行高度固定（`h-7`）且 hover 才显形；若提示行夹在内容与操作行之间，hover 时视觉层级会错乱。放在最后一行，提示常驻、不被 hover 影响。
- `!isResponding`：流式输出过程中不显示，回答结束后再出现，避免文案随 token 抖动/提前宣称“AI 生成”。
- `!item.isError`：错误占位消息没有 AI 内容，不显示标识。
- 开场白（`item.isOpeningStatement`，来自应用配置而非运行时生成）**建议照常显示**（透明度优先、视觉统一）。若产品要求严格区分，只需追加 `&& !item.isOpeningStatement`。
- agent 模式（`agent_thoughts`）同样在整体底部显示一次，不在每个 thought 内重复。
- `item.id === chatList[chatList.length - 1].id` 才有 `isResponding=true`，历史消息恒为 `false` → 每条历史回答都会带标识。

### 5.4 位置 / 状态矩阵

| 场景 | `input_hint` | `answer_footer` |
| --- | --- | --- |
| 开关关闭 | 不渲染 | 不渲染 |
| 自定义文案为空 | 显示内置多语言默认文案 | 同左 |
| 自定义文案为纯空白 | 视同为空 → 默认文案 | 同左 |
| 流式响应中 | 正常显示 | **不显示**（响应结束后出现） |
| 回答报错占位 | 正常显示 | **不显示** |
| 未开始对话（Welcome 页，`hasSetInputs=false`） | 不显示（聊天输入区尚未渲染） | — |
| `isHideSendInput` 为真 | 不显示 | 正常显示 |
| 移动端 | 居中、`line-clamp-2`、`px-2` | 与内容同宽，左对齐 |
| 只有 1 条回答 / N 条回答 | 1 条 hint | 每条 assistant 消息各 1 条 |

### 5.5 多语言

- 内置默认文案走 i18n：新增 key `app.chat.aiNotice.default`，**6 个语言文件全补**（`i18n/lang/app.{en,zh,es,vi,ja,fr}.ts`），缺失时 i18next `fallbackLng: 'en'` 兜底。
  - en：`This content is AI generated. Please verify important information.`
  - zh-Hans：`本内容由 AI 生成，请注意甄别。`
  - es / vi / ja / fr 各写对应译文（与现有 `powerBy` 的 6 语写法一致）。
- locale 由 `setLocaleOnClient(appInfo.default_language, true)` 按应用默认语言设定；切换语言会 `location.reload()`（`i18n/client.ts`），无需处理运行时热切换。
- 自定义文案为**应用级单语言文本**，不做 i18n 插值（后台输入什么就显示什么）。这是与需求一致的取舍：允许运营自己写双语文本。
- P2（如确需按语言分别配置）：加 `ai_notice_text_i18n TEXT NOT NULL DEFAULT ''`（JSON map）+ 后台 6 个输入框，解析顺序 `语言覆盖 → 通用文案 → 内置默认`；前端取值逻辑封装在 `AiNotice` 内，不影响调用方。

### 5.6 长度与边界处理

| 项 | 处理 |
| --- | --- |
| 上限 | `AI_NOTICE_TEXT_MAX_LEN = 200`，定义在 `config/index.ts`，后台表单 / API 校验 / 文档共用 |
| 计数方式 | `Array.from(text).length`（码点，emoji 算 1），不使用 `text.length` |
| 后台 | `maxLength` 硬限制 + `{used}/{MAX}` 实时计数 |
| 服务端 | 超长 → `400 { error: 'aiNoticeText must be at most 200 characters' }`（与 slug 校验风格一致，不静默截断） |
| 存储 | SQLite `TEXT` 无长度约束，SQLite 的 `ALTER TABLE` 也不便追加 `CHECK`；以 API 层为权威 |
| 渲染 | `line-clamp-2` + `title` 全文兜底，避免超长文案撑破气泡/输入区 |
| XSS | 纯文本渲染；管理端为可信来源，仍不做 HTML 解析 |
| 空值 | `''` / 空白 → 回退默认文案；三列在 DB 层都有 `NOT NULL DEFAULT` |

## 6. 字段总览

| 字段（API/TS） | 列（SQLite） | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `aiNoticeEnabled` | `ai_notice_enabled` | boolean / INTEGER | `false`(0) | 总开关 |
| `aiNoticeText` | `ai_notice_text` | string / TEXT | `''` | 自定义文案，空 → i18n 默认；≤200 码点 |
| `aiNoticePosition` | `ai_notice_position` | `'input_hint' \| 'answer_footer'` | `'input_hint'` | 展示位置；非法值读取时回退默认 |

## 7. 可执行实现步骤

| 步骤 | 动作 | 涉及文件 |
| --- | --- | --- |
| 1 | 加常量与枚举（`AI_NOTICE_POSITIONS` / `AiNoticePosition` / `DEFAULT_AI_NOTICE_POSITION` / `AI_NOTICE_TEXT_MAX_LEN` / `isAiNoticePosition`） | `config/index.ts` |
| 2 | 加 seed 默认值 + 文档化 | `config/server.ts`、`.env.example` |
| 3 | 表结构加 3 列 + `migrate()` 幂等补列 + 在 `getDb()` 调用 | `lib/apps/db.ts` |
| 4 | 类型白名单补齐（`AppRecord` / `PublicApp` / `toPublicApp`） | `lib/apps/types.ts` |
| 5 | 映射与读写补齐（`fromRow` / `upsertApp` 的 merged、INSERT、`ON CONFLICT` / `seedFromEnv`） | `lib/apps/registry.ts` |
| 6 | 新增校验模块 `normalizeAiNotice` | `lib/apps/ai-notice.ts`（新增） |
| 7 | POST / PUT 接入校验与透传 | `app/api/admin/apps/route.ts`、`app/api/admin/apps/[id]/route.ts` |
| 8 | 后台表单：`AppFormValues` / `emptyAppForm` / `appToForm` / 新表单区块 / 提交 body | `app/admin/(dashboard)/_components/app-dialog.tsx` |
| 9 | 新增展示组件 | `app/components/chat/ai-notice.tsx`（新增） |
| 10 | 输入框下方 hint 落点 | `app/components/chat/index.tsx` |
| 11 | 回答下方 footer 落点 | `app/components/chat/answer/index.tsx` |
| 12 | 6 个语言补 `app.chat.aiNotice.default` | `i18n/lang/app.{en,zh,es,vi,ja,fr}.ts` |
| 13 | 文档化字段 / 接口 / 环境变量 | `README.md` |
| 14 | 可选：后台列表 `AI` pill | `app/admin/(dashboard)/page.tsx` |

### 验证

```bash
pnpm lint          # eslint（@antfu 风格：2 空格、单引号、无分号）
pnpm build         # next build + TS 类型检查
```

迁移自检（老库升级前后列结构一致）：

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/apps.db');console.log(db.prepare(\"SELECT name FROM pragma_table_info('apps')\").all().map(r=>r.name).join(','))"
# 老 Node 需加 --experimental-sqlite
```

接口自检：

```bash
curl -H "x-admin-token: $ADMIN_TOKEN" localhost:3000/api/admin/apps | head

curl -X PUT localhost:3000/api/admin/apps/<id> -H "x-admin-token: $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"aiNoticeEnabled":true,"aiNoticeText":"本内容由 AI 生成，请注意甄别。","aiNoticePosition":"answer_footer"}'

# 期望 400
curl -X PUT localhost:3000/api/admin/apps/<id> -H "x-admin-token: $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"aiNoticePosition":"sidebar"}'
```

人工验收清单：
1. 后台开启 + `input_hint` + 留空 → `/apps/<slug>` 输入卡片下方出现本地化默认文案；输入区隐藏/未开始对话时不出现。
2. 切到 `answer_footer` → hint 消失，每条回答结束后底部出现文案；流式过程中不出现。
3. 自定义文案超长（>200）后台无法输入；绕过前端直调 API 返回 400。
4. 关闭开关 → 两种位置都不渲染，页面无多余空白。
5. 换语言（应用 default_language + 前端 locale）→ 默认文案跟随语言切换。
6. 移动端窄屏 + 超长文案 → 不撑破布局，`line-clamp-2` 生效。
7. 老库升级：启动后 `apps` 表新增 3 列，既有应用行为不变（默认关闭）。

## 8. 风险与回归点

| 风险 | 说明 / 缓解 |
| --- | --- |
| `toPublicApp` 白名单漏加字段 | 症状为“后台开了前端没反应”，且无报错。实现后先调 `GET /api/admin/apps` 确认三字段存在 |
| 老库未迁移 | `CREATE TABLE IF NOT EXISTS` 不会补列 → 必须走 `migrate()`；先在 `data/apps.db` 副本上验证 |
| 忘记 `ON CONFLICT DO UPDATE` 子句 | 会变成“只有新建应用能配置，编辑不生效” |
| `Answer` 的 `React.memo` | 新增的是 context 读取而非 props，不会造成陈旧渲染；但别把 notice 文本从父层以不稳定对象传入 |
| 布局回归 | hint 放输入卡片外、不得放进 `rounded-2xl`；footer 放操作行之后，保持 `h-7` 操作行位置不变 |
| 长度校验口径不一致 | 前端 `maxLength`（UTF-16）与服务端码点计数在含 emoji 时略有差异 → 放宽前端为软提示更稳妥，或统一用码点计数 |
| 未知字段透传 | 路由用 `...body` 展开，`upsertApp` 只取已知字段，风险可控；但仍建议显式挑字段 |

## 9. P2 可选扩展

- 位置枚举增加 `both`（同时渲染两处）——纯字符串枚举，扩展不破坏兼容。
- 每语言自定义文案（`ai_notice_text_i18n` JSON 列 + 后台多语言输入）。
- Welcome 页（对话开始前）也在开始按钮下方展示同一提示，复用 `AiNotice`。
- 样式升级：信息图标 / 浅色 pill / 可点击跳转《AI 使用说明》。
- 审计：记录 `aiNotice*` 变更历史（`updated_at` 之外的独立审计表）。
