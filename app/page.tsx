'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ThemeToggleIcon } from '@/components/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowDown, Cloud, HardDrive } from 'lucide-react'

const steps = [
  ['01', 'Name what matters', 'Add the cash, investments, property, and debts that make up your financial picture.'],
  ['02', 'See the whole picture', 'Your assets and debts become one clear net-worth total, with amounts shown in PHP by default.'],
  ['03', 'Notice the progress', 'Return whenever you like to see how your position has changed month by month.'],
]

export default function Home() {
  return <main className="nw-landing">
    <header className="nw-landing-nav">
      <Link href="/" className="nw-landing-brand" aria-label="NetWorth home"><Logo size={27} /><span>NetWorth</span></Link>
      <nav aria-label="Main navigation" className="nw-landing-links"><a href="#how-it-works">How it works</a><Link href="/login">Sign in</Link><ThemeToggleIcon /></nav>
    </header>
    <section className="nw-landing-hero" aria-labelledby="hero-title">
      <div className="nw-landing-intro"><p className="nw-eyebrow">A calmer view of your money</p><h1 id="hero-title">Know where you stand, without the noise.</h1><p className="nw-landing-lede">NetWorth gives the things you own, the debts you carry, and the progress you are making one considered home.</p><a className="nw-landing-text-link" href="#choose-your-way">Find your starting point <ArrowDown aria-hidden="true" /></a></div>
      <div className="nw-landing-snapshot" aria-label="Example net-worth summary"><div className="nw-snapshot-topline"><span>YOUR OVERVIEW</span><span>PHP</span></div><div className="nw-snapshot-total"><span>Net worth</span><strong>1,248,400</strong></div><div className="nw-snapshot-rule" /><div className="nw-snapshot-breakdown"><div><span>What you own</span><strong>1,560,000</strong></div><div><span>What you owe</span><strong className="nw-snapshot-debt">311,600</strong></div></div><div className="nw-snapshot-caption"><span className="nw-snapshot-dot" /> A clear picture, in one place</div></div>
    </section>
    <section id="how-it-works" className="nw-landing-section" aria-labelledby="how-title"><div className="nw-section-heading"><p className="nw-eyebrow">Built for real life</p><h2 id="how-title">A small habit that makes your position easier to understand.</h2></div><div className="nw-landing-steps">{steps.map(([number, title, body]) => <article key={number} className="nw-landing-step"><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section id="choose-your-way" className="nw-landing-section" aria-labelledby="choice-title"><div className="nw-section-heading nw-choice-heading"><p className="nw-eyebrow">Your information, your call</p><h2 id="choice-title">Choose the way that feels right for you.</h2><p>Both options give you the same thoughtful tracker. The only difference is where your data lives.</p></div><div className="nw-landing-options">
      <article className="nw-storage-option"><div className="nw-option-icon" aria-hidden="true"><HardDrive /></div><p className="nw-option-kicker">LOCAL-ONLY</p><h3>Keep it on this device</h3><p>Start straight away with no account. Your records stay in this browser and are never uploaded by NetWorth.</p><ul><li>No email or password</li><li>Private to this browser profile</li><li>Download JSON backups whenever you need them</li></ul><Link className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'nw-landing-button')} href="/local/dashboard">Use local-only mode <span aria-hidden="true">&rarr;</span></Link></article>
      <article className="nw-storage-option"><div className="nw-option-icon" aria-hidden="true"><Cloud /></div><p className="nw-option-kicker">SYNCED ACCOUNT</p><h3>Take your picture with you</h3><p>Create a personal account to save your tracker securely and return to it from your other devices.</p><ul><li>Access your records across devices</li><li>Export a portable copy at any time</li><li>Import a local backup only when you choose to</li></ul><Link className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'nw-landing-button')} href="/signup">Create an account <span aria-hidden="true">&rarr;</span></Link><p className="nw-option-secondary">Already have one? <Link href="/login">Sign in</Link></p></article>
    </div><p className="nw-landing-note">A local workspace can be seen by anyone using this unlocked browser profile. Keep a backup if you clear browser or site data.</p></section>
    <footer className="nw-landing-footer"><div><Logo size={22} /><span>NetWorth</span></div><p>For a more grounded relationship with your money.</p></footer>
  </main>
}
