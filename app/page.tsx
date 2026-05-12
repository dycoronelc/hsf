'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './providers'
import { getPostLoginPath } from '@/lib/authRedirect'

export default function Home() {
  const { isAuthenticated, user, authHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authHydrated) return
    if (isAuthenticated) {
      router.replace(getPostLoginPath(user?.role))
      return
    }
    router.replace('/login')
  }, [authHydrated, isAuthenticated, router, user?.role])

  return null
}
