# Phase 2 — Widget v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production widget with state machine (greeting→walk-off→peek→summon), realistic Mixamo 3D avatar, speech bubble + input bar UX, DOM scanning, and /chat API wiring.

**Architecture:** AvatarController orchestrates state transitions using useAvatarState hook. Child components (AvatarCharacter, SpeechBubble, ChatBar, PeekTab, PageScanner) are rendered conditionally based on state. Three.js Canvas renders GLB model with Mixamo animations.

**Tech Stack:** React 18, Three.js 0.160, @react-three/fiber, @react-three/drei, TypeScript, Vite

---

## Prerequisites

- Working directory: `/Users/dakotast.pierre/avatar-ai`
- Run `npm run dev:widget` and `npm run dev:backend` in separate terminals before testing
- No GLB model file exists yet — AvatarCharacter will render a geometric fallback

---

## Task 1 — useAvatarState hook

**File:** `packages/widget/src/hooks/useAvatarState.ts`

- [ ] Create directory `packages/widget/src/hooks/`

- [ ] Create `packages/widget/src/hooks/useAvatarState.ts` with the full state machine:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'

export type AvatarState = 'hidden' | 'greeting' | 'visible' | 'walking-off' | 'peeking'

interface UseAvatarStateOptions {
  greetingTimeoutMs?: number   // how long in greeting before walking off (default 5000)
  inactivityTimeoutMs?: number // how long in visible before walking off (default 60000)
  initialDelayMs?: number      // delay before first greeting (default 1000)
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

  // hidden → greeting after initialDelayMs
  useEffect(() => {
    const timer = setTimeout(() => {
      setState('greeting')
    }, initialDelayMs)
    return () => clearTimeout(timer)
  }, [initialDelayMs])

  // greeting → walking-off after greetingTimeoutMs of no interaction
  useEffect(() => {
    if (state !== 'greeting') return
    greetingTimerRef.current = setTimeout(() => {
      setState('walking-off')
    }, greetingTimeoutMs)
    return () => clearGreetingTimer()
  }, [state, greetingTimeoutMs, clearGreetingTimer])

  // visible → walking-off after inactivityTimeoutMs
  useEffect(() => {
    if (state !== 'visible') return
    inactivityTimerRef.current = setTimeout(() => {
      setState('walking-off')
    }, inactivityTimeoutMs)
    return () => clearInactivityTimer()
  }, [state, inactivityTimeoutMs, clearInactivityTimer])

  // greeting → visible (user typed or clicked)
  const interact = useCallback(() => {
    if (state === 'greeting' || state === 'visible') {
      clearGreetingTimer()
      setState('visible')
    }
  }, [state, clearGreetingTimer])

  // any state → greeting (manual trigger, e.g. from summon)
  const greet = useCallback(() => {
    clearGreetingTimer()
    clearInactivityTimer()
    setState('greeting')
  }, [clearGreetingTimer, clearInactivityTimer])

  // visible or greeting → walking-off (dismiss button)
  const dismiss = useCallback(() => {
    clearGreetingTimer()
    clearInactivityTimer()
    setState('walking-off')
  }, [clearGreetingTimer, clearInactivityTimer])

  // walking-off → peeking (walk animation completes — call this after animation done)
  const peek = useCallback(() => {
    setState('peeking')
  }, [])

  // peeking → greeting (tab clicked)
  const summon = useCallback(() => {
    setState('greeting')
  }, [])

  // internal helper — called when user walks off but we need to set state directly
  const walkOff = useCallback(() => {
    clearGreetingTimer()
    clearInactivityTimer()
    setState('walking-off')
  }, [clearGreetingTimer, clearInactivityTimer])

  // reset inactivity timer on any interaction while visible
  const resetInactivityTimer = useCallback(() => {
    if (state !== 'visible') return
    clearInactivityTimer()
    inactivityTimerRef.current = setTimeout(() => {
      setState('walking-off')
    }, inactivityTimeoutMs)
  }, [state, inactivityTimeoutMs, clearInactivityTimer])

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
```

- [ ] Commit:

```
git add packages/widget/src/hooks/useAvatarState.ts
git commit -m "feat: add useAvatarState hook — state machine for avatar lifecycle" -m "States: hidden → greeting → visible → walking-off → peeking. Handles timers for greeting timeout (5s) and inactivity timeout (60s)."
```

**Verify:** TypeScript file compiles without errors (`cd packages/widget && npx tsc --noEmit`).

---

## Task 2 — PageScanner + usePageContext

**Files:**
- `packages/widget/src/components/PageScanner.tsx`
- `packages/widget/src/hooks/usePageContext.ts`

- [ ] Create `packages/widget/src/components/PageScanner.tsx` — ported directly from `Avatar2DWidget.tsx` lines 42–75 and 205–231, with product click wiring:

```typescript
import { useEffect } from 'react'

export interface DetectedProduct {
  id: string
  name: string
  x: number
  y: number
}

interface PageScannerProps {
  enabled: boolean
  onProductsDetected: (products: DetectedProduct[]) => void
  onProductClicked: (product: DetectedProduct) => void
}

export function PageScanner({ enabled, onProductsDetected, onProductClicked }: PageScannerProps) {
  // Detect products on the page — ported from Avatar2DWidget.tsx:42-75
  useEffect(() => {
    if (!enabled) return

    const detectProducts = () => {
      const productElements = document.querySelectorAll('[data-product-id]')
      const detectedProducts: DetectedProduct[] = []

      productElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        const productId = element.getAttribute('data-product-id')
        const productName = element.getAttribute('data-product-name') || productId

        if (productId) {
          detectedProducts.push({
            id: productId,
            name: productName as string,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        }
      })

      onProductsDetected(detectedProducts)
    }

    detectProducts()
    window.addEventListener('resize', detectProducts)
    window.addEventListener('scroll', detectProducts)

    return () => {
      window.removeEventListener('resize', detectProducts)
      window.removeEventListener('scroll', detectProducts)
    }
  }, [enabled, onProductsDetected])

  // Product click handler — ported from Avatar2DWidget.tsx:205-231
  useEffect(() => {
    if (!enabled) return

    const handleProductClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const productCard = target.closest('[data-product-id]')

      if (productCard) {
        const rect = productCard.getBoundingClientRect()
        const productId = productCard.getAttribute('data-product-id') || ''
        const productName = productCard.getAttribute('data-product-name') || productId

        onProductClicked({
          id: productId,
          name: productName,
          x: rect.left + rect.width / 2 - 100,
          y: rect.top + rect.height / 2 + 50,
        })
      }
    }

    document.addEventListener('click', handleProductClick)
    return () => document.removeEventListener('click', handleProductClick)
  }, [enabled, onProductClicked])

  // PageScanner renders nothing — it's a side-effect-only component
  return null
}
```

- [ ] Create `packages/widget/src/hooks/usePageContext.ts`:

```typescript
import { useState, useCallback } from 'react'
import { DetectedProduct } from '../components/PageScanner'

export interface PageContext {
  url: string
  pageTitle: string
  visibleProducts: Array<{ id: string; name: string }>
}

interface UsePageContextReturn {
  products: DetectedProduct[]
  pageContext: PageContext
  handleProductsDetected: (products: DetectedProduct[]) => void
  handleProductClicked: (product: DetectedProduct) => void
  lastClickedProduct: DetectedProduct | null
}

export function usePageContext(): UsePageContextReturn {
  const [products, setProducts] = useState<DetectedProduct[]>([])
  const [lastClickedProduct, setLastClickedProduct] = useState<DetectedProduct | null>(null)

  const handleProductsDetected = useCallback((detected: DetectedProduct[]) => {
    setProducts(detected)
  }, [])

  const handleProductClicked = useCallback((product: DetectedProduct) => {
    setLastClickedProduct(product)
  }, [])

  const pageContext: PageContext = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
    visibleProducts: products.map((p) => ({ id: p.id, name: p.name })),
  }

  return {
    products,
    pageContext,
    handleProductsDetected,
    handleProductClicked,
    lastClickedProduct,
  }
}
```

- [ ] Commit:

```
git add packages/widget/src/components/PageScanner.tsx packages/widget/src/hooks/usePageContext.ts
git commit -m "feat: add PageScanner component and usePageContext hook" -m "Ports DOM scanning and product click detection from Avatar2DWidget.tsx. PageScanner is a side-effect-only component. usePageContext wraps it with state."
```

**Verify:** Check TypeScript compiles (`npx tsc --noEmit` from `packages/widget`).

---

## Task 3 — lib/api.ts

**File:** `packages/widget/src/lib/api.ts`

- [ ] Create directory `packages/widget/src/lib/`

- [ ] Create `packages/widget/src/lib/api.ts`:

```typescript
import { PageContext } from '../hooks/usePageContext'

export interface ChatRequest {
  message: string
  sessionId: string
  pageContext: PageContext
}

export interface ChatResponse {
  response: string
  sessionId: string
  targetProduct: string | null
}

export async function postChat(
  apiEndpoint: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status}`)
  }

  return res.json()
}

export function generateSessionId(): string {
  return 'visitor-' + Math.random().toString(36).slice(2, 11)
}
```

- [ ] Commit:

```
git add packages/widget/src/lib/api.ts
git commit -m "feat: add lib/api.ts — POST /chat wrapper with pageContext" -m "Typed request/response interfaces. generateSessionId() for visitor tracking."
```

**Verify:** `npx tsc --noEmit` from `packages/widget`.

---

## Task 4 — SpeechBubble component

**File:** `packages/widget/src/components/SpeechBubble.tsx`

- [ ] Create `packages/widget/src/components/SpeechBubble.tsx`:

```typescript
import React from 'react'

interface SpeechBubbleProps {
  message: string
  isTyping: boolean
  side?: 'left' | 'right'  // which side the avatar is on
}

export function SpeechBubble({ message, isTyping, side = 'right' }: SpeechBubbleProps) {
  const bubbleSide = side === 'right' ? 'right' : 'left'
  const tailSide = side === 'right' ? 'right' : 'left'

  return (
    <>
      <style>{`
        @keyframes avatar-pop-in {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes avatar-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-8px); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          [bubbleSide]: '410px',
          bottom: '260px',
          maxWidth: '320px',
          minWidth: '160px',
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '20px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
          fontSize: '15px',
          color: '#2c3e50',
          lineHeight: '1.55',
          zIndex: 10001,
          animation: 'avatar-pop-in 0.35s ease',
          border: '1.5px solid #f0f0f0',
          pointerEvents: 'none',
        }}
      >
        {isTyping ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#667eea', fontStyle: 'italic', fontSize: '13px' }}>Thinking</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#667eea',
                    animation: `avatar-bounce 1.4s infinite ease-in-out both`,
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          message
        )}

        {/* Tail pointing toward the avatar */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            [tailSide]: '-11px',
            width: 0,
            height: 0,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            [tailSide === 'right' ? 'borderLeft' : 'borderRight']: '11px solid #ffffff',
          }}
        />
        {/* Tail border */}
        <div
          style={{
            position: 'absolute',
            bottom: '27px',
            [tailSide]: '-13px',
            width: 0,
            height: 0,
            borderTop: '11px solid transparent',
            borderBottom: '11px solid transparent',
            [tailSide === 'right' ? 'borderLeft' : 'borderRight']: '13px solid #f0f0f0',
            zIndex: -1,
          }}
        />
      </div>
    </>
  )
}
```

- [ ] Commit:

```
git add packages/widget/src/components/SpeechBubble.tsx
git commit -m "feat: add SpeechBubble component" -m "Floating bubble positioned near avatar. Shows typing indicator (3-dot bounce) or message text. Tail points toward avatar side."
```

**Verify:** No TypeScript errors.

---

## Task 5 — ChatBar component

**File:** `packages/widget/src/components/ChatBar.tsx`

- [ ] Create `packages/widget/src/components/ChatBar.tsx`:

```typescript
import React, { useState } from 'react'

interface ChatBarProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatBar({ onSend, disabled = false, placeholder = 'Ask me anything...' }: ChatBarProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <>
      <style>{`
        @keyframes avatar-slide-up {
          from { transform: translateX(-50%) translateY(80px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          animation: 'avatar-slide-up 0.4s ease',
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            padding: '6px 6px 6px 6px',
            borderRadius: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.11)',
            backdropFilter: 'blur(10px)',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
            style={{
              width: '280px',
              padding: '10px 18px',
              borderRadius: '30px',
              border: 'none',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f4f4f5',
              color: '#2c3e50',
              opacity: disabled ? 0.6 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              padding: '10px 22px',
              backgroundColor: canSend ? '#667eea' : '#d0d0d0',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: canSend ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (canSend) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (canSend) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  )
}
```

- [ ] Commit:

```
git add packages/widget/src/components/ChatBar.tsx
git commit -m "feat: add ChatBar component" -m "Minimal centered input bar at bottom of viewport. Disabled state during API calls. Slide-up animation on mount."
```

---

## Task 6 — PeekTab component

**File:** `packages/widget/src/components/PeekTab.tsx`

- [ ] Create `packages/widget/src/components/PeekTab.tsx`:

```typescript
import React from 'react'

interface PeekTabProps {
  onClick: () => void
  label?: string
}

export function PeekTab({ onClick, label = 'Need help?' }: PeekTabProps) {
  return (
    <>
      <style>{`
        @keyframes avatar-peek-slide-in {
          from { transform: translateX(100%) translateY(-50%); }
          to   { transform: translateX(0)     translateY(-50%); }
        }
        .avatar-peek-tab:hover {
          transform: translateX(-4px) translateY(-50%) !important;
          box-shadow: -4px 4px 20px rgba(102, 126, 234, 0.45) !important;
        }
      `}</style>
      <button
        className="avatar-peek-tab"
        onClick={onClick}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateX(0) translateY(-50%)',
          backgroundColor: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '10px 0 0 10px',
          padding: '14px 10px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          letterSpacing: '0.04em',
          zIndex: 9999,
          boxShadow: '-2px 2px 12px rgba(102, 126, 234, 0.35)',
          animation: 'avatar-peek-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {label}
      </button>
    </>
  )
}
```

- [ ] Commit:

```
git add packages/widget/src/components/PeekTab.tsx
git commit -m "feat: add PeekTab component" -m "Vertical tab sticking from right edge. Slides in with spring animation. Hover nudges left to invite click."
```

---

## Task 7 — AvatarCharacter component

**File:** `packages/widget/src/components/AvatarCharacter.tsx`

This component replaces `Avatar3DModel.tsx`. It loads a GLB with `useGLTF` and drives Mixamo animations with `useAnimations`. Falls back to a geometric shape if the model is missing.

Key notes:
- `useGLTF` must be called inside the component, NOT at module level (avoids the preload bug in `Avatar3DModel.tsx:149`)
- Animation names from Mixamo GLB exports follow the pattern `mixamo.com` or just the clip name
- Walk-off is driven by translating `position.x` in `useFrame` until offscreen, then calling `onWalkOffComplete`

- [ ] Create `packages/widget/src/components/AvatarCharacter.tsx`:

```typescript
import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Group, AnimationAction } from 'three'

export type AvatarAnimation = 'idle' | 'walk' | 'talk' | 'wave'

interface AvatarCharacterProps {
  modelPath?: string
  currentAnimation: AvatarAnimation
  isWalkingIn: boolean
  isWalkingOff: boolean
  onWalkInComplete?: () => void
  onWalkOffComplete?: () => void
  targetX?: number | null  // screen-space X to slide toward (null = stay at home)
}

// Fallback geometric avatar — renders when GLB is absent
function FallbackAvatar({ isTalking }: { isTalking: boolean }) {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.position.y = -1 + Math.sin(t * 2) * 0.03
    if (isTalking) {
      groupRef.current.rotation.x = Math.sin(t * 8) * 0.03
    } else {
      groupRef.current.rotation.x = 0
    }
  })

  return (
    <group ref={groupRef} scale={1.5} position={[0, -1, 0]}>
      {/* Body */}
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 1.2, 16, 32]} />
        <meshStandardMaterial color="#667eea" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#f5d5b8" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 2.18, 0.28]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.1, 2.18, 0.28]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
    </group>
  )
}

// Clip name resolver — Mixamo exports use varied naming conventions
function findClip(actions: Record<string, AnimationAction | null>, type: AvatarAnimation): AnimationAction | null {
  const nameMap: Record<AvatarAnimation, string[]> = {
    idle:  ['idle', 'standing', 'stand', 'breathe', 'mixamo'],
    walk:  ['walk', 'walking', 'run'],
    talk:  ['talk', 'talking', 'speak', 'gesture', 'wave_hip'],
    wave:  ['wave', 'greet', 'hi'],
  }
  const keywords = nameMap[type]
  const key = Object.keys(actions).find((name) =>
    keywords.some((kw) => name.toLowerCase().includes(kw))
  )
  return key ? actions[key] : null
}

function GLBAvatar({
  modelPath,
  currentAnimation,
  isWalkingIn,
  isWalkingOff,
  onWalkInComplete,
  onWalkOffComplete,
}: Required<Pick<AvatarCharacterProps, 'modelPath' | 'currentAnimation' | 'isWalkingIn' | 'isWalkingOff'>> & {
  onWalkInComplete?: () => void
  onWalkOffComplete?: () => void
}) {
  const groupRef = useRef<Group>(null)
  const walkInDoneRef = useRef(false)
  const walkOffDoneRef = useRef(false)
  const gltf = useGLTF(modelPath)
  const { actions } = useAnimations(gltf.animations, groupRef)

  // Start initial X position offscreen to the right
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.x = isWalkingIn ? 6 : 0
    }
  }, [])

  // Swap animation clips
  useEffect(() => {
    if (!actions) return
    const target = findClip(actions, currentAnimation)
    if (!target) return
    // Fade out all, fade in target
    Object.values(actions).forEach((a) => a?.fadeOut(0.3))
    target.reset().fadeIn(0.3).play()
  }, [currentAnimation, actions])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const pos = groupRef.current.position

    // Walk in from right edge
    if (isWalkingIn && !walkInDoneRef.current) {
      if (pos.x > 0.05) {
        pos.x -= delta * 3.5
      } else {
        pos.x = 0
        walkInDoneRef.current = true
        onWalkInComplete?.()
      }
    }

    // Walk off to right edge
    if (isWalkingOff && !walkOffDoneRef.current) {
      pos.x += delta * 3.5
      if (pos.x > 7) {
        walkOffDoneRef.current = true
        onWalkOffComplete?.()
      }
    }
  })

  return (
    <group ref={groupRef} scale={2.5} position={[0, -1, 0]}>
      <primitive object={gltf.scene} />
    </group>
  )
}

export function AvatarCharacter({
  modelPath = '/models/avatar.glb',
  currentAnimation,
  isWalkingIn,
  isWalkingOff,
  onWalkInComplete,
  onWalkOffComplete,
}: AvatarCharacterProps) {
  const [modelFailed, setModelFailed] = useState(false)

  // Check if model file exists via HEAD request — avoids Three.js crash on missing file
  useEffect(() => {
    fetch(modelPath, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) setModelFailed(true)
      })
      .catch(() => setModelFailed(true))
  }, [modelPath])

  if (modelFailed) {
    return <FallbackAvatar isTalking={currentAnimation === 'talk'} />
  }

  return (
    <GLBAvatar
      modelPath={modelPath}
      currentAnimation={currentAnimation}
      isWalkingIn={isWalkingIn}
      isWalkingOff={isWalkingOff}
      onWalkInComplete={onWalkInComplete}
      onWalkOffComplete={onWalkOffComplete}
    />
  )
}
```

- [ ] Commit:

```
git add packages/widget/src/components/AvatarCharacter.tsx
git commit -m "feat: add AvatarCharacter component — GLB loader with Mixamo animations" -m "Loads GLB with useGLTF + useAnimations. Supports idle/walk/talk/wave clip switching. HEAD-checks model path before loading to avoid crash on missing file. Falls back to geometric avatar if model absent."
```

**Verify:** `npx tsc --noEmit` from `packages/widget`. No errors expected even without model file.

---

## Task 8 — AvatarController (main orchestrator)

**File:** `packages/widget/src/components/AvatarController.tsx`

This is the top-level component that:
1. Mounts `PageScanner` (invisible)
2. Renders `Canvas` with `AvatarCharacter` conditionally
3. Renders `SpeechBubble`, `ChatBar`, `PeekTab` based on state
4. Wires `useAvatarState`, `usePageContext`, `postChat`

- [ ] Create `packages/widget/src/components/AvatarController.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useAvatarState } from '../hooks/useAvatarState'
import { usePageContext } from '../hooks/usePageContext'
import { postChat, generateSessionId, ChatResponse } from '../lib/api'
import { AvatarCharacter, AvatarAnimation } from './AvatarCharacter'
import { SpeechBubble } from './SpeechBubble'
import { ChatBar } from './ChatBar'
import { PeekTab } from './PeekTab'
import { PageScanner } from './PageScanner'

interface AvatarControllerProps {
  apiEndpoint?: string
  initialMessage?: string
  modelPath?: string
}

export function AvatarController({
  apiEndpoint = 'http://localhost:3001/chat',
  initialMessage = "Hi! I'm here to help. Ask me anything about the products on this page!",
  modelPath = '/models/avatar.glb',
}: AvatarControllerProps) {
  const { state, interact, dismiss, peek, summon, resetInactivityTimer } = useAvatarState()
  const { products, pageContext, handleProductsDetected, handleProductClicked, lastClickedProduct } =
    usePageContext()

  const [sessionId] = useState(() => generateSessionId())
  const [speechText, setSpeechText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState<AvatarAnimation>('idle')
  const [isWalkingIn, setIsWalkingIn] = useState(false)
  const [isWalkingOff, setIsWalkingOff] = useState(false)

  // Show greeting message when entering greeting state
  useEffect(() => {
    if (state === 'greeting') {
      setIsWalkingIn(true)
      setIsWalkingOff(false)
      setCurrentAnimation('walk')
      setSpeechText('')
    }
    if (state === 'walking-off') {
      setIsWalkingOff(true)
      setIsWalkingIn(false)
      setCurrentAnimation('walk')
      setSpeechText('')
    }
    if (state === 'hidden' || state === 'peeking') {
      setIsWalkingIn(false)
      setIsWalkingOff(false)
    }
  }, [state])

  // When walk-in completes, show greeting speech bubble
  const handleWalkInComplete = useCallback(() => {
    setCurrentAnimation('wave')
    setSpeechText(initialMessage)
    // Revert to idle after wave
    setTimeout(() => setCurrentAnimation('idle'), 2500)
  }, [initialMessage])

  // When walk-off animation completes, transition to peeking
  const handleWalkOffComplete = useCallback(() => {
    peek()
    setIsWalkingOff(false)
    setCurrentAnimation('idle')
  }, [peek])

  // Product click — avatar does talk animation and sets message
  useEffect(() => {
    if (!lastClickedProduct) return
    interact()
    setCurrentAnimation('talk')
    setSpeechText(`Let me tell you about ${lastClickedProduct.name}!`)
    resetInactivityTimer()
    setTimeout(() => setCurrentAnimation('idle'), 2500)
  }, [lastClickedProduct])

  const handleSend = useCallback(async (message: string) => {
    interact()
    resetInactivityTimer()
    setSpeechText('')
    setIsTyping(true)
    setCurrentAnimation('idle')

    try {
      const data: ChatResponse = await postChat(apiEndpoint, {
        message,
        sessionId,
        pageContext,
      })

      setIsTyping(false)
      setSpeechText(data.response)
      setCurrentAnimation('talk')

      // If response targets a product, show which one
      if (data.targetProduct) {
        const target = products.find((p) => p.id === data.targetProduct)
        if (target) {
          // Brief slide toward product — future enhancement (Phase 2.5)
          // For now just highlight in speech
        }
      }

      // Revert to idle after talking duration
      const talkMs = Math.min(data.response.length * 35, 4500)
      setTimeout(() => setCurrentAnimation('idle'), talkMs)
    } catch {
      setIsTyping(false)
      setSpeechText("Sorry, I had trouble connecting. Please try again!")
      setCurrentAnimation('talk')
      setTimeout(() => setCurrentAnimation('idle'), 2000)
    }
  }, [apiEndpoint, sessionId, pageContext, products, interact, resetInactivityTimer])

  // Canvas is visible whenever NOT hidden or peeking
  const showCanvas = state === 'greeting' || state === 'visible' || state === 'walking-off'
  // Chat UI visible only in visible state
  const showChatUI = state === 'visible' || state === 'greeting'
  const showSpeech = showChatUI && (speechText.length > 0 || isTyping)

  return (
    <>
      {/* Side-effect scanner — always mounted once widget initializes */}
      <PageScanner
        enabled={state !== 'hidden'}
        onProductsDetected={handleProductsDetected}
        onProductClicked={handleProductClicked}
      />

      {/* 3D Canvas — avatar standing at bottom right */}
      {showCanvas && (
        <div
          style={{
            position: 'fixed',
            right: '40px',
            bottom: 0,
            width: '320px',
            height: '520px',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          <Canvas style={{ pointerEvents: 'auto' }} shadows>
            <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={45} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-3, 5, -2]} intensity={0.6} color="#b3d9ff" />
            <directionalLight position={[0, 3, -5]} intensity={0.8} color="#ffd4a3" />
            <pointLight position={[0, 0, 3]} intensity={0.3} color="#667eea" />
            <AvatarCharacter
              modelPath={modelPath}
              currentAnimation={currentAnimation}
              isWalkingIn={isWalkingIn}
              isWalkingOff={isWalkingOff}
              onWalkInComplete={handleWalkInComplete}
              onWalkOffComplete={handleWalkOffComplete}
            />
          </Canvas>
        </div>
      )}

      {/* Speech bubble */}
      {showSpeech && (
        <SpeechBubble message={speechText} isTyping={isTyping} side="right" />
      )}

      {/* Dismiss button */}
      {showChatUI && (
        <button
          onClick={dismiss}
          title="Dismiss assistant"
          style={{
            position: 'fixed',
            right: '24px',
            top: '24px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1.5px solid #667eea',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#667eea',
            zIndex: 10002,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          ×
        </button>
      )}

      {/* Chat input bar */}
      {showChatUI && (
        <ChatBar onSend={handleSend} disabled={isTyping} />
      )}

      {/* Peek tab — shown only in peeking state */}
      {state === 'peeking' && (
        <PeekTab onClick={summon} />
      )}
    </>
  )
}
```

- [ ] Commit:

```
git add packages/widget/src/components/AvatarController.tsx
git commit -m "feat: add AvatarController — main orchestrator wiring state machine to all child components" -m "Connects useAvatarState, usePageContext, postChat, AvatarCharacter, SpeechBubble, ChatBar, PeekTab, PageScanner. Handles walk-in/walk-off lifecycle, greeting, chat send, product click."
```

**Verify:** `npx tsc --noEmit` from `packages/widget`.

---

## Task 9 — Update index.tsx entry point

**File:** `packages/widget/src/index.tsx`

The entry point currently exports `AvatarWidget`. Update it to export `AvatarController` instead, keeping the same `window.AvatarWidget.init` API shape.

- [ ] Edit `packages/widget/src/index.tsx` — replace entire file:

```typescript
import { createRoot } from 'react-dom/client'
import { AvatarController } from './components/AvatarController'

export { AvatarController }

// Auto-initialization for script tag usage
// Usage: <script src="avatar-widget.umd.js"></script>
//        <script>window.AvatarWidget.init({ apiEndpoint: '...', initialMessage: '...' })</script>
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.AvatarWidget = {
    init: (config?: {
      apiEndpoint?: string
      initialMessage?: string
      modelPath?: string
    }) => {
      const existing = document.getElementById('avatar-widget-root')
      if (existing) return // already mounted

      const container = document.createElement('div')
      container.id = 'avatar-widget-root'
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(<AvatarController {...config} />)
    },
  }
}
```

- [ ] Commit:

```
git add packages/widget/src/index.tsx
git commit -m "feat: update index.tsx entry point to use AvatarController" -m "Replaces AvatarWidget with AvatarController. Adds guard against double-mounting."
```

**Verify:** Run `npm run build` from `packages/widget` — ESM and UMD bundles should build without error (model file absence is fine; it's loaded at runtime).

---

## Task 10 — Backend /chat update

**File:** `packages/backend/src/index.ts`

Add `pageContext` to the request body destructure and include it in the Claude system prompt so the AI knows what products are visible on the page.

- [ ] Edit `packages/backend/src/index.ts` — replace the `/chat` route handler with:

```typescript
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default', products = [], pageContext } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Get or create conversation history
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [])
    }
    const history = conversations.get(sessionId)!

    // Add user message to history
    history.push({ role: 'user', content: message })

    let response: string
    let targetProduct: string | null = null

    // Build page context string for system prompt
    const pageContextStr = pageContext
      ? `\n\nCurrent page: ${pageContext.pageTitle} (${pageContext.url})` +
        (pageContext.visibleProducts?.length
          ? `\nVisible products on this page: ${pageContext.visibleProducts
              .map((p: { id: string; name: string }) => `${p.name} (id: ${p.id})`)
              .join(', ')}`
          : '')
      : products.length > 0
      ? `\n\nAvailable products: ${products.map((p: { id: string; name: string }) => `${p.name} (id: ${p.id})`).join(', ')}`
      : ''

    if (anthropic) {
      try {
        const claudeResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: `You are a friendly, concise AI sales assistant embedded on a website as a 3D avatar. You greet visitors, answer product questions, and help them find what they need. Keep responses under 3 sentences when possible — you are speaking as a voice/chat avatar, not writing an essay.${pageContextStr}

If the user asks about a specific product visible on this page, include in your response: TARGET_PRODUCT:[product_id]
Example: "These headphones are great for travel! TARGET_PRODUCT:headphones-001"`,
          messages: history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        })

        response =
          claudeResponse.content[0].type === 'text'
            ? claudeResponse.content[0].text
            : 'I apologize, but I had trouble processing that request.'

        // Extract target product if mentioned
        const targetMatch = response.match(/TARGET_PRODUCT:([\w-]+)/)
        if (targetMatch) {
          targetProduct = targetMatch[1]
          response = response.replace(/TARGET_PRODUCT:[\w-]+/g, '').trim()
        }
      } catch (error) {
        console.error('Claude API error:', error)
        response = "I'm having trouble connecting right now. Please try again in a moment."
      }
    } else {
      // Mock response for demo/development
      const mockResult = getMockResponse(message, pageContext?.visibleProducts || products)
      response = mockResult.response
      targetProduct = mockResult.targetProduct
    }

    // Add assistant response to history
    history.push({ role: 'assistant', content: response })

    // Keep only last 10 messages to prevent memory issues
    if (history.length > 10) {
      history.splice(0, history.length - 10)
    }

    res.json({ response, sessionId, targetProduct })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

- [ ] Commit:

```
git add packages/backend/src/index.ts
git commit -m "feat: update /chat endpoint to accept pageContext" -m "pageContext includes url, pageTitle, visibleProducts. System prompt updated to include page context. TARGET_PRODUCT regex extended to support hyphenated IDs."
```

**Verify:** Run `npm run dev:backend` and POST to `http://localhost:3001/chat` with:
```json
{
  "message": "What products do you have?",
  "sessionId": "test-123",
  "pageContext": {
    "url": "http://localhost:5173/test.html",
    "pageTitle": "Test Store",
    "visibleProducts": [{ "id": "shoe-1", "name": "Nike Air Max" }]
  }
}
```
Confirm response JSON contains `response` and `targetProduct` fields.

---

## Task 11 — Test page

**File:** `packages/widget/index.html` (or create `packages/widget/test.html`)

Create a test HTML page with `[data-product-id]` elements that exercises the full widget flow.

- [ ] Create `packages/widget/test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Avatar Widget — Phase 2 Test Store</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; }

    header {
      background: #667eea;
      color: white;
      padding: 20px 40px;
      font-size: 22px;
      font-weight: 700;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
      padding: 40px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .product-card {
      background: white;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .product-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.13);
    }

    .product-card img {
      width: 100%;
      height: 140px;
      object-fit: cover;
      border-radius: 8px;
      background: #e8e8e8;
    }

    .product-card h3 { margin-top: 12px; font-size: 16px; color: #2c3e50; }
    .product-card p  { margin-top: 6px;  font-size: 13px; color: #888; }
    .product-card .price { margin-top: 10px; font-size: 18px; font-weight: 700; color: #667eea; }
  </style>
</head>
<body>

<header>Test Store — Avatar Widget Phase 2</header>

<div class="product-grid">
  <div class="product-card" data-product-id="headphones-001" data-product-name="Sony WH-1000XM5">
    <div style="height:140px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:8px;"></div>
    <h3>Sony WH-1000XM5</h3>
    <p>Industry-leading noise cancellation</p>
    <div class="price">$349</div>
  </div>

  <div class="product-card" data-product-id="watch-001" data-product-name="Apple Watch Series 9">
    <div style="height:140px;background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:8px;"></div>
    <h3>Apple Watch Series 9</h3>
    <p>Health monitoring & fitness tracking</p>
    <div class="price">$399</div>
  </div>

  <div class="product-card" data-product-id="keyboard-001" data-product-name="Keychron Q1 Pro">
    <div style="height:140px;background:linear-gradient(135deg,#4facfe,#00f2fe);border-radius:8px;"></div>
    <h3>Keychron Q1 Pro</h3>
    <p>Wireless mechanical keyboard</p>
    <div class="price">$199</div>
  </div>

  <div class="product-card" data-product-id="mouse-001" data-product-name="Logitech MX Master 3">
    <div style="height:140px;background:linear-gradient(135deg,#43e97b,#38f9d7);border-radius:8px;"></div>
    <h3>Logitech MX Master 3</h3>
    <p>Ergonomic wireless mouse</p>
    <div class="price">$99</div>
  </div>

  <div class="product-card" data-product-id="monitor-001" data-product-name="LG UltraWide 34">
    <div style="height:140px;background:linear-gradient(135deg,#fa709a,#fee140);border-radius:8px;"></div>
    <h3>LG UltraWide 34"</h3>
    <p>34" curved ultrawide display</p>
    <div class="price">$799</div>
  </div>

  <div class="product-card" data-product-id="stand-001" data-product-name="Ergotron LX Arm">
    <div style="height:140px;background:linear-gradient(135deg,#a18cd1,#fbc2eb);border-radius:8px;"></div>
    <h3>Ergotron LX Arm</h3>
    <p>Adjustable monitor arm</p>
    <div class="price">$149</div>
  </div>
</div>

<!-- Widget load — in dev mode this comes from Vite dev server -->
<script type="module">
  import { AvatarController } from '/src/index.tsx'
  import { createRoot } from 'react'
  import { createElement } from 'react'

  // Or use window.AvatarWidget.init after UMD build
  // For dev: the Vite dev server exposes /src/index.tsx directly
</script>

<!-- For built UMD (after npm run build): -->
<!--
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="./dist/avatar-widget.umd.js"></script>
<script>
  window.AvatarWidget.init({
    apiEndpoint: 'http://localhost:3001/chat',
    initialMessage: "Hi! I'm here to help you find the perfect gear.",
  })
</script>
-->

</body>
</html>
```

- [ ] Since Vite dev server won't run `test.html` as a module page cleanly for a lib build, also add a dev entrypoint. Edit `packages/widget/index.html` to load the widget via the dev entry path. Open the existing file first — if it already exists, update the body to add widget init:

The simplest dev approach is to update `packages/widget/index.html` body section to call `AvatarWidget.init`. If it doesn't exist yet, create it:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Avatar Widget — Dev</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #f0f0f0; margin: 0; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 40px; }
      .card { background: white; border-radius: 12px; padding: 20px; cursor: pointer;
              box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
      .card h3 { font-size: 15px; color: #333; margin-bottom: 6px; }
      .card .price { font-weight: 700; color: #667eea; }
    </style>
  </head>
  <body>
    <div style="background:#667eea;color:white;padding:20px 40px;font-size:20px;font-weight:700;">
      Avatar Widget Dev Store
    </div>
    <div class="grid">
      <div class="card" data-product-id="headphones-001" data-product-name="Sony WH-1000XM5">
        <h3>Sony WH-1000XM5</h3>
        <div class="price">$349</div>
      </div>
      <div class="card" data-product-id="watch-001" data-product-name="Apple Watch Series 9">
        <h3>Apple Watch Series 9</h3>
        <div class="price">$399</div>
      </div>
      <div class="card" data-product-id="keyboard-001" data-product-name="Keychron Q1 Pro">
        <h3>Keychron Q1 Pro</h3>
        <div class="price">$199</div>
      </div>
    </div>
    <script type="module" src="/src/index.tsx"></script>
    <script type="module">
      // Wait for module to define window.AvatarWidget
      import('/src/index.tsx').then(() => {
        if (window.AvatarWidget) {
          window.AvatarWidget.init({
            apiEndpoint: 'http://localhost:3001/chat',
            initialMessage: "Hi! I'm your AI shopping assistant. Ask me about any product!",
          })
        }
      })
    </script>
  </body>
</html>
```

- [ ] Commit:

```
git add packages/widget/test.html packages/widget/index.html
git commit -m "feat: add test page with product grid for Phase 2 manual verification" -m "6 product cards with data-product-id attributes. Dev index.html calls window.AvatarWidget.init via module import."
```

---

## Full Verification Checklist

Run `npm run dev:widget` (port 5173) and `npm run dev:backend` (port 3001) in separate terminals, then open `http://localhost:5173`.

- [ ] Page loads without console errors
- [ ] After ~1 second, avatar canvas appears at bottom right (geometric fallback or GLB)
- [ ] Avatar plays walk-in animation (slides from right)
- [ ] Greeting speech bubble appears after walk-in completes
- [ ] After 5 seconds of no interaction, avatar walks off to the right
- [ ] "Need help?" peek tab appears at right edge after walk-off
- [ ] Click peek tab → avatar walks back in with greeting
- [ ] ChatBar appears at bottom center
- [ ] Type a message and hit Send → typing indicator shows → response appears in speech bubble
- [ ] Avatar plays talk animation during response
- [ ] Click a product card → avatar reacts with "Let me tell you about..." message
- [ ] Dismiss button (×) → avatar walks off → peek tab shows
- [ ] 60s inactivity in visible state → avatar walks off automatically
- [ ] Open browser Network tab → confirm POST /chat sends `pageContext` with `visibleProducts`
- [ ] Check console: no `useGLTF.preload` crash, no missing model crash

---

## Notes for Implementer

- **Model file:** `/models/avatar.glb` does not exist yet. The `AvatarCharacter` HEAD-checks and falls back gracefully to the geometric avatar. To add a real model: download a Mixamo character + 4 animation FBX files, convert to GLB, place at `packages/widget/public/models/avatar.glb`. See design spec for Mixamo setup steps.
- **Animation names:** Mixamo GLB exports may name clips differently depending on how they were exported. The `findClip` function in `AvatarCharacter` uses keyword matching — check the actual clip names via `console.log(Object.keys(actions))` if animations don't play.
- **Double `useGLTF` call pattern:** `GLBAvatar` calls `useGLTF` inside the component (not at module level). This is intentional — it avoids the preload crash documented in `CLAUDE.md` for `Avatar3DModel.tsx:149`.
- **Vite lib mode:** Three.js and @react-three/* are NOT listed as external in `vite.config.ts` — they will be bundled. This is correct for the UMD build since the host page won't have them. Only React/ReactDOM are external.
- **sessionId:** Generated once per `AvatarController` mount via `useState(() => generateSessionId())`. Persists for the page session. Does not survive page reload — Supabase persistence is Phase 4.
