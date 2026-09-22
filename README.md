# Conversation Web App Template
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Config App
Create a file named `.env.local` in the current directory and copy the contents from `.env.example`. Setting the following content:
```
# APP ID: shown in the browser, safe to expose.
# This is the unique identifier for your app, found in the app's detail page URL.
# For example, in the URL `https://cloud.dify.ai/app/xxx/workflow`, the value `xxx` is your APP ID.
NEXT_PUBLIC_APP_ID=

# APP API key: server-side only, NEVER prefix it with NEXT_PUBLIC_.
# You can generate it on the app's "API Access" page by clicking the "API Key" button in the top-right corner.
APP_KEY=

# API base URL: server-side only. If you're using the Dify cloud service, set it to: https://api.dify.ai/v1.
API_URL=
```

> ⚠️ Only `NEXT_PUBLIC_APP_ID` may reach the browser. Anything prefixed with `NEXT_PUBLIC_` is inlined into the JavaScript bundle at build time, which would hand your Dify API key to every visitor. `APP_KEY` / `API_URL` are read by the server through `config/server.ts` and are never bundled for the client.

Config more in `config/index.ts` file:   
```js
export const APP_INFO: AppInfo = {
  title: 'Chat APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'zh-Hans'
}

export const isShowPrompt = true
export const promptTemplate = ''
```

## Branding

All branding is optional and lives in `config/index.ts`:

```js
// Header avatar, which is also used as the browser tab icon.
// Accepts an emoji ('🤖'), a file in /public ('/logo.png') or an absolute URL.
// Leave it empty to hide both the header avatar and the tab icon.
export const appIcon = ''

// Background of the avatar, any CSS color (e.g. '#EFF1F5'). Only used for emojis.
export const appIconBackground = ''

// Show the "Powered by Dify" link at the bottom of the welcome card.
export const isShowPoweredBy = false
```

## Multiple apps

Apps live in a SQLite registry (`data/apps.db`, override with `REGISTRY_DB_PATH`) and every one of them is served from its own URL: `/apps/<slug>`.

- On first start the registry is seeded from `NEXT_PUBLIC_APP_ID` / `APP_KEY` / `API_URL` as the app at `/apps/<APP_SLUG>` (default slug `default`), so an existing single-app deployment keeps working untouched.
- `/` redirects to the app when there is exactly one, otherwise it lists them.
- The API is scoped as well: `/api/apps/<slug>/chat-messages`, `…/parameters`, `…/conversations`, `…/messages`, `…/file-upload`, `…/files/<id>/preview`. Conversations are already stored per app id in the browser, and the Dify `user` is namespaced per app, so two apps never share history.
- Branding is per app: name, description, copyright, privacy policy, default language, icon, icon background and the "Powered by Dify" switch all live in the row.

### AI generated notice

Every app can show a "this content is AI generated" notice to visitors. In the
admin dialog (or via the API) set:

- `aiNoticeEnabled` — master switch, default off. When off, nothing is rendered at all.
- `aiNoticeText` — custom text, at most 200 characters (code points). Empty falls
  back to the built-in text localised for the visitor's language.
- `aiNoticePosition` — where it is shown: `input_hint` (below the input box) or
  `answer_footer` (below every answer, hidden while an answer is streaming).

```bash
curl -X PUT localhost:3000/api/admin/apps/<id> -H "x-admin-token: $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"aiNoticeEnabled":true,"aiNoticeText":"","aiNoticePosition":"answer_footer"}'
```

The columns are added to an existing `apps` table automatically on startup
(idempotent `ALTER TABLE`), and `AI_NOTICE_*` env vars only seed a brand-new
registry.

### Workflow process visibility

`workflowDisplayMode` (per app, admin dialog "Workflow process") controls how
the intermediate tool calls under an answer are rendered:

- `full` — the collapsible Codex-style step list, expandable per node (default);
- `names` — a single status line that cycles the node names upward while the
  workflow runs and **freezes** the moment the answer text starts streaming;
- `off` — only the quiet thinking header, no steps.

The API also accepts the legacy boolean `showWorkflowProcess` (`true` → `full`,
`false` → `off`). The column is backfilled automatically from it.

## Serving from a sub-path

Set `NEXT_PUBLIC_BASE_PATH` to serve the whole app from a path instead of the domain root, e.g. `https://example.com/chatbot`:

```bash
# .env.local, or exported in the build environment
NEXT_PUBLIC_BASE_PATH=/chatbot
pnpm build && pnpm start
```

The value must start with `/` and must not end with one. It is inlined at build time — routes, `_next/static` URLs, API calls, links and cookies all follow it — so **changing it requires a rebuild**. Leaving it empty keeps the app on the domain root, byte for byte as before.

It also has to be present when the server starts: `next start` applies `basePath` again at runtime, so a build made for `/chatbot` started without the variable would disagree with itself about every URL. Keeping the variable in `.env.local` covers both sides (and Docker inherits it twice, from the build context and from `env_file`).

The reverse proxy has to forward the prefix untouched: `proxy_pass` may not carry a URI, otherwise `/chatbot` is stripped and the app answers 404.

```nginx
# no trailing slash after /chatbot — that form would miss the bare /chatbot URL
location /chatbot {
    # and nothing after the host either, or the /chatbot prefix gets stripped
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # chat answers stream over SSE — buffering would hold them back until the end
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;

    # attachments and images are proxied through the app, so raise nginx's 1m default
    client_max_body_size 20m;
}
```

The admin console moves with it (`/chatbot/admin` instead of `/admin`), and `docker-compose.yml` probes the same prefix for its healthcheck.

### Admin sign in

Set a password (hash preferred) and log in at `/admin`:

```bash
# the hash is generated locally and never leaves your machine;
# it uses ':' separators because '$' is expanded inside .env files
node scripts/hash-admin-password.mjs 'your-password'
```

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt:<salt>:<hash>
# optional: sign session cookies with a fixed secret instead of deriving one
ADMIN_SESSION_SECRET=
```

Sessions are signed (HMAC-SHA256) `httpOnly` cookies valid for 12 h, and `/admin`
redirects to `/admin/login` without one. Five failed logins from the same IP are
throttled for 15 minutes.

### Admin API

The same operations are available over HTTP, authenticated either with the session
cookie or (for scripts/CI) with `ADMIN_TOKEN`. When neither a token nor login
credentials are configured the API answers `503`:

```bash
# list apps (never includes the API key)
curl -H "x-admin-token: $ADMIN_TOKEN" localhost:3000/api/admin/apps

# add or replace an app
curl -X POST localhost:3000/api/admin/apps -H "x-admin-token: $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"id":"<dify app id>","slug":"support","name":"Support","apiKey":"app-xxx","apiUrl":"https://api.dify.ai/v1"}'

# update or remove one
curl -X PUT localhost:3000/api/admin/apps/<id> -H "x-admin-token: $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"enabled":false}'
curl -X DELETE localhost:3000/api/admin/apps/<id> -H "x-admin-token: $ADMIN_TOKEN"
```

Keys stay on the server: every registry response goes through `toPublicApp()`, which strips `apiKey` and `apiUrl`.

## Getting Started
Requires Node.js >= 18.18 (Node 22 recommended) and pnpm: the repo ships `pnpm-lock.yaml` and pins the package manager through `package.json#packageManager`.

First, install dependencies:
```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

`pnpm dev` runs Next.js with the default webpack compiler, which needs roughly 3–3.5 GB of free memory. On a low-memory machine either cap the Node.js heap (`NODE_OPTIONS=--max-old-space-size=3072 pnpm dev`) or switch to Turbopack (`pnpm dev --turbopack`), which uses noticeably less memory and compiles faster.

## Using Docker

```
docker build . -t <DOCKER_HUB_REPO>/webapp-conversation:latest
# now you can access it in port 3000
docker run -p 3000:3000 <DOCKER_HUB_REPO>/webapp-conversation:latest
```

> ⚠️ `NEXT_PUBLIC_APP_ID` is inlined at build time, so it has to be present in the build context when running `docker build`. `APP_KEY` and `API_URL` are read by the server at runtime, so they can be injected per container instead — no rebuild needed:
>
> ```
docker run -p 3000:3000 -e APP_KEY=app-xxx -e API_URL=https://api.dify.ai/v1 <DOCKER_HUB_REPO>/webapp-conversation:latest
> ```

The SQLite registry lives in `/app/data` inside the image, so mount a volume to keep it across container restarts:

```
docker run -p 3000:3000 -v webapp-data:/app/data -e APP_KEY=app-xxx -e API_URL=https://api.dify.ai/v1 <DOCKER_HUB_REPO>/webapp-conversation:latest
```

### Docker Compose

`docker-compose.yml` wraps the same image with the volume already wired up and passes your `.env.local` into the container:

```
cp .env.example .env.local   # fill in APP_KEY, API_URL, ADMIN_*
docker compose up -d --build
```

- `NEXT_PUBLIC_APP_ID` is still read from the build context, so rebuild (`--build`) after changing it; restarting the container is not enough.
- The registry lives in the `registry-data` volume — `docker compose down -v` deletes it.
- `APP_PORT=8080 docker compose up -d` publishes it somewhere else.
- Everything else (`APP_KEY`, `API_URL`, `ADMIN_*` …) is read from `.env.local`; an `environment:` entry in the compose file wins over it, which is the place to override a single value.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

> ⚠️ If you are using [Vercel Hobby](https://vercel.com/pricing), your message will be truncated due to the limitation of vercel.


The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
