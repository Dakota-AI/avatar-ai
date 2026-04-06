# PRD & Implementation Spec — 3D Avatar Virtual Salesperson SaaS

**Date:** 2026-04-06  
**Status:** Planning  
**Product name:** TBD (placeholder: AvatarAI)

---

## Context

We have a rough MVP in `~/avatar-widget/` — a 3D chatbot widget with Three.js procedural avatars and a basic Claude backend. After a full product vision session, the direction has fundamentally changed: this is no longer just a "chat widget with a 3D face." It is a **virtual salesperson that lives on a website**, walks around it, knows the business, and proactively engages visitors through voice or text. The MVP code has several reusable pieces (DOM scanner, movement logic, Claude integration pattern) but the product architecture needs to be rebuilt around the new vision.

---

## Product Vision

> A SaaS platform that gives any website a 3D human avatar — a virtual salesperson that walks the page, knows the business, and engages visitors 24/7 through voice or text.

**The core experience:**
- Avatar walks onto the page, greets the visitor, then gets out of the way if ignored
- Always available (edge peek by default — arm/head sticking from screen edge)
- Speaks responses out loud (TTS) + shows them in a corner chat box
- Visitor can type or speak (toggleable)
- Avatar knows the business — products, pricing, shipping, FAQs — via a knowledge base built from the customer's own website
- Proactive — knows what's on screen, walks toward products, reacts to visitor behavior

---

## Target Customers

Any website owner who wants to reduce lost visitors and increase conversions. Priority verticals for launch:
1. **E-commerce** — product discovery, support, upsell
2. **Real estate agencies** — lead qualification, property info, showing scheduling
3. **SaaS companies** — onboarding assist, docs Q&A, support deflection

---

## User Stories

### Visitor (end user on customer's website)
- Page loads → avatar walks in, says a natural greeting
- I ignore it → avatar walks off screen after ~5 seconds
- I want it back → I click the peeking arm/head at the edge of the screen
- I type a question → chat box in corner, avatar responds in text + speaks it aloud
- I toggle to voice → I speak my question, avatar hears and responds
- I hover over a product → avatar walks near it, offers to explain
- I ask about shipping → avatar knows the answer from the business's knowledge base

### Business owner (SaaS customer)
- I sign up → paste my URL → site is auto-crawled, knowledge base built in minutes
- I review the KB → fill in what the crawler missed (policies, FAQs, tone, promotions)
- I pick an avatar character and give it a name
- I configure triggers — when/where it appears, greeting message, delay
- I get a script tag → paste it into my site → avatar is live
- I check the dashboard → see conversation history, common questions, engagement stats

---

## MVP Scope (Phase 1-3)

### In scope for MVP
- Landing page + waitlist
- Widget v2: walk-in greeting → walk-off timer → edge peek → summon mechanic
- Realistic 3D human avatar (GLB via Ready Player Me or Mixamo)
- DOM scanner — page awareness (products, page type, scroll position)
- Corner chat box with conversation history
- Text interaction (type → Claude → response in chat + TTS spoken)
- TTS voice output (ElevenLabs or OpenAI TTS)
- Voice input toggle (Web Speech API)
- Knowledge base from manual enrichment form (pre-crawl)
- Basic Supabase backend (sessions, KB storage)
- Script tag embed via CDN

### Out of scope for MVP (v2)
- Site crawler (auto-crawl on URL paste)
- Full SaaS dashboard (v2 — MVP uses a simple admin form)
- Stripe billing (v2 — MVP is free/waitlist)
- Shopify / WooCommerce integrations
- Behavioral triggers (exit intent, scroll %)
- Multi-avatar (one avatar per customer for MVP)
- Custom avatar builder (customer-uploaded models)
- Analytics dashboard
- White-label / agency reseller

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VISITOR BROWSER                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Customer's Website                      │   │
│  │                                                     │   │
│  │  <script src="cdn.avatarAI.com/widget.js">         │   │
│  │                                                     │   │
│  │  ┌──────────────┐    ┌─────────────────────────┐   │   │
│  │  │  3D Avatar   │    │  Corner Chat Box        │   │   │
│  │  │  (Three.js)  │    │  (React, fixed corner)  │   │   │
│  │  │  walks page  │    │  text + voice toggle    │   │   │
│  │  └──────┬───────┘    └────────────┬────────────┘   │   │
│  │         │                         │                 │   │
│  └─────────┼─────────────────────────┼─────────────────┘   │
│            │     Web Speech API       │                     │
│            └──────────┬──────────────┘                     │
└───────────────────────┼─────────────────────────────────────┘
                        │ POST /chat (with tenantId, sessionId,
                        │            pageContext, message)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   API BACKEND (Vercel / Railway)            │
│                                                             │
│  POST /chat                                                 │
│    1. Load tenant KB from Supabase (pgvector similarity)    │
│    2. Build context: page + KB + conversation history       │
│    3. Call Claude API → get response                        │
│    4. Call TTS API → get audio URL or base64                │
│    5. Return { text, audioUrl, targetProduct? }            │
│                                                             │
│  POST /waitlist      GET /tenant/:id/config                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────────┐
        ▼           ▼               ▼
  ┌──────────┐ ┌─────────┐  ┌──────────────┐
  │ Supabase │ │ Claude  │  │  TTS API     │
  │ Postgres │ │   API   │  │ (ElevenLabs/ │
  │ pgvector │ │         │  │  OpenAI TTS) │
  │ Auth     │ └─────────┘  └──────────────┘
  └──────────┘

┌─────────────────────────────────────────────────────────────┐
│              DASHBOARD (Next.js on Vercel)                  │
│  Onboarding wizard → KB editor → Avatar config → Script tag │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          LANDING PAGE (Vanilla HTML on Vercel)              │
│          Marketing site + waitlist email capture            │
└─────────────────────────────────────────────────────────────┘
```

---

## External Services & Tools

| Service | Purpose | Why |
|---|---|---|
| **Supabase** | Postgres DB, pgvector KB, Auth, storage | Already available via MCP, handles multi-tenancy, vector search |
| **Vercel** | Hosting for landing page, dashboard, API | Already available via MCP, edge network, serverless functions |
| **Claude API** | Conversation engine | Best reasoning for support/sales use cases, already integrated |
| **ElevenLabs API** | TTS voice output | Best voice quality, natural prosody, ~$5/mo starter |
| **Web Speech API** | STT voice input | Browser-native, free, no API key, works in Chrome/Edge/Safari |
| **Ready Player Me** | 3D human avatar models (GLB) | Free tier, realistic humanoids, Mixamo-compatible animations |
| **Mixamo** | Animation library for GLB models | Free via Adobe account, walk/idle/gesture/talk animations |
| **Stripe** | Payments (v2) | Industry standard SaaS billing |
| **Resend** | Transactional email | Waitlist confirmations, onboarding emails |
| **Three.js / R3F** | 3D rendering in browser | Already in codebase |

---

## Data Model (Supabase Schema)

```sql
-- Waitlist (landing page)
CREATE TABLE waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  name        text,
  website_url text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  source      text DEFAULT 'landing_page'
);

-- Tenants (business customers)
CREATE TABLE tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  website_url   text NOT NULL,
  avatar_name   text DEFAULT 'Alex',
  avatar_model  text DEFAULT 'default_female.glb',
  avatar_voice  text DEFAULT 'elevenlabs_voice_id_here',
  greeting      text DEFAULT 'Hi! How can I help you today?',
  trigger_delay int  DEFAULT 5,        -- seconds before walk-off
  peek_style    text DEFAULT 'arm',    -- 'arm' | 'button' | 'portrait'
  created_at    timestamptz NOT NULL DEFAULT now(),
  script_key    text UNIQUE NOT NULL   -- public key embedded in script tag
);

-- Knowledge base entries (per tenant)
CREATE TABLE kb_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants NOT NULL,
  content     text NOT NULL,
  category    text,                    -- 'product' | 'policy' | 'faq' | 'general'
  embedding   vector(1536),            -- pgvector, OpenAI or Claude embeddings
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Conversation sessions
CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants NOT NULL,
  visitor_id  text NOT NULL,           -- anonymous browser fingerprint
  page_url    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_active timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid REFERENCES sessions NOT NULL,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX kb_entries_tenant_idx ON kb_entries(tenant_id);
CREATE INDEX kb_entries_embedding_idx ON kb_entries USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX messages_session_idx ON messages(session_id);
```

---

## Project Structure

```
avatar-ai/                              ← rename from avatar-widget
├── packages/
│   ├── widget/                         ← embeddable script tag widget
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AvatarCharacter.tsx  ← 3D human model + animations (replaces Avatar3D)
│   │   │   │   ├── AvatarController.tsx ← state machine: greet→walk-off→peek→summon
│   │   │   │   ├── ChatBox.tsx          ← corner chat panel (history + input)
│   │   │   │   ├── VoiceToggle.tsx      ← mic button, STT, audio playback
│   │   │   │   ├── PeekTrigger.tsx      ← edge peek animation (arm/head/button)
│   │   │   │   └── PageScanner.tsx      ← DOM scanner (port from Avatar2DWidget)
│   │   │   ├── hooks/
│   │   │   │   ├── useAvatarState.ts    ← state machine logic
│   │   │   │   ├── usePageContext.ts    ← DOM reading + page awareness
│   │   │   │   ├── useSpeech.ts         ← Web Speech API STT
│   │   │   │   └── useAudioPlayer.ts    ← TTS audio playback
│   │   │   ├── lib/
│   │   │   │   └── api.ts               ← POST /chat calls
│   │   │   └── index.tsx                ← AvatarWidget.init() entry
│   │   ├── public/models/               ← GLB avatar files
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── backend/                         ← API server (Express or Vercel functions)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── chat.ts              ← POST /chat (main endpoint)
│   │   │   │   ├── waitlist.ts          ← POST /waitlist
│   │   │   │   └── tenant.ts            ← GET /tenant/:key/config
│   │   │   ├── lib/
│   │   │   │   ├── claude.ts            ← Claude API wrapper
│   │   │   │   ├── tts.ts               ← ElevenLabs TTS wrapper
│   │   │   │   ├── kb.ts                ← vector search (Supabase pgvector)
│   │   │   │   └── supabase.ts          ← Supabase client
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── dashboard/                       ← SaaS dashboard (Next.js)
│   │   ├── app/
│   │   │   ├── (auth)/                  ← login, signup
│   │   │   ├── onboarding/              ← URL input, KB enrichment form, avatar picker
│   │   │   ├── dashboard/               ← KB editor, settings, script tag, analytics
│   │   │   └── api/                     ← Next.js API routes (proxy to backend)
│   │   └── package.json
│   │
│   └── landing/                         ← Marketing site (Vanilla HTML)
│       ├── index.html
│       ├── styles.css
│       ├── main.js
│       ├── api/waitlist.js              ← Vercel serverless function
│       └── vercel.json
│
├── docs/
│   └── superpowers/specs/
│       └── 2026-04-06-avatar-ai-product-design.md
├── package.json                         ← npm workspaces root
└── turbo.json                           ← optional: Turborepo for mono build
```

---

## Widget State Machine

```
STATES: hidden → greeting → visible → walking-off → peeking → visible

hidden
  └─ onPageLoad (after delay) ──────────→ greeting
      avatar walks in, speaks greeting
      chat box appears

greeting
  └─ onUserInteraction ──────────────────→ visible
  └─ onNoInteraction (5s timeout) ───────→ walking-off

walking-off
  └─ avatar walks to edge of screen ────→ peeking

peeking
  └─ onPeekClick ────────────────────────→ greeting (avatar walks back in)
  └─ onProductHover (v2) ────────────────→ visible (avatar walks to product)

visible
  └─ onDismiss ──────────────────────────→ peeking
  └─ onInactivity (60s) ─────────────────→ walking-off
```

---

## /chat API Contract

**Request:**
```json
POST /chat
{
  "tenantKey": "abc123",
  "sessionId": "visitor-uuid",
  "message": "What's your return policy?",
  "inputMode": "text" | "voice",
  "pageContext": {
    "url": "https://store.com/products/shoes",
    "pageTitle": "Nike Air Max — Store",
    "visibleProducts": [
      { "id": "shoe-1", "name": "Nike Air Max", "price": "$129" }
    ],
    "pageType": "product" | "checkout" | "home" | "other"
  }
}
```

**Response:**
```json
{
  "text": "Our return policy is 30 days...",
  "audioUrl": "https://cdn.elevenlabs.io/...",
  "targetProduct": "shoe-1" | null,
  "sessionId": "visitor-uuid"
}
```

---

## Build Phases

### Phase 0 — Project Setup (Day 1)
- Rename repo / restructure to monorepo layout above
- Set up Supabase project, run migrations
- Set up Vercel projects (landing, dashboard, backend)
- Configure environment variables
- Set up ElevenLabs account + get API key
- Get Ready Player Me GLB model + Mixamo animations

### Phase 1 — Landing Page + Waitlist (Day 1-2)
- `packages/landing/` — vanilla HTML/CSS/JS
- Vercel serverless function → Supabase `waitlist` table
- Deploy, verify email capture works
- **Goal: live URL to share for early signups**

### Phase 2 — Widget v2 Core (Day 3-7)
- New `AvatarController.tsx` state machine (greeting → walk-off → peek → summon)
- Port DOM scanner from `Avatar2DWidget.tsx` (reuse existing logic)
- Replace geometric avatar with Ready Player Me GLB + Mixamo animations
- New `ChatBox.tsx` — corner panel with conversation history
- Wire up `/chat` API endpoint (text only, no voice yet)
- **Goal: working widget on a test page**

### Phase 3 — Voice Layer (Day 8-10)
- TTS: integrate ElevenLabs in backend, return `audioUrl` in `/chat` response
- STT: `useSpeech.ts` hook using Web Speech API
- `VoiceToggle.tsx` — mic button in chat bar, toggles voice/text mode
- Audio playback synced with avatar talking animation
- **Goal: visitor can speak to avatar, avatar speaks back**

### Phase 4 — Knowledge Base (Day 11-14)
- Supabase `kb_entries` table + pgvector index
- KB enrichment form (simple web form: products, policies, FAQs, brand voice)
- Embedding pipeline: text → embeddings → stored in pgvector
- RAG in `/chat` route: similarity search → inject top-K results into Claude context
- **Goal: avatar knows the business's actual content**

### Phase 5 — Dashboard + Onboarding (Day 15-20)
- Next.js dashboard with Supabase Auth
- Onboarding: URL input → KB form → avatar picker → script tag
- KB editor: add/edit/delete entries
- Avatar config: name, voice, greeting message, trigger delay, peek style
- Script tag generator
- **Goal: self-serve onboarding without manual setup**

### Phase 6 — Multi-tenancy + Hardening (Day 21-25)
- Per-tenant isolation in all DB queries (RLS policies)
- Rate limiting on `/chat`
- Error boundaries in widget
- Usage tracking (message count per tenant)
- Stripe billing setup (v2)
- **Goal: safe to give to real customers**

---

## Reusable Code from Current MVP

| File | What to port | Where it goes |
|---|---|---|
| `Avatar2DWidget.tsx:42-75` | DOM scanner + product detection | `PageScanner.tsx` |
| `Avatar2DWidget.tsx:78-122` | Movement pathfinding logic | `AvatarController.tsx` |
| `Avatar2DWidget.tsx:205-231` | Product click → walk-to handler | `AvatarController.tsx` |
| `backend/src/index.ts` | Claude API call + system prompt structure | `backend/lib/claude.ts` |
| `AvatarWidget.tsx:226-288` | Speech bubble component | `AvatarCharacter.tsx` |
| `widget/vite.config.ts` | Lib mode UMD + ESM build | Keep as-is |

---

## Environment Variables

```bash
# Backend
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Dashboard
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXTAUTH_SECRET=

# Landing
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

---

## Verification & Testing

### Phase 1 (Landing)
- [ ] Submit email → row appears in Supabase `waitlist`
- [ ] Submit duplicate email → "already on the list" message (no error)
- [ ] Mobile layout at 375px — form usable
- [ ] Vercel deploy URL is live

### Phase 2 (Widget)
- [ ] Widget loads on a test HTML page via script tag
- [ ] Avatar walks in, greets, walks off after 5s, shows peek
- [ ] Click peek → avatar returns
- [ ] Type message → response appears in chat box
- [ ] DOM scanner detects `[data-product-id]` elements
- [ ] Avatar walks to product when clicked

### Phase 3 (Voice)
- [ ] Send text message → audio plays automatically
- [ ] Avatar talking animation syncs with audio
- [ ] Toggle mic → speak → message sent → response spoken
- [ ] Voice toggle persists in session

### Phase 4 (KB)
- [ ] Add KB entry via form → embedding stored in pgvector
- [ ] Ask question related to KB content → Claude uses it in response
- [ ] Ask off-topic question → Claude falls back gracefully

### Phase 5 (Dashboard)
- [ ] Sign up → onboarding flow completes → script tag generated
- [ ] Paste script tag → widget loads with tenant's config
- [ ] Edit KB entry → change reflected in next conversation
