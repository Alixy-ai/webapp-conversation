import type { FC } from 'react'
import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import LoginForm from './login-form'
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/admin/auth'

const LoginPage: FC = async () => {
  const session = verifySessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)
  if (session) { redirect('/admin') }

  return (
    <main className='flex min-h-screen bg-white'>
      {/* brand panel */}
      <div className='relative hidden w-1/2 flex-col justify-between bg-gray-900 p-10 text-white lg:flex'>
        <span className='text-sm font-semibold'>Chat Apps</span>
        <div>
          <p className='max-w-sm text-2xl font-semibold leading-snug'>
            One deployment, many Dify apps.
          </p>
          <p className='mt-3 max-w-sm text-sm text-gray-400'>
            Connect assistants, chatbots and workflows, give each of them its own URL,
            and manage the credentials from a single place.
          </p>
        </div>
        <p className='text-[11px] text-gray-500'>
          API keys are stored server-side and never reach the browser.
        </p>
      </div>

      {/* form panel */}
      <div className='flex w-full items-center justify-center p-6 lg:w-1/2'>
        <LoginForm />
      </div>
    </main>
  )
}

export default LoginPage
