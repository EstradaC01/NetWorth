'use client'

import { useActionState, useId, useState } from 'react'
import { FileJson, Upload } from 'lucide-react'
import { importLocalBackup } from '@/app/actions/import-backup'
import { Button } from '@/components/ui/button'

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function CloudImport() {
  const [state, action, pending] = useActionState(importLocalBackup, { error: null })
  const [file, setFile] = useState<File | null>(null)
  const inputId = useId()

  return (
    <section className="nw-cloud-import">
      <div className="nw-cloud-import-heading">
        <div className="nw-cloud-import-mark" aria-hidden="true"><Upload /></div>
        <div><h2>Move a local backup into this account</h2><p>Choose the JSON backup you downloaded from local-only mode. Nothing uploads until you confirm the import.</p></div>
      </div>
      <p className="nw-cloud-import-safety">For safety, imports are available only while this account is empty and never overwrite cloud records.</p>
      <form action={action} className="nw-cloud-import-form">
        <input id={inputId} className="nw-sr-only" name="backup" type="file" accept="application/json,.json" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <label className="nw-file-picker" htmlFor={inputId}>
          <span className="nw-file-picker-icon" aria-hidden="true"><FileJson /></span>
          <span className="nw-file-picker-copy"><strong>{file ? file.name : 'Choose a backup file'}</strong><small>{file ? `${fileSize(file.size)} JSON backup ready to import` : 'Select a .json backup file from this device'}</small></span>
          <span className="nw-file-picker-action">Browse files</span>
        </label>
        <Button className="nw-cloud-import-submit" type="submit" disabled={!file || pending}>{pending ? 'Importing...' : 'Import backup'}</Button>
      </form>
      {state.error && <p className="nw-cloud-import-error" role="alert">{state.error}</p>}
      {state.message && <p className="nw-cloud-import-success" role="status">{state.message}</p>}
    </section>
  )
}
