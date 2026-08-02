import type { Metadata } from 'next'
import { ThemeProvider, THEME_BOOTSTRAP } from '@/components/theme'
import './globals.css'

export const metadata: Metadata = {
  title: 'NetWorth',
  description: 'Cash, investments, property and debt — totalled in pesos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-nw-theme="light" suppressHydrationWarning>
      <head>
        {/* The design system, vendored byte-identical from the Broadsheet
            export. Served statically so a re-export diffs to zero. */}
        <link rel="stylesheet" href="/broadsheet/styles.css" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
        {/* Must run before first paint — see THEME_BOOTSTRAP. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
