import { useState, useEffect, useRef, useCallback } from 'react'

export type AvatarState = 'hidden' | 'greeting' | 'visible' | 'walking-off' | 'peeking'

interface UseAvatarStateOptions {
  greetingTimeoutMs?: number
  inactivityTimeoutMs?: number
  initialDelayMs?: number
}

interface UseAvatarStateReturn {
  state: AvatarState
  greet: () => void
  interact: () => void
  dismiss: () => void
  walkOff: () => void
  peek: () => void
  summon: () => void
  resetInactivityTimer: () => void
}

export function useAvatarState({
  greetingTimeoutMs = 5000,
  inactivityTimeoutMs = 60000,
  initialDelayMs = 1000,
}: UseAvatarStateOptions = {}): UseAvatarStateReturn {
  const [state, setState] = useState<AvatarState>('hidden')
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearGreetingTimer = useCallback(() => {
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current)
      greetingTimerRef.current = null
    }
  }, [])

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setState('greeting')
    }, initialDelayMs)
    return () => clearTimeout(timer)
  }, [initialDelayMs])

  useEffect(() => {
    if (state !== 'greeting') return
    greetingTimerRef.current = setTimeout(() => {
      setState('walking-off')
    }, greetingTimeoutMs)
    return () => clearGreetingTimer()
  }, [state, greetingTimeoutMs, clearGreetingTimer])

  useEffect(() => {
    if (state !== 'visible') return
    inactivityTimerRef.current = setTimeout(() => {
      setState('walking-off')
    }, inactivityTimeoutMs)
    return () => clearInactivityTimer()
  }, [state, inactivityTimeoutMs, clearInactivityTimer])

  const interact = useCallback(() => {
    clearGreetingTimer()
    setState(prev => (prev === 'greeting' || prev === 'visible') ? 'visible' : prev)
  }, [clearGreetingTimer])

  const greet = useCallback(() => {
    clearGreetingTimer()
    clearInactivityTimer()
    setState('greeting')
  }, [clearGreetingTimer, clearInactivityTimer])

  const dismiss = useCallback(() => {
    clearGreetingTimer()
    clearInactivityTimer()
    setState('walking-off')
  }, [clearGreetingTimer, clearInactivityTimer])

  const peek = useCallback(() => {
    setState('peeking')
  }, [])

  const summon = useCallback(() => {
    setState('greeting')
  }, [])

  const walkOff = useCallback(() => {
    clearGreetingTimer()
    clearInactivityTimer()
    setState('walking-off')
  }, [clearGreetingTimer, clearInactivityTimer])

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer()
    setState(prev => {
      if (prev !== 'visible') return prev
      inactivityTimerRef.current = setTimeout(() => {
        setState('walking-off')
      }, inactivityTimeoutMs)
      return prev
    })
  }, [inactivityTimeoutMs, clearInactivityTimer])

  return {
    state,
    greet,
    interact,
    dismiss,
    walkOff,
    peek,
    summon,
    resetInactivityTimer,
  }
}
