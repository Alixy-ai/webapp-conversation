# Conversation Web App Template
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Config App
Create a file named `.env.local` in the current directory and copy the contents from `.env.example`. Setting the following content:
```
# APP ID: This is the unique identifier for your app. You can find it in the app's detail page URL. 
# For example, in the URL `https://cloud.dify.ai/app/xxx/workflow`, the value `xxx` is your APP ID.
NEXT_PUBLIC_APP_ID=

# APP API Key: This is the key used to authenticate your app's API requests. 
# You can generate it on the app's "API Access" page by clicking the "API Key" button in the top-right corner.
NEXT_PUBLIC_APP_KEY=

# APP URL: This is the API's base URL. If you're using the Dify cloud service, set it to: https://api.dify.ai/v1.
NEXT_PUBLIC_API_URL=
```

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

> ⚠️ `NEXT_PUBLIC_APP_ID` / `NEXT_PUBLIC_APP_KEY` / `NEXT_PUBLIC_API_URL` are inlined at build time, so `.env.local` has to be present in the build context when running `docker build`. Passing them at container start (`docker run -e ...`) is not enough.

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
