import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import App from '../App'

export const Route = createFileRoute('/react')({
  component: ReactApp,
})

function ReactApp() {
  // client-only: the clock app touches browser APIs at init
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <App />
}
