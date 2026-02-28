"use client"

import { useState, useEffect } from 'react'

export function usePersistentSidebar(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(false)

  // Only run on client side
  useEffect(() => {
    setMounted(true)
    // Get saved state from localStorage
    const saved = localStorage.getItem('sidebar-open')
    if (saved !== null) {
      setOpen(JSON.parse(saved))
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-open', JSON.stringify(open))
    }
  }, [open, mounted])

  const toggle = () => setOpen(!open)

  return { open, setOpen, toggle, mounted }
}