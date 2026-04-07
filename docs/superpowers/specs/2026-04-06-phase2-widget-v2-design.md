# Phase 2 — Widget v2 Core Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Goal:** Replace the prototype widget with a production state machine, realistic 3D avatar (Mixamo), speech bubble + input bar UX, and edge tab peek mechanic.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Avatar interaction | **Hybrid** — fixed corner for conversation, slides to products on hover/click | Wow factor without full page pathfinding complexity |
| Chat UX | **Speech bubble + input bar** — avatar speaks via floating bubble, minimal centered input bar at bottom | Feels like talking to a person, not using a chatbot |
| Peek mechanic | **Edge tab** — small tab sticking from screen edge saying "Need help?" | Minimal, unobtrusive; clicking triggers avatar walk-in animation |
| 3D model | **Mixamo character + animations** — download character + idle/walk/talk/wave FBX → convert to GLB | Realistic from day one; avoids RPM issues; free via Adobe account |
| Expandable chat | **No** — speech bubble only, no expandable panel for Phase 2 | Keep it simple; can add expandable panel in future |

---

## Widget State Machine

```
STATES: hidden → greeting → visible → walking-off → peeking

hidden
  └─ onPageLoad (auto, after 1s delay) ───→ greeting
      avatar walks in from right edge, speaks greeting

greeting
  └─ onUserInteraction (type/click) ──────→ visible
  └─ onNoInteraction (5s timeout) ────────→ walking-off

visible
  └─ onDismiss (close button) ────────────→ peeking
  └─ onInactivity (60s no interaction) ───→ walking-off
  └─ onProductClick (data-product-id) ────→ avatar slides toward product, stays visible

walking-off
  └─ avatar walks to right edge ──────────→ peeking

peeking
  └─ onTabClick ("Need help?") ───────────→ greeting (avatar walks back in)
```

---

## Component Architecture

### New Files

| File | Responsibility |
|------|---------------|
| `AvatarController.tsx` | State machine (hidden→greeting→visible→walking-off→peeking). Orchestrates all child components. |
| `useAvatarState.ts` | State machine hook — manages current state, transitions, timers |
| `ChatBar.tsx` | Minimal centered input bar at bottom of viewport (text input + send button + mic placeholder) |
| `SpeechBubble.tsx` | Floating speech bubble positioned near avatar |
| `PeekTab.tsx` | Edge tab trigger — "Need help?" sticking from right edge |
| `PageScanner.tsx` | DOM scanner — detects `[data-product-id]` elements, tracks positions (ported from Avatar2DWidget.tsx:42-75) |
| `usePageContext.ts` | Hook wrapping PageScanner — returns visible products, page title, URL |
| `AvatarCharacter.tsx` | 3D GLB model loader with Mixamo animations (idle, walk, talk, wave) — replaces Avatar3D + Avatar3DModel |

### Files to Keep
| File | Status |
|------|--------|
| `vite.config.ts` | Keep as-is |
| `index.tsx` | Update entry point to use AvatarController |

### Files to Remove (after Phase 2)
| File | Reason |
|------|--------|
| `Avatar3D.tsx` | Replaced by AvatarCharacter (Mixamo GLB) |
| `Avatar3DModel.tsx` | Replaced by AvatarCharacter (has preload bug anyway) |
| `Avatar2DWidget.tsx` | Logic ported to AvatarController + PageScanner |
| `AvatarWidget.tsx` | Replaced by AvatarController |
| `ChatInterface.tsx` | Replaced by ChatBar + SpeechBubble |
| `SimpleWidget.tsx` | Stub, never completed |

---

## Data Flow

```
User loads page
  → AvatarController initializes in "hidden" state
  → PageScanner detects products on the page
  → After 1s delay, state transitions to "greeting"
  → AvatarCharacter renders in Canvas, plays walk-in animation
  → SpeechBubble shows greeting message
  → ChatBar appears at bottom center

User types message
  → ChatBar calls POST /chat with message + pageContext
  → Backend returns { text, targetProduct }
  → SpeechBubble shows response text
  → If targetProduct: AvatarCharacter slides toward product position
  → AvatarCharacter plays talk animation

User ignores avatar (5s in greeting, 60s in visible)
  → State transitions to "walking-off"
  → AvatarCharacter plays walk animation toward right edge
  → Canvas shrinks/hides
  → PeekTab appears at right edge

User clicks PeekTab
  → State transitions to "greeting"
  → PeekTab hides
  → AvatarCharacter walks back in, greeting replays
```

---

## /chat API Updates (Backend)

The existing `/chat` endpoint needs minor updates to accept `pageContext`:

**Request (updated):**
```json
{
  "message": "What's your return policy?",
  "sessionId": "visitor-uuid",
  "pageContext": {
    "url": "https://store.com/products/shoes",
    "pageTitle": "Nike Air Max — Store",
    "visibleProducts": [
      { "id": "shoe-1", "name": "Nike Air Max" }
    ]
  }
}
```

**Response (unchanged):**
```json
{
  "response": "Our return policy is 30 days...",
  "sessionId": "uuid",
  "targetProduct": "shoe-1" | null
}
```

The system prompt will be updated to include pageContext so Claude knows what's on the page.

---

## Avatar Model Setup

1. Download a Mixamo character (e.g., "Michelle" or "James") as FBX
2. Download 4 animations: idle, walking, talking (gesture), waving
3. Convert FBX → GLB using `npx @nicolo-ribaudo/gltf-transform-cli` or online converter
4. Place in `packages/widget/public/models/avatar.glb`
5. Animation clips loaded via `useAnimations` from @react-three/drei

---

## Verification Checklist

- [ ] Widget loads on a test HTML page via script tag
- [ ] Avatar walks in from right edge, plays greeting
- [ ] Avatar walks off after 5s if no interaction
- [ ] "Need help?" edge tab appears after walk-off
- [ ] Click tab → avatar walks back in
- [ ] Type message → response appears in speech bubble
- [ ] Avatar plays talk animation during response
- [ ] DOM scanner detects `[data-product-id]` elements on page
- [ ] Avatar slides toward product when mentioned in response
- [ ] Close button → avatar walks off → peek tab shows
- [ ] 60s inactivity → avatar walks off automatically
