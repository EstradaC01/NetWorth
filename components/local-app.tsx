'use client'

import Link from 'next/link'
import { Dashboard } from '@/app/(app)/dashboard/dashboard'
import { HistoryView } from '@/app/(app)/history/history-view'
import { CategoryView } from '@/app/(app)/category/[cat]/category-view'
import { ItemModalProvider } from '@/components/item-modal-context'
import { LocalDataProvider, useLocalData } from '@/components/local-data'
import { LocalItemModal } from '@/components/local-item-modal'
import { LocalGoalView } from '@/components/local-goal-view'
import { LocalBackupPanel } from '@/components/local-backup-panel'
import type { CategoryId } from '@/lib/categories'

function LocalHeader() { return <header style={{ borderBottom: '1px solid var(--nw-hair)', padding: '14px clamp(14px,4vw,40px)', display: 'flex', gap: 16, alignItems: 'center' }}><Link href="/local/dashboard" style={{ marginRight: 'auto', fontSize: 18 }}>NetWorth <span style={{ color: 'var(--nw-faint)', fontSize: 12 }}>LOCAL</span></Link><Link href="/local/dashboard">Dashboard</Link><Link href="/local/history">History</Link><Link href="/local/goal">Goal</Link><Link href="/login" style={{ color: 'var(--nw-muted)' }}>Sign in</Link></header> }
function Screen({ screen, cat }: { screen: 'dashboard' | 'history' | 'goal' | 'category'; cat?: CategoryId }) { const data = useLocalData(); if (!data.ready) return <p style={{ padding: 40, color: 'var(--nw-muted)' }}>Opening your local workspace…</p>; if (screen === 'dashboard') return <Dashboard items={data.items} snapshots={data.snapshots} goal={data.goal} basePath="/local" />; if (screen === 'history') return <><HistoryView items={data.items} snapshots={data.snapshots} events={data.events} localOnly /><LocalBackupPanel /></>; if (screen === 'goal') return <LocalGoalView />; return <CategoryView cat={cat!} items={data.items} basePath="/local" /> }
export function LocalApp(props: { screen: 'dashboard' | 'history' | 'goal' | 'category'; cat?: CategoryId }) { return <LocalDataProvider><ItemModalProvider><div style={{ minHeight: '100vh', background: 'var(--nw-bg)', color: 'var(--nw-fg)' }}><LocalHeader /><main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,5vw,56px) clamp(16px,4vw,40px) 96px' }}><Screen {...props} /></main><LocalItemModal /></div></ItemModalProvider></LocalDataProvider> }
