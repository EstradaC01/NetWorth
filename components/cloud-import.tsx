'use client'

import { useActionState } from 'react'
import { importLocalBackup } from '@/app/actions/import-backup'

export function CloudImport() {
  const [state, action, pending] = useActionState(importLocalBackup, { error: null })
  return <section style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--nw-hair)' }}><div style={{ fontSize: 14.5 }}>Move a local backup into this account</div><p style={{ color: 'var(--nw-faint)', fontSize: 13.5, margin: '7px 0 12px', maxWidth: '62ch' }}>Choose a JSON backup you downloaded from local-only mode. This upload happens only when you submit it; it is not automatic sync. For safety, importing is available only while this account is empty and never overwrites cloud records.</p><form action={action} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><input name="backup" type="file" accept="application/json,.json" required /><button className="nw-btn-outline" type="submit" disabled={pending} style={{ padding: '8px 12px' }}>{pending ? 'Importing…' : 'Import local backup'}</button></form>{state.error && <p role="alert" style={{ color: 'var(--color-accent-2-600)', fontSize: 13.5 }}>{state.error}</p>}{state.message && <p role="status" style={{ color: 'var(--color-accent)', fontSize: 13.5 }}>{state.message}</p>}</section>
}
