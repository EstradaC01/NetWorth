import { AuthShell } from '@/components/auth-shell'
import { SignupForm } from './signup-form'

export const metadata = { title: 'Create account · NetWorth' }

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  )
}
