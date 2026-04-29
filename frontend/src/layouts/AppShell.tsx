import type { PropsWithChildren } from 'react'
import { Navbar } from '../components/Navbar.tsx'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-transparent text-cw-text selection:bg-cw-cyan/20 selection:text-cw-cyan">
      <Navbar />
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
