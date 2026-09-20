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
    <main className='flex h-full items-center justify-center bg-gray-50 p-6'>
      <LoginForm />
    </main>
  )
}

export default LoginPage
