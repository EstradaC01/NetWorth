'use client'

import { useRef, useState } from 'react'
import { createBackup, parseBackup, replaceLocalData } from '@/lib/local-db'
import { useLocalData } from '@/components/local-data'

const MONO = "'IBM Plex Mono',monospace"
function download(name: string, contents: string) { const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url) }

export function LocalBackupPanel() {
  const data = useLocalData()
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const exportBackup = () => { download(`networth-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(createBackup(data), null, 2)); setMessage('Backup downloaded. Keep it somewhere you trust.'); setError(null) }
  const importBackup = async (file: File) => {
    setError(null); setMessage(null)
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('This backup is too large to restore.')
      const backup = parseBackup(await file.text())
      if (!confirm(`Replace all local data with this backup from ${new Date(backup.exportedAt).toLocaleString()}? This cannot be undone.`)) return
      await replaceLocalData(backup.data); await data.refresh(); setMessage('Local data restored from backup.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not import that backup.') }
  }
  return <section style={{ marginTop: 44, paddingTop: 24, borderTop: '1px solid var(--nw-line)' }}><div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nw-faint)' }}>Privacy & backup</div><p style={{ maxWidth: '62ch', color: 'var(--nw-muted)', lineHeight: 1.5, fontSize: 15, margin: '12px 0 18px' }}>This workspace is stored only in this browser on this device. It is never sent to NetWorth or Supabase. Browser data can be lost if you clear site storage, so keep a backup.</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button type="button" className="nw-btn-primary" onClick={exportBackup} style={{ padding: '10px 14px' }}>Download full backup (JSON)</button><button type="button" className="nw-btn-outline" onClick={() => input.current?.click()} style={{ padding: '10px 14px' }}>Restore JSON backup</button><input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => { const file = e.currentTarget.files?.[0]; if (file) void importBackup(file); e.currentTarget.value = '' }} /></div>{message && <p role="status" style={{ color: 'var(--color-accent)', marginTop: 14 }}>{message}</p>}{error && <p role="alert" style={{ color: 'var(--color-accent-2-600)', marginTop: 14 }}>{error}</p>}<p style={{ color: 'var(--nw-faint)', fontSize: 13.5, marginTop: 16 }}>Want access on more than one device? <a href="/signup">Create a synced account</a>. Local backups are intentionally not uploaded automatically.</p></section>
}
