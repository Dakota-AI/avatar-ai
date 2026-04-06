# CLAUDE.md — Avatar AI

## Project Overview
3D AI-powered virtual salesperson SaaS. Embeddable widget that gives any website a realistic 3D avatar that walks the page, greets visitors, and answers questions via text or voice.

## Architecture
- **Monorepo:** npm workspaces (`packages/*`)
- **Widget:** React 18 + Three.js + @react-three/fiber + Vite (lib mode → UMD + ESM)
- **Backend:** Express + Claude API + Supabase
- **Landing:** Vanilla HTML/CSS/JS on Vercel
- **Dashboard:** Next.js (stub — Phase 5)
- **Database:** Supabase Postgres + pgvector (project: `altxdxdmrcfgxqrpkzjw`)

## Commands
```bash
npm run dev:widget     # Widget dev server (Vite)
npm run dev:backend    # Backend dev server (tsx watch, port 3001)
npm run dev:landing    # Landing page (vercel dev)
npm run build          # Build all workspaces
```

## Key Files
| File | Purpose |
|------|---------|
| `packages/widget/src/components/Avatar2DWidget.tsx` | DOM scanner (42-75), movement logic (78-122), product click (205-231) |
| `packages/widget/src/components/AvatarWidget.tsx` | Main 3D widget wrapper with Canvas |
| `packages/widget/src/components/Avatar3D.tsx` | Procedural geometric avatar (Three.js) |
| `packages/widget/src/components/Avatar3DModel.tsx` | GLB model loader — has preload bug at line 149 |
| `packages/backend/src/index.ts` | POST /chat (Claude API), GET /health |
| `packages/landing/api/waitlist.js` | Vercel serverless → Supabase waitlist insert |

## Conventions
- Vanilla HTML/CSS/JS for landing (no framework)
- TypeScript for widget and backend
- CSS-in-JS (inline styles) in widget components
- Session-based chat history (sessionId)
- `[data-product-id]` DOM attributes for product detection

## Build Phases
- Phase 1: Landing page + waitlist ✅ COMPLETE
- Phase 2: Widget v2 — state machine, realistic 3D model, ChatBox, /chat API
- Phase 3: Voice layer — ElevenLabs TTS + Web Speech API STT
- Phase 4: Knowledge base — pgvector RAG
- Phase 5: Dashboard — Next.js onboarding
- Phase 6: Multi-tenancy + billing

## External Services
| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | DB, pgvector, auth | Active (altxdxdmrcfgxqrpkzjw) |
| Vercel | Hosting (landing, dashboard, API) | Active (landing deployed) |
| Claude API | Conversation engine | Integrated in backend |
| ElevenLabs | TTS voice output | Account created, API key pending |
| Ready Player Me | GLB avatar models | Not yet downloaded |
| Mixamo | Animation library | Not yet set up |

## Gotchas
- `Avatar3DModel.tsx:149` — `useGLTF.preload()` at module level will crash; must be inside component or effect
- Backend uses in-memory session storage (Map) — will be replaced with Supabase
- No auth or rate limiting on backend yet
- Claude model in backend is `claude-3-5-sonnet-20241022` — update to latest
