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
      <div className="nw-app-shell">
        <Header />
        <div className="nw-app-main">
          {children}
        </div>
        <ItemModal />
      </div>
    </ItemModalProvider>
  )
}
