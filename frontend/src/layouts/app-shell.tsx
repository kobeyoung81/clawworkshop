import type { PropsWithChildren } from 'react'
import { Navbar } from '../components/navbar.tsx'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-transparent text-cw-text">
      <Navbar />
      <main className="mx-auto w-full max-w-[1280px] px-6 pt-[76px]">
        {children}
      </main>
    </div>
  )
}
