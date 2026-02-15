'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getUserTypeAction } from '@/actions/auth'
import Image from 'next/image'

export function HomeHeader() {
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard')

  // Determine dashboard URL based on user type
  useEffect(() => {
    if (isSignedIn && user?.id) {
      getUserTypeAction(user.id).then(userType => {
        if (userType === 'customer') {
          setDashboardUrl('/customer/dashboard')
        } else {
          // Provider or staff go to /dashboard
          setDashboardUrl('/dashboard')
        }
      })
    }
  }, [isSignedIn, user?.id])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/App Name */}
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/bukin-point-logo.png" alt="BukinPoint" width={120} height={100} />
          </Link>

          {/* Navigation Actions */}
          <nav className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href={dashboardUrl}>Dashboard</Link>
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
