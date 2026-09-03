# NETRIQ — Frontend Project Brain

> **Single source of truth** for the NETRIQ React frontend application.  
> Generated: 2026-09-03 | React 18 + Vite 6 + Tailwind CSS + Axios

---

## 1. Project Purpose & Scope

The NETRIQ frontend is an operations-grade Security Operations Center (SOC) dashboard for the NETRIQ Autonomous Dual-Layer NIDS. It provides real-time traffic monitoring, ML-driven threat detection with explainability, role-gated administrative controls, and incident triage.

---

## 2. Technology Stack & Tooling

| Layer | Technology | Details |
|---|---|---|
| **Build Tool & Runtime** | Vite 6.4.3 | Fast HMR, Rollup production bundling |
| **UI Framework** | React 18.2 | Hooks, Context API, SVG data visualization |
| **Styling** | Tailwind CSS + Vanilla CSS tokens | Slate-900 dark theme, custom glow and border-beam effects |
| **Iconography** | Lucide React | Consistent cybersecurity / SOC visual language |
| **Routing** | React Router DOM v6 | Role-capability protected route hierarchy |
| **HTTP Client** | Axios 1.6+ | Custom single-flight refresh mutex interceptor |
| **WebSocket** | Native browser WebSocket API | Auth handshake frame, role channels, capped backoff |

---

## 3. Directory Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js                  # Proxy configuration (/api -> :8000, /ws -> ws://:8000)
├── tailwind.config.js
└── src/
    ├── main.jsx                    # Application entrypoint
    ├── App.jsx                     # Route definitions & AuthProvider wrapper
    ├── index.css                   # Global styles & Tailwind directives
    ├── context/
    │   └── AuthContext.jsx         # User session, role state, capability checks
    ├── hooks/
    │   └── useWebSocket.js         # Reactive WebSocket hook with capped exponential backoff
    ├── services/
    │   ├── api.js                  # Central Axios instance with single-flight refresh mutex
    │   ├── auth.js                 # Login, refresh, logout, getCurrentUser API calls
    │   ├── monitoring.js           # Packet sniffer start, stop, status endpoints
    │   └── predictions.js          # Prediction test triggers & explanation fetch
    ├── utils/
    │   └── featureLabels.js        # 71 CICIDS2017 feature mapping (humanized labels & units)
    ├── components/
    │   ├── Navbar.jsx              # Global header with live WS indicator, incident count, user pill
    │   ├── Sidebar.jsx             # Left navigation with active engine status
    │   ├── ProtectedRoute.jsx      # Role & capability gating wrapper
    │   ├── ExplanationPanel.jsx    # Dual-mode SHAP drawer (Smart Summary vs Raw Matrix)
    │   ├── SeverityBadge.jsx       # Color-coded severity badge (CRITICAL/HIGH/MED/LOW)
    │   ├── VerdictCard.jsx         # Flow verdict card with Case B Heuristic fallback badge
    │   ├── SnifferControlPanel.jsx # Engine start/stop controls, live uptime ticker, counters
    │   ├── OperationalMetrics.jsx  # Queue drop, non-IP, and malformed traffic stat cards
    │   ├── ConnectionTable.jsx     # Tabular flow feed (50-item buffer, SNI, severity filter)
    │   ├── FlowRateChart.jsx       # 60s sliding window throughput histogram (12 buckets)
    │   └── ui/                     # Primitives (card, button, badge, border-beam, etc.)
    └── pages/
        ├── Login.jsx               # Terminal-style login with demo account quick-fill
        ├── Dashboard.jsx           # Smart Summary & High-level SOC view
        ├── Monitoring.jsx          # Live Packet Stream & Real-Time Monitoring
        ├── Incidents.jsx           # [Phase 4] Threat incident management & quarantine
        ├── History.jsx             # [Phase 5] Historical threat traffic log
        ├── Analytics.jsx           # [Phase 5] Threat intelligence analytics & charts
        ├── Reports.jsx             # [Phase 5] PDF/Excel export surface
        ├── Users.jsx               # [Phase 6] User management (Admin only)
        └── Settings.jsx            # [Phase 6] System configuration & thresholds
```

---

## 4. Route Map & RBAC Capabilities

Routes are guarded by `<ProtectedRoute requiredCapability="..." />`. If a user session lacks the required capability, they are redirected to `/dashboard` with an unauthorized notice.

| Path | Component | Required Capability | Permitted Roles | Notes |
|---|---|---|---|---|
| `/login` | `Login.jsx` | *None (Public)* | All | Redirects to `/dashboard` if already authenticated |
| `/dashboard` | `Dashboard.jsx` | `VIEW_SMART_SUMMARY` | Admin, Analyst, Viewer | Default landing page; renders Smart Summary |
| `/monitoring` | `Monitoring.jsx` | `VIEW_SMART_SUMMARY` | Admin, Analyst, Viewer | Start/Stop controls additionally require `MANAGE_SETTINGS` (Admin) |
| `/incidents` | `Incidents.jsx` | `VIEW_SMART_SUMMARY` | Admin, Analyst, Viewer | Quarantine/Reverse actions require `QUARANTINE_HOST` / `MANAGE_SETTINGS` |
| `/history` | `History.jsx` | `VIEW_RAW_LOGS` | Admin, Analyst | Raw audit log; Viewer denied |
| `/analytics` | `Analytics.jsx` | `VIEW_SMART_SUMMARY` | Admin, Analyst, Viewer | Aggregated trend charts & model metrics |
| `/reports` | `Reports.jsx` | `EXPORT_REPORTS` | Admin, Analyst | Report download; Viewer denied |
| `/users` | `Users.jsx` | `MANAGE_USERS` | Admin | User creation, role changes, account locking |
| `/settings` | `Settings.jsx` | `MANAGE_SETTINGS` | Admin | Risk threshold & adapter configuration |

---

## 5. Authentication & Token Lifecycle

### Token Storage Strategy
- **Access Token**: Held **strictly in memory** via a closure variable inside `services/api.js`. Never written to `localStorage` or `sessionStorage` (mitigating XSS extraction).
- **Refresh Token**: Stored in `localStorage` (`netriq_refresh_token`).
  > [!NOTE]
  > **Security Posture Note**: The refresh token is returned in the JSON response body and stored in browser `localStorage`, **not** via an HTTP-only cookie. While in-memory access tokens protect the active session token from XSS, `localStorage` refresh tokens remain vulnerable to token theft if an XSS vulnerability exists. In a high-assurance deployment, migration to server-set `httpOnly; Secure; SameSite=Strict` cookies is recommended.

### Single-Flight Refresh Mutex
When an access token expires (15m lifetime), all concurrent API requests receiving `401 Unauthorized` are queued behind a single shared refresh call:

```
Request A (401) ---\
Request B (401) ----+--> Mutex Check: Refresh already in-flight?
Request C (401) ---/         |
                             +--> YES: Return existing refreshPromise
                             +--> NO:  Dispatch POST /auth/refresh
                                         |
                                         v
                         New Token Received -> Replay Requests A, B, C
```
*Guarantees zero duplicate `/auth/refresh` calls, preventing token replay detection false-alarms on the backend.*

---

## 6. WebSocket Telemetry Architecture (`/ws`)

### 1. Initial Handshake Sequence
FastAPI mandates an authenticated handshake within 5.0 seconds of socket connection:
1. Client connects to `ws://<host>/ws`.
2. Client sends first frame: `{"type": "auth", "token": "<access_token>"}`.
3. Backend validates token signature, registers connection with user ID and role in `ConnectionManager`.
4. Backend responds: `{"type": "auth_ok", "user_id": "...", "role": "..."}`.

### 2. Event Catalog
| Event Name | Target Role | Payload Contents | Purpose |
|---|---|---|---|
| `live_verdict` | All | `{ prediction_id, src_ip, dst_ip, protocol, risk_category, action, model_used }` | Real-time flow classification feed |
| `quarantine_action` | Admin, Analyst | `{ target_ip, action, device_id, timestamp }` | Layer 2 SDN enforcement notifications |
| `monitor_status` | All | `{ is_running, interface, uptime_seconds, operational_metrics }` | Sniffer engine health and packet counters |
| `new_incident` | Admin, Analyst | `{ incident_id, severity, title, timestamp }` | Incident generation alerts |

### 3. Capped Exponential Auto-Reconnect
If the backend restarts or network drops, `useWebSocket.js` reconnects automatically:
$$\text{delay} = \min(3000 \times 1.5^{\text{attempts}}, 30000) \text{ ms}$$
- **Attempt 1**: 3.0s
- **Attempt 2**: 4.5s
- **Attempt 3**: 6.75s
- **Ceiling**: 30.0s max delay
- Reset to 0 on successful handshake (`auth_ok`).

---

## 7. Explainability & RBAC Wire Isolation

### Dual-Mode Visualisation (`ExplanationPanel.jsx`)
- **Smart Summary Mode (All Roles)**: Renders feature impact bars and risk direction indicators (Increases Risk vs. Normalizing) using human-readable feature labels (`utils/featureLabels.js`).
- **Raw Log Mode (Admin / Analyst)**: Displays raw numeric measurements, z-scores, and raw dataset feature names.

### Server-Side Data Isolation
1. **Prediction Explanations (`GET /api/v1/prediction/{id}/explain`)**:
   - The backend zeros out raw measurements: `result.top_features[*].value = None` for Viewer.
   - `direction` (`increases_risk` / `decreases_risk`) and `contribution` survive intact so the frontend renders impact bars and risk indicators.
   - Sensitive internal network metrics never reach Viewer browser memory or DevTools network payloads.

2. **Incident Records & Threat Management (`GET /api/v1/incidents`)**:
   - For `Viewer`, technical internal fields (`affected_assets`, `response_action`, `response_success`, `notes`, `updated_at`) are set to `None` on the server.
   - Any raw target IP addresses appearing in `description` are dynamically redacted at read time to `"Protected Asset"` (e.g. `QUARANTINE executed against Protected Asset`), eliminating information leakage via free-text fields.
   - *Redaction Scope*: Supports explicit asset matching from `affected_assets`, backed by defense-in-depth regex for IPv4 and IPv6 patterns. Note: Fully qualified domain names (SNI / hostnames) must be present in `affected_assets` to trigger redaction if future description formats introduce them without bare IPs.

---

## 8. Client Performance Bounds & Invariants

To guarantee 60 FPS rendering under sustained traffic loads:
1. **Bounded State Queues**: Live feed arrays (`feed` and `connections`) are capped at **50 items maximum** via `slice(0, 50)`.
2. **Deterministic Chart Aggregation**: `FlowRateChart` evaluates a fixed 60-second window divided into 12 5-second buckets. Algorithmic complexity is strictly $O(50)$ on every incoming event.
3. **Stable JS Heap**: Verified in Chrome DevTools — JS heap remains under 35 MB after 60+ continuous burst events.
4. **Polymorphic Timestamp Parsing**: Timestamps tolerate unix seconds, milliseconds, and ISO date strings without throwing `Invalid Date`.

---

## 9. Completed Phases & Roadmap

- [x] **Phase 1 — Scaffold, Layout & Single-Flight Auth**
- [x] **Phase 2 — Smart Summary View & Explainability Wire Isolation**
- [x] **Phase 3 — Live Monitoring & Real-Time Telemetry Stream**
- [x] **Phase 4 — Incidents & Threat Management Surface** (`Incidents.jsx`, `IncidentDetailDrawer.jsx`, `ResponseActionDialog.jsx`)
- [x] **Phase 5 — Traffic History & Threat Intelligence Reports** (`History.jsx`, `Analytics.jsx`, `Reports.jsx`)
- [x] **Phase 6 — Administrative Controls & Settings** (`Users.jsx`, `Settings.jsx`)


