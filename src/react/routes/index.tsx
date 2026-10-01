import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { landingHtml } from '../landingHtml'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  useEffect(() => {
    let cancelled = false
    import('alpinejs').then(({ default: Alpine }) => {
      if (cancelled) return
      ;(window as any).Alpine = Alpine
      Alpine.start()
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="font-mono bg-retro-dark text-retro-green min-h-screen scroll-smooth"
      dangerouslySetInnerHTML={{ __html: landingHtml }}
    />
  )
}
