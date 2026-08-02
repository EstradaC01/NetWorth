import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { ItemModal } from '@/components/item-modal'
import { ItemModalProvider } from '@/components/item-modal-context'
import { requireUser } from '@/lib/data'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware already redirects unauthenticated requests; this second check
  // is defence in depth. Middleware is not a security boundary — RLS is — but
  // without this a null user could still reach the render path.
  const user = await requireUser()
  if (!user) redirect('/login')

  return (
    <ItemModalProvider>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--nw-bg)',
          color: 'var(--nw-fg)',
          transition: 'background .25s ease,color .25s ease',
        }}
      >
        <Header />
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding:
              'clamp(28px,5vw,56px) clamp(16px,4vw,40px) 96px',
          }}
        >
          {children}
        </div>
        <ItemModal />
      </div>
    </ItemModalProvider>
  )
}
