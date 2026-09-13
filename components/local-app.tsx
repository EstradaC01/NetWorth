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

function LocalHeader() { return <header className="nw-app-header"><div className="nw-app-header-inner"><Link href="/local/dashboard" className="nw-app-brand">NetWorth <span>LOCAL</span></Link><nav className="nw-app-nav"><Link href="/local/dashboard">Overview</Link><Link href="/local/history">History</Link><Link href="/local/goal">Goal</Link></nav><div className="nw-app-actions"><Link href="/login" className="nw-sign-out">Sign in</Link></div></div></header> }
function Screen({ screen, cat }: { screen: 'dashboard' | 'history' | 'goal' | 'category'; cat?: CategoryId }) { const data = useLocalData(); if (!data.ready) return <p style={{ padding: 40, color: 'var(--nw-muted)' }}>Opening your local workspace…</p>; if (screen === 'dashboard') return <Dashboard items={data.items} snapshots={data.snapshots} goals={data.goals} basePath="/local" />; if (screen === 'history') return <><HistoryView items={data.items} snapshots={data.snapshots} events={data.events} localOnly /><LocalBackupPanel /></>; if (screen === 'goal') return <LocalGoalView />; return <CategoryView cat={cat!} items={data.items} basePath="/local" /> }
export function LocalApp(props: { screen: 'dashboard' | 'history' | 'goal' | 'category'; cat?: CategoryId }) { return <LocalDataProvider><ItemModalProvider><div className="nw-app-shell"><LocalHeader /><main className="nw-app-main"><Screen {...props} /></main><LocalItemModal /></div></ItemModalProvider></LocalDataProvider> }
