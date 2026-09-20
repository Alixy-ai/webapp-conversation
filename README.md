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
