'use client'

const MONO = "'IBM Plex Mono',monospace"

/**
 * CSV download links.
 *
 * Plain anchors with `download`, not fetch-and-blob: the browser's own
 * download machinery handles the filename from Content-Disposition, streams
 * the response, and works with the middleware session cookie without any
 * client-side auth handling. There is nothing here JavaScript needs to do.
 *
 * Safe as a GET despite the app's POST-for-mutations rule — the endpoint
 * reads and changes nothing. See app/export/route.ts.
 */
export function ExportLinks() {
  return (
    <div
      style={{
        marginTop: 'clamp(36px,4.5vw,56px)',
        paddingTop: 24,
        borderTop: '1px solid var(--nw-line)',
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--nw-faint)',
        }}
      >
        Export
      </div>
      <a href="/export?kind=items" download style={{ fontSize: 14.5 }}>
        Items (CSV)
      </a>
      <a href="/export?kind=history" download style={{ fontSize: 14.5 }}>
        Monthly history (CSV)
      </a>
      <a href="/export?kind=backup" download style={{ fontSize: 14.5 }}>
        Full backup (JSON)
      </a>
      <div style={{ fontSize: 13.5, color: 'var(--nw-faint)' }}>
        Your data, in a format any spreadsheet opens.
      </div>
    </div>
  )
}
