import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { VerifyDoc } from '@/components/VerifyDoc'
import { useAuthContext } from '@/contexts/AuthContext'

const routeForPage = (page: string) => {
  switch (page) {
    case 'home':
      return '/'
    case 'verify':
      return '/verify'
    case 'dashboard':
      return '/dashboard'
    case 'issue':
      return '/issue'
    case 'profile':
      return '/profile'
    default:
      return '/'
  }
}

export const VerifyPage = () => {
  const navigate = useNavigate()
  const { user, userType, signOut } = useAuthContext()

  const isLoggedIn = !!user
  const isOwner = userType === 'owner'

  const handleNavigate = useCallback(
    (page: string) => {
      if (page === 'register' || page === 'login') {
        navigate('/', {
          state: { page },
          replace: page === 'home'
        })
        return
      }

      navigate(routeForPage(page))
    },
    [navigate]
  )

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate('/', { replace: true })
    }
  }, [navigate, signOut])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        currentPage="verify"
        onNavigate={handleNavigate}
        wallet={null}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        isOwner={isOwner}
        isLoadingOwner={false}
      />
      <main className="flex-1">
        <VerifyDoc />
      </main>
      <Footer />
    </div>
  )
}

export default VerifyPage

