import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in · NetWorth' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  )
}
