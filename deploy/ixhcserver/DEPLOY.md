# ixhcserver 部署方案 — `aks.enaaa.com/chatbot`（或 §3b 的 `ixhc.concentrix.com/chatbot`）

> 目标：`https://aks.enaaa.com/chatbot` 运行本仓库应用（Docker compose），nginx 反代 + HTTPS。
> **如果不想动 DNS / 也不想申请新证书**：直接看 **§3b** —— 挂到这台机器上已经在跑的 `ixhc.concentrix.com`，只改一行 nginx。
>
> 本方案基于对 **ixhcserver 的只读侦察**得出（未改服务器任何文件、未在服务器上执行任何 docker 命令）。
> 按你的要求：**docker 相关命令全部由你手动执行**，权限不绕过（部署账号不在 `docker` 组）。

---

## 0. 一句话流程

```
DNS A 记录 → git clone → 写 .env.local → docker compose up -d --build
→ 放 nginx conf → certbot 签证书 → 验收
```

---

## 1. 服务器实测现状（侦察结论）

| 项 | 实测值 |
|---|---|
| 主机 | `CNX` / Ubuntu 24.04.5 / Azure / 8 vCPU / 31 GiB 内存 / 根分区余 **360 G** |
| SSH | `ixhcserver` → `<server-ip>`，部署账号（**不在 docker 组**） |
| Docker | **29.8.1** + compose **v5.5.1**，daemon active；socket `root:docker` |
| nginx | **1.30.5**，`conf.d` 风格（无 `sites-enabled`）；主站 `ixhc.concentrix.com.conf` |
| 端口 | 宿主机发布口选 **13001**（实测空闲；为什么不用 3000 见 §4 第 9 条）；`80/443` 由 nginx 占用，不冲突 |
| Docker Hub | 直连 `registry-1.docker.io` **超时**；但 `daemon.json` 已配镜像加速：`docker.m.daocloud.io`、`dockerproxy.net` → **构建拉基础镜像走加速器** |
| GitHub / npm | 均可达（`git ls-remote` 已取到仓库最新提交 `3138cf8`；npm registry 200） |
| 证书 | **没有 certbot、没有 `/etc/letsencrypt`**；现有证书是企业 DigiCert 通配符 `*.concentrix.com`（**不覆盖 enaaa.com**，需新签） |
| DNS | `aks.enaaa.com` 目前**尚无解析记录**（公网侧与服务器侧实测均无）→ 前置条件 |
| 公网端口 | `<server-ip>:80` → 301、`:443` → 307（可达，说明 NSG/防火墙放行这两口） |
| Dify API | 服务器上实测 `https://ixhc.concentrix.com/v1/parameters` → **401 JSON**（Dify 正常应答，说明 `API_URL` 用这个地址可行） |
| 常用工具 | `node`、`npm`、`git`、`dig`、`openssl`、`curl`、`wget` 已安装 |

---

## 2. 前置条件（你来准备）

1. **DNS**：给 `aks.enaaa.com` 添加 A 记录 → `<server-ip>`。
   验证：`dig +short aks.enaaa.com @1.1.1.1`（certbot 的 http-01 校验需要它生效）。
   若走 Cloudflare：SSL 模式必须 **Full (strict)**（Flexible 会导致回源永远 http）。
2. **Docker 权限**：按你自己的方式执行（root / sudo / 加组均可，本方案不涉及）。
3. **Dify 应用 Key**：准备 `APP_KEY`（建议在生产**单独建一个应用**与测试隔离；也可复用现有应用的 key）。

---

## 3. 部署步骤

### Step 1 · 拉代码

```bash
cd ~                                    # 或 /opt、/srv，随意（用你自己的执行账号）
git clone https://github.com/Alixy-ai/webapp-conversation.git
cd webapp-conversation
# 如需锁定版本：git checkout 3138cf8
```

> 本次为部署新增/修改的三个文件在 `deploy/ixhcserver/` 与 `docker-compose.yml`（healthcheck 一行）——
> 若还没推到 GitHub，先把 `deploy/ixhcserver/` 三个文件 `scp` 到服务器仓库里，或先在本地 `git push`。

### Step 2 · 生成后台密码哈希

```bash
node scripts/hash-admin-password.mjs '你的强密码'
# 输出整行形如：ADMIN_PASSWORD_HASH=scrypt:<salt>:<hash>
```

（服务器 node 为 v18.20.8，可直接跑；换到旧版 node 的机器时可用：`docker run --rm -v "$PWD:/w" -w /w node:22-alpine node scripts/hash-admin-password.mjs '你的强密码'`）

### Step 3 · 写 `.env.local`（模板）

```bash
cat > .env.local <<'EOF'
# ---- Dify 应用 ----
NEXT_PUBLIC_APP_ID=<Dify 应用「概览」页的 App ID>
APP_KEY=<Dify 应用「API 访问」页的 key；服务器端使用，绝不加 NEXT_PUBLIC_ 前缀>
API_URL=https://ixhc.concentrix.com/v1

# ---- 站点 ----
APP_SLUG=default
APP_NAME=Chat APP
NEXT_PUBLIC_BASE_PATH=/chatbot

# ---- 后台（/chatbot/admin）----
ADMIN_USERNAME=<你的用户名>
ADMIN_PASSWORD_HASH=<Step 2 的输出整行粘贴到这里>
ADMIN_SESSION_SECRET=<openssl rand -hex 32 的输出>

# ---- AI 生成提示（首启写入 registry；之后可在 /admin 改）----
AI_NOTICE_ENABLED=true
AI_NOTICE_TEXT=本内容由 AI 生成，请注意甄别。
AI_NOTICE_POSITION=input_hint
EOF
chmod 600 .env.local
```

说明：
- `NEXT_PUBLIC_*` 两个值（APP_ID、BASE_PATH）是**构建期内联**的，改了必须重建（`--build`），重启容器无效。
- 该文件不入库（`.gitignore` 已覆盖）；它会进 Docker **构建上下文**（这是设计需要），但不会出现在最终镜像的 runner 层（已实测 `.next/standalone` 内不含 `.env*`）。
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` 必填才能登录后台；`ADMIN_TOKEN` 可选（给脚本调 API 用）。

### Step 4 · 构建 + 启动

```bash
docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml up -d --build
docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml ps
```

- 首次构建：拉 `node:22-alpine`（走镜像加速）→ `pnpm install` → `next build`，视网速 **3–10 分钟**。
- `deploy/ixhcserver/docker-compose.lan-only.yml` 把发布端口**只绑到 127.0.0.1:13001**（对外由 nginx 承接；`!override` 语法已在本机同版本 compose 上验证，且清单里只会出现一条端口映射）。
- 等 20–40 秒，`ps` 里应显示 **`healthy`**（探针命令见 §7，已实测通过）。

### Step 5 · 容器自检

```bash
curl -sI http://127.0.0.1:13001/chatbot | head -3     # 期望 307/200，不是 404、502
curl -s  http://127.0.0.1:13001/chatbot | head -c 200 # 有 HTML
docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml logs --tail=50 webapp
```

### Step 6 · nginx

> 若改用现成域名 `ixhc.concentrix.com`：**跳过本步和 Step 7**，见 §3b（不需要新 server 块、不需要证书）。

```bash
sudo cp deploy/ixhcserver/aks.enaaa.com.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx

# DNS 还没生效也能先预检（按 Host 头匹配新 server block）：
curl -I -H 'Host: aks.enaaa.com' http://127.0.0.1/chatbot   # 期望 307（→/chatbot/apps/default）或 200；不是 404/502
curl -I -H 'Host: aks.enaaa.com' http://127.0.0.1/          # 期望 302 → /chatbot
```

- 新配置是**独立文件**，完全不碰 `ixhc.concentrix.com.conf`；`conf.d` 的 include 只匹配 `*.conf`，历史 `.bak*` 文件不受影响。
- 两个"看着多余、实则必须"的点已在配置文件注释里标好：`location /chatbot` **不带尾斜杠**、`proxy_pass` **不带路径**。

### Step 7 · HTTPS

**方式 A：certbot（推荐，apt 源里已有 2.9.0）**

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aks.enaaa.com          # 会自动补 443 块 + http→https 跳转
sudo certbot renew --dry-run                   # 确认自动续期链路
```

**方式 B：使用你自己的证书**：解开 `aks.enaaa.com.conf` 底部的 443 模板，填两个证书路径（可参考 `/etc/nginx/ssl/` 现有企业的命名风格），按注释替换 :80 的 location 为跳转。

### Step 8 · 验收

```bash
curl -I https://aks.enaaa.com/chatbot               # 307 → /chatbot/apps/default
curl -I https://aks.enaaa.com/                      # 302 → /chatbot
curl -I https://aks.enaaa.com/chatbot/admin         # 307 → /chatbot/admin/login
curl -I https://aks.enaaa.com/chatbot/vs/loader.js  # 200
```

浏览器人工清单（**这步别省**）：

1. `/chatbot` 页面样式/图标正常（无 404 资源）；
2. 发一条消息 → 回答**逐字**流式出现（若停顿很久后整段蹦出 = `proxy_buffering off` 没生效）；
3. AI 生成提示显示在设定位置（`input_hint` = 输入框下方）；
4. `https://aks.enaaa.com/chatbot/admin` 登录成功 → 编辑应用 → 保存后回读一致；
5. 上传一个 > 1 MB 的附件成功（否则检查 `client_max_body_size`）；
6. 手机/窄屏看一眼布局。

---

## 3b. 变体：挂到现成域名 `https://ixhc.concentrix.com/chatbot`（更省事）

不想动 DNS、也不想申请新证书时，用这台机器上**已经在跑的域名**即可。侦察实测：

| 项 | 现状 | 结论 |
|---|---|---|
| DNS | 已解析到 `<server-ip>` | ✅ 无需操作 |
| 证书 | 443 用的是企业 DigiCert 通配符 `*.concentrix.com` | ✅ 覆盖该域名，**不需要 certbot** |
| HTTP→HTTPS | 80 块结尾就是 `return 301 https://$host$request_uri`（实测 `http://…/chatbot` 已 301 到 https） | ✅ 80 块不用改 |
| 路径占用 | 全配置 grep `chatbot` = **0 命中** | ✅ `/chatbot` 可用 |
| 根路径 | `/` 已被现有前端（Dify）占用 | ⚠️ 只能挂子路径 `/chatbot` —— 正好与现有构建 `NEXT_PUBLIC_BASE_PATH=/chatbot` 一致，无需重建 |
| CSP | `script-src 'self' 'unsafe-inline' 'unsafe-eval'`、`connect-src 'self' …` | ✅ 与本应用兼容（应用无 eval / 无 blob 对象 / 无 WebSocket / 无外域请求，已逐项核对代码） |
| 继承项 | server 级 `client_max_body_size 50m`；`allow/deny` 白名单只作用在 `/hurom/*`；**顶层没有任何 regex location** | ✅ 无需额外处理 |

要做的只有一处改动：把 `location ^~ /chatbot` 加进**现有 443 server 块**。

### 为什么不能新建一个 server 文件
`server_name ixhc.concentrix.com` 已存在；同名的新 server 块只会得到 `conflicting server name` 警告、nginx 只保留其中一个 —— 必须改现有块（或用 include）。

### 操作（服务器上，root）

```bash
# 1) 放置片段（本仓库 deploy/ixhcserver/chatbot-location.inc）
sudo cp deploy/ixhcserver/chatbot-location.inc /etc/nginx/snippets/chatbot.inc

# 2) 备份（沿用你们已有的 .bak-时间戳 习惯）
sudo cp /etc/nginx/conf.d/ixhc.concentrix.com.conf \
        /etc/nginx/conf.d/ixhc.concentrix.com.conf.bak-$(date +%Y%m%d-%H%M%S)

# 3) 在 443 server 块内加一行（建议放在 “根路径反代（Dify）” 的 location / 之前）：
#       include /etc/nginx/snippets/chatbot.inc;
sudo vim /etc/nginx/conf.d/ixhc.concentrix.com.conf

# 4) 检查 + 生效
sudo nginx -t && sudo systemctl reload nginx
```

### 验收

```bash
curl -I https://ixhc.concentrix.com/chatbot        # 307 → /chatbot/apps/default（或 200）
curl -I https://ixhc.concentrix.com/chatbot/admin  # 307 → /chatbot/admin/login
curl -I https://ixhc.concentrix.com/               # 仍是 Dify 前端的 307，未受影响
curl -I https://ixhc.concentrix.com/apt/           # 抽查一个既有路径，确认没被波及
```

### 片段里三个“故意为之”（别改）

1. **`location ^~ /chatbot` 的 `^~`**：跳过 regex 匹配，杜绝任何 `~* \.(js|css…)$` 类规则抢走应用的静态资源；
2. **不写任何 `add_header`**：本配置里反复注释过 —— location 一旦有 `add_header`，server 级的 HSTS / CSP / X-Content-Type-Options **全部丢失**（`add_header` 不层叠）。不写 = 全部继承；
3. **不带 WebSocket 的 `Upgrade` / `Connection "upgrade"`**（应用是纯 SSE），但必须保留 `proxy_buffering off` + 长超时，否则回答不流式、慢模型会被 nginx 默认 60s 读超时掐断。

> 提醒：`ixhc.concentrix.com` 是企业生产域名，是否适合对外挂这个聊天入口由你们决定；技术侧已验证可行。

---

## 4. 坑与注意事项（每条都有实测依据）

| # | 事项 | 说明 |
|---|---|---|
| 1 | `proxy_pass http://chatbot_app;` | **不能带路径/斜杠**，否则 `/chatbot` 前缀被剥 → 全站 404 |
| 2 | `location /chatbot` | **不能带尾斜杠**，否则裸 `/chatbot` 落不到这块 |
| 3 | 后台必须用 **https** 访问 | 配好后 `X-Forwarded-Proto=https` → admin 会话 cookie 带 `Secure`；用 http 打开会"登录成功又弹回登录页" |
| 4 | `proxy_buffering off` | 聊天是 SSE，保留缓冲会让回答不流式 |
| 5 | `client_max_body_size 20m` | 附件经应用上传，nginx 默认 1m 会 413 |
| 6 | 构建期变量 | `NEXT_PUBLIC_APP_ID`、`NEXT_PUBLIC_BASE_PATH` 在 `next build` 时内联；改值必须 `--build` 重建 |
| 7 | 构建与运行同值 | `NEXT_PUBLIC_BASE_PATH` 两边都要有（构建内联路由/资源前缀，运行期探针与 standalone 也读它） |
| 8 | Docker Hub | 直连超时，构建依赖 `daemon.json` 的镜像加速；以后 pull 报错先怀疑这里 |
| 9 | 宿主机端口 | 用 **13001** 而不是 3000：3000 是 Grafana、`next dev`、一堆脚手架以及本仓库默认 compose 的口，最容易撞；且只绑 `127.0.0.1`（override 文件）。换号只改 **两处**：override 里的映射 + nginx 的 `proxy_pass`。只有宿主机上想绑该端口的进程、或想发布该端口到宿主的容器会受影响，其他容器不受任何影响 |
| 10 | 别动主站配置 | 不碰 `ixhc.concentrix.com.conf`；新增文件必须以 `.conf` 结尾 |
| 11 | registry 数据 | 在 docker 卷里，`down -v` 会清空并重新用 `.env.local` seed |
| 12 | 非 Docker 方式 | 系统里有 node，理论上可 pnpm build + systemd 跑 standalone，但本仓库按 Docker 交付，未纳入本方案 |

---

## 5. 运维

```bash
# 状态 / 日志
docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml ps
docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml logs -f webapp

# 更新（改了 NEXT_PUBLIC_* 必须带 --build）
git pull && docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml up -d --build

# 备份 registry 卷（先确认卷名）
docker volume ls | grep registry
docker run --rm -v <卷名>:/data -v "$PWD:/backup" alpine tar czf /backup/registry-$(date +%F).tgz -C /data .

# 回滚
git checkout <旧提交> && docker compose -f docker-compose.yml -f deploy/ixhcserver/docker-compose.lan-only.yml up -d --build
```

---

## 6. 本次为部署修复的一处缺陷（已改仓库文件，未提交）

`docker-compose.yml` 的 healthcheck：

```diff
- test: ['CMD-SHELL', 'wget -q --spider "http://127.0.0.1:3000${NEXT_PUBLIC_BASE_PATH}/"']
+ test: ['CMD-SHELL', 'wget -q --spider "http://127.0.0.1:3000$${NEXT_PUBLIC_BASE_PATH}/"']
```

原因与证据：compose 在**解析期**替换 `${...}`（只读取 shell / `.env`，**不读 `.env.local`**），实测 `docker compose config` 把探针渲染成 `http://127.0.0.1:3000/`；而在 `/chatbot` 构建下 `/` 返回 404 → 容器会**永远 unhealthy**。改成 `$$` 后容器内实测拿到 `CMD=/chatbot`，且 `node:22-alpine` 自带的 busybox wget（1.37）实测能跟随 `/chatbot/` 的 308 → 探针通过。

同时新增了两个部署文件（均已验证）：

- `deploy/ixhcserver/docker-compose.lan-only.yml` — 端口只绑 loopback（`docker compose config` 实测只剩一条 `127.0.0.1:13001` 映射）；
- `deploy/ixhcserver/aks.enaaa.com.conf` — nginx vhost（HTTP 块 + 注释的 443 模板），**已用真实 nginx 镜像跑过 `nginx -t`：两种形态均 syntax ok**；
- `deploy/ixhcserver/chatbot-location.inc` — 挂到现成域名用的 location 片段（§3b），同样已过 `nginx -t`（以 `include` 形态放进 server 块）。

---

## 7. 本次没做 / 没碰的东西

- **服务器**：未写入任何文件、未执行任何 docker 命令、未改 nginx、未动 DNS。仅执行了只读命令（`ls/cat/ss/curl -I/getent/git ls-remote/apt-cache policy`）。
- **本地**：新增 `deploy/ixhcserver/`（4 个文件：本方案、aks 的 vhost、loopback override、chatbot-location.inc）+ `docker-compose.yml` 一行 healthcheck 修复，**未提交**。
- 需要提交/推送，或需要我陪你在服务器上一步步跑（你在场、权限由你给）时，说一声即可。