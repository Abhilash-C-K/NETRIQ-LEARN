# NETRIQ — Project Brain

> **Single source of truth** for the NETRIQ codebase.  
> Generated: 2026-09-02 | Python ≥3.10 | FastAPI + MongoDB + React

---

## 1. Project Purpose

**NETRIQ** (Network Intrusion & Threat Intelligence Quarterly) is a production-grade, AI-driven Network Intrusion Detection System (NIDS) with autonomous dual-layer response.

**What it does:**
- Captures live packets via Scapy, builds flows, and extracts 71 statistical features (CICIDS2017 schema)
- Runs an ensemble of supervised ML classifiers (Random Forest / XGBoost / LightGBM) in parallel with an unsupervised Isolation Forest anomaly detector
- Fuses both outputs into a single confidence score; detects zero-day attacks when supervised says BENIGN but unsupervised flags HIGH anomaly
- Classifies risk (LOW / MEDIUM / HIGH / CRITICAL) and dispatches enforcement:
  - **Layer 1** — RECOMMEND_BLOCK to an external firewall REST API (external threats)
  - **Layer 2** — QUARANTINE to an SDN controller (internal devices by MAC/VLAN)
- Exposes a REST + WebSocket API consumed by a React dashboard

**License:** MIT | **Package name:** `netriq-core` v1.0.0

---

## 2. High-Level Architecture

```
React Frontend (Vite/JSX)
        |  REST HTTPS        |  WebSocket /ws
        v                    v
+------------------------------------------+
|          FastAPI  (Uvicorn ASGI)         |
|  Middleware: RateLimit->Auth->Security   |
|             ->CORS->Logging             |
|                                         |
|  Routers: /api/v1/{auth, dashboard,     |
|   analytics, monitoring, prediction,    |
|   incidents, history, reports,          |
|   response, users, settings, health}    |
|   + /ws (WebSocket)                     |
|                                         |
|  Services  <->  AI Subsystem            |
|                  +- Predictor           |
|                  +- AnomalyDetector     |
|                  +- FusionEngine        |
|                  +- RiskEngine          |
|                  +- DecisionEngine      |
|                  +- ExplainabilityEng   |
|                                         |
|  Live Monitor (background asyncio task) |
|   PacketSniffer->FlowBuilder->Feature   |
|   Extractor->LivePredictor              |
|                                         |
|  Response Engine                        |
|   +- FirewallAdapter (Layer 1)          |
|   +- QuarantineService (Layer 2)        |
+--------------------+---------------------+
                     |
        MongoDB Atlas (Motor async)
        Collections: threats, predictions,
        incidents, responses, users,
        feedback, reports, settings
```

---

## 3. Folder Responsibilities

```
NTRIQ/
+- backend/
|  +- main.py              # FastAPI app factory, lifespan, middleware+router registration
|  +- engine.py            # NetriqEngine: high-level orchestrator (not used as server entry)
|  +- ai/                  # Pure ML inference; zero side-effects
|  |  +- contracts.py      # All Pydantic data contracts (PredictionResult, Decision, ...)
|  |  +- model_manager.py  # Thread-safe singleton; loads .joblib models + metadata.json
|  |  +- predictor.py      # Supervised inference; SHAP inline explainability (top-3)
|  |  +- anomaly_detector.py # IsolationForest inference; 0-100 normalized score
|  |  +- fusion_engine.py  # 4-case fusion logic (agreement/zero-day/supervised/benign)
|  |  +- risk_engine.py    # Confidence -> RiskCategory mapping (threshold-based)
|  |  +- decision_engine.py # RiskCategory + is_internal -> Action (NOTIFY/BLOCK/QUARANTINE)
|  |  +- explainability_engine.py # On-demand SHAP or deviation z-score explainability
|  |  +- feature_encoder.py # Categorical -> numeric encoding before scaling
|  |  +- exceptions.py     # ai/-specific exceptions
|  +- api/                 # FastAPI routers; thin controllers only - no business logic
|  |  +- auth.py           # /auth: login, refresh, logout, register
|  |  +- prediction.py     # /prediction/test, /prediction/{id}/explain
|  |  +- monitoring.py     # /monitoring: start, stop, status
|  |  +- incidents.py      # /incidents CRUD
|  |  +- dashboard.py      # /dashboard: summary stats
|  |  +- analytics.py      # /analytics: aggregated metrics
|  |  +- history.py        # /history: threat log
|  |  +- reports.py        # /reports: PDF/Excel download
|  |  +- response.py       # /response: manual block/quarantine/reverse
|  |  +- users.py          # /users: user CRUD (admin)
|  |  +- settings.py       # /settings: system settings
|  |  +- health.py         # /health: DB + service liveness
|  |  +- websocket.py      # /ws WebSocket endpoint
|  +- auth/
|  |  +- jwt_handler.py    # Token create/decode/verify (PyJWT, HS256)
|  |  +- auth_service.py   # login/logout/refresh/register business logic
|  |  +- password.py       # bcrypt hash/verify + policy validation
|  |  +- roles.py          # Role enum (admin/analyst/viewer) + PERMISSION_MATRIX
|  |  +- permissions.py    # FastAPI dependency: require_permission(Capabilities.X)
|  +- config/
|  |  +- config.py         # Risk thresholds, anomaly weights, heuristic params (env-driven)
|  +- database/
|  |  +- database.py       # DatabaseManager: async singleton, exponential-backoff connect
|  |  +- collections.py    # BaseRepository + ThreatRepository + PredictionsRepository
|  |  +- indexes.py        # TTL + compound + unique indexes (created at startup)
|  +- live_monitor/        # Packet capture pipeline (runs as background asyncio task)
|  |  +- packet_sniffer.py # Scapy sniff -> queue; Case A (non-IP) / Case B (malformed)
|  |  +- flow_builder.py   # Aggregates packets into bidirectional flows
|  |  +- feature_extractor.py # Flow -> 71-feature dict (CICIDS2017 schema)
|  |  +- live_predictor.py # Calls AI engine on completed flows
|  |  +- monitor_service.py # Orchestrates pipeline as asyncio background task
|  |  +- heuristic_fallback.py # 5-rule deterministic safety net when AI fails
|  |  +- response_engine.py # (likely duplicate of response/response_engine.py)
|  +- middleware/
|  |  +- rate_limit.py     # Fixed-window in-memory limiter
|  |  +- auth.py           # JWT Bearer extraction -> request.state.user
|  |  +- security.py       # Security HTTP headers
|  |  +- cors.py           # CORS from ALLOWED_ORIGINS env
|  |  +- logging.py        # Structured request/response logging
|  +- response/
|  |  +- response_engine.py # Canonical dispatch: whitelist check -> action -> audit log
|  |  +- firewall.py       # FirewallAdapter ABC + GenericRESTFirewallAdapter + NoOpAdapter
|  |  +- quarantine.py     # QuarantineService -> SDN controller REST API (VLAN isolation)
|  |  +- whitelist.py      # WhitelistManager: skip enforcement for known-safe IPs/MACs
|  |  +- response_logger.py # Audit trail for all enforcement actions
|  |  +- sandbox.py        # Sandbox integration (mode=noop by default)
|  +- schemas/             # Pydantic request/response models for API layer
|  +- services/            # Business logic between API and data/AI layers
|  |  +- predict_service.py # Full pipeline: inference + fusion + decision + persist
|  |  +- incident_service.py # Incident CRUD + create_from_response_action
|  |  +- monitoring_service.py # Wraps MonitorService start/stop for API
|  |  +- notification_service.py # WS broadcast + email/SMS stubs
|  +- utils/
|  |  +- exceptions.py     # Full exception hierarchy rooted at NetriqException
|  |  +- logger.py         # get_logger() factory
|  |  +- validators.py     # IP, MAC, email, password, is_internal_ip
|  +- websocket/
|  |  +- manager.py        # ConnectionManager: user_id->Set[WebSocket] + role->user mapping
|  |  +- broadcaster.py    # broadcaster.publish(event): fan-out to target_audience roles
|  |  +- events.py         # Event types: LiveVerdict, QuarantineAction, MonitorStatus, NewIncident
|  +- reports/
|     +- pdf_report.py     # ReportLab PDF generation
|     +- excel_report.py   # OpenPyXL Excel generation
|     +- csv_report.py     # CSV export
|     +- charts.py         # Matplotlib chart generation
|     +- templates.py      # Role-aware report templates
+- frontend/src/
|  +- App.jsx              # React Router root (EMPTY FILE)
|  +- pages/               # Dashboard, Login, Analytics, Incidents, Monitoring,
|  |                         History, Reports, Settings, Users, AIPerformance, NotFound
|  +- components/          # Charts, ConnectionTable, DashboardCards, IncidentCard,
|  |                         LoadingSpinner, Navbar, NotificationToast, PacketStream,
|  |                         ProtectedRoute, ProtocolChart, ReportViewer, Sidebar, ThreatTable
|  +- services/            # api.js (axios base), auth.js, dashboard.js, monitoring.js,
|                            analytics.js, reports.js, settings.js, users.js, websocket.js
+- preprocessing/          # One-off data cleaning scripts (not imported by server)
+- training/               # One-off model training scripts
+- scripts/
|  +- train_anomaly_detector.py # Isolation Forest -> models/
+- tests/
|  +- unit/               # test_ai, test_auth_module, test_database, test_reports,
|  |                         test_response, test_utils, test_websocket,
|  |                         test_packet_sniffer_visibility
|  +- integration/        # test_api, test_auth, test_dashboard, test_monitoring
+- models/                # .joblib artifacts (gitignored; generated by training scripts)
+- requirements.txt
+- pyproject.toml         # Package: netriq-core, Python >=3.10
+- .gitignore             # Excludes: datasets/, models/, .env, __pycache__, venv
```

---

## 4. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | FastAPI + Uvicorn | >=0.100 / >=0.23 |
| Data validation | Pydantic v2 | >=2.0 |
| Database driver | Motor (async MongoDB) | >=3.2 |
| Database | MongoDB Atlas | cluster0 / `netriq_db` |
| Auth | PyJWT + passlib[bcrypt] | >=2.8 / >=1.7 |
| Supervised ML | scikit-learn, XGBoost, LightGBM | >=1.3 / >=1.7 / >=4.0 |
| Unsupervised ML | scikit-learn IsolationForest | — |
| Explainability | SHAP (TreeExplainer) | >=0.42 |
| Feature arrays | NumPy + Pandas | >=1.24 / >=2.0 |
| Model serialization | joblib | >=1.3 |
| Packet capture | Scapy | >=2.5 |
| HTTP client | httpx | >=0.24 |
| Report generation | ReportLab + OpenPyXL | >=4.0 / >=3.1 |
| Charting | Matplotlib | >=3.7 |
| Config | python-dotenv | >=1.0 |
| Frontend | React (JSX) via Vite | UNKNOWN (files empty) |
| Python | >=3.10 | — |

---

## 5. Dependency Graph (Key Module Relationships)

```
main.py
  +-> DatabaseManager.connect_db()        [database/database.py]
  +-> ResponseEngine()                    [response/response_engine.py]
  +-> Middlewares (see §6 for order)
  +-> Routers -> api/*.py
        +-> services/*.py
              +-> ai/*.py                 [pure inference, no DB]
              |     +- ModelManager       [singleton, thread-lock]
              |     +- Predictor          [uses ModelManager + FeatureEncoder]
              |     +- AnomalyDetector    [singleton, thread-lock]
              |     +- fuse()             [fusion_engine.py]
              |     +- classify_risk()    [risk_engine.py]
              |     +- decide()           [decision_engine.py]
              +-> database/collections.py [BaseRepository instances]
              +-> response/response_engine.py
                    +-> FirewallAdapter   [Layer 1]
                    +-> QuarantineService [Layer 2]
                    +-> WhitelistManager
                    +-> ResponseLogger
                    +-> incident_service.create_from_response_action()
                          +-> notification_service.notify_*()
                                +-> broadcaster.publish()
                                      +-> ConnectionManager.broadcast_to_role()

live_monitor/monitor_service.py (background asyncio task)
  +-> PacketSniffer         [Scapy thread]
  +-> FlowBuilder
  +-> FeatureExtractor
  +-> LivePredictor         [calls AI engine]
  +-> HeuristicFallback     [malformed packet callback]
  +-> ResponseEngine        [dispatches enforcement]
```

---

## 6. Execution Flow (Server Startup)

1. `uvicorn backend.main:app` (or `python backend/main.py`)
2. `load_dotenv()` loads `backend/.env` before any `os.getenv()` calls
3. `lifespan()` context manager fires:
   - `DatabaseManager.connect_db()` with exponential-backoff retry (5 attempts, factor 1.5)
   - `ensure_indexes()` creates TTL, compound, and unique indexes
   - `ResponseEngine()` instantiated on `app.state`
4. Middlewares registered in **reverse** (Starlette adds outermost last):
   - Execution order: **RateLimitMiddleware -> AuthMiddleware -> SecurityHeadersMiddleware -> CORS -> LoggingMiddleware**
5. Routers mounted at `/api/v1` prefix; WebSocket router at root
6. FastAPI ready; Uvicorn serves on `0.0.0.0:8000`

On shutdown: `DatabaseManager.close_db()` + `app.state.response_engine.close()`

---

## 7. Request Lifecycle (REST)

```
Client HTTP Request
  -> RateLimitMiddleware   (100 req/60s global; 5 req/60s /api/v1/auth/*)
  -> AuthMiddleware        (Bearer JWT -> request.state.user; 401 on bad token)
  -> SecurityHeadersMiddleware (HSTS, X-Frame-Options, etc.)
  -> CORSMiddleware
  -> LoggingMiddleware
  -> Router (api/*.py)
      -> require_permission(Capabilities.X) dependency
          -> checks PERMISSION_MATRIX[role]
      -> service function call
          -> AI inference / DB query / enforcement
      -> JSON response
  <- Exception handlers (NetriqException -> 4xx, Exception -> 500)
```

**Public paths** (bypass auth check): `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/docs`, `/openapi`, `/redoc`

**Error envelope:**
```json
{"error": "ExceptionClassName", "message": "human message", "detail": {}}
```

---

## 8. WebSocket Lifecycle (`/ws`)

1. Client connects to `ws://host/ws`
2. Server awaits max **5 seconds** for JSON `{"type": "auth", "token": "<access_token>"}`
3. Token verified via `verify_token(token, expected_type="access")`
4. On success: `manager.connect(user_id, role, websocket)` registered in `ConnectionManager`
5. Server sends `{"type": "auth_ok", "user_id": ..., "role": ...}`
6. Keep-alive: client sends `{"type": "ping"}` -> server replies `{"type": "pong"}`
7. Events pushed by `broadcaster.publish(Event)` -> `ConnectionManager.broadcast_to_role()`

**Event types & audiences:**

| Event | Audience |
|---|---|
| `live_verdict` | analyst, admin |
| `quarantine_action` | viewer, analyst, admin |
| `monitor_status` | viewer, analyst, admin |
| `new_incident` | viewer, analyst, admin |

---

## 9. Live Monitoring Pipeline

**Entry:** `POST /api/v1/monitoring/start` -> `monitoring_service.start()` -> `MonitorService.start()`

```
PacketSniffer (Scapy thread, daemon; queue maxsize=10000)
  +- Case A: Non-IP (ARP/LLDP) -> silent counter, skip
  +- Case B: Malformed IP -> heuristic_callback(partial_pkt)
  |            -> HeuristicFallback.evaluate() -> if escalate:
  |                classify_risk() -> decide() -> ResponseEngine.handle_verdict()
  +- Normal: enqueue pkt_dict

asyncio loop (run_in_executor for non-blocking queue dequeue)
  dequeue pkt_dict
  FlowBuilder.process_packet() -> completed_flows
  for flow:
    FeatureExtractor.extract_features(flow) -> 71-feature dict
    LivePredictor.predict(features)
    [TODO: route to ResponseEngine + DB -- not yet implemented]
```

**NOTE:** The live pipeline currently logs predictions but does NOT persist to DB or call `ResponseEngine` for normal completed flows (marked `# TODO` in `monitor_service.py:155`).

---

## 10. AI Inference Pipeline (Per Prediction)

```
raw_features: Dict[str, Any]  (71 CICIDS2017 keys)
      |
      v
Predictor.predict()
  1. FeatureEncoder.encode()        -> encoded_dict (categoricals -> numeric)
  2. scaler.transform(feature_vector) -> scaled_vector
  3. model.predict_proba()          -> anomaly_prob (class index 1)
  4. confidence = anomaly_prob * 100.0
  5. verdict = (confidence >= 50.0)
  6. RiskEngine.calculate_risk()    -> RiskCategory
  7. SHAP TreeExplainer (cached)    -> top-3 feature contributions
  -> PredictionResult

AnomalyDetector.predict()  [run in asyncio.to_thread, parallel]
  1. Extract 71 values in EXPECTED_FEATURE_NAMES order (missing keys -> 0.0)
  2. raw_score = -model.decision_function(X)[0]  (higher = more anomalous)
  3. Min-max normalize to [0, 100]  -> anomaly_score
  Fail-safe: returns 0.0 on any exception

fuse(supervised_result, anomaly_score)
  Case A (Agreement):  supervised=ANOMALY AND anomaly >= 70  -> fusion_source="agreement"
  Case B (Zero-Day):   supervised=BENIGN  AND anomaly >= 70  -> fusion_source="unsupervised"
                        effective_conf = max(sup_conf, anomaly * 0.8)
  Case C (Supervised): supervised=ANOMALY AND anomaly < 70   -> fusion_source="supervised"
  Default (Benign):    supervised=BENIGN  AND anomaly < 70   -> fusion_source="supervised"

classify_risk(effective_confidence)
  <= 40.0  -> LOW
  <= 70.0  -> MEDIUM
  <= 90.0  -> HIGH
   > 90.0  -> CRITICAL

decide(risk, confidence, is_internal)
  is_internal + HIGH/CRITICAL -> QUARANTINE   (Layer 2)
  external   + HIGH/CRITICAL  -> RECOMMEND_BLOCK (Layer 1)
  LOW/MEDIUM                  -> NOTIFY
```

---

## 11. Heuristic Fallback Tier

Activated when `FeatureExtractor` or AI model raises an exception. Operates on raw packet metadata. **Never raises exceptions** (returns safe `HeuristicVerdict` on any input).

| Rule | Trigger |
|---|---|
| Rule1_SensitivePortMalformedPayload | dst_port in {22,88,3389,3306,5432,5985} + malformed flag or negative payload |
| Rule2_PacketLengthHeaderMismatch | IP header < 20 bytes OR raw_len > cap_len + 14 |
| Rule3_InvalidTCPFlagCombinations | NULL scan (flags=0), Xmas (FIN+PSH+URG), SYN+FIN, SYN+RST |
| Rule4_RawPacketRateSpike | pkt_rate >= 1000 pps (suppressed for large-packet bursts < 2s) |
| Rule5_SuspiciousSmallPacketBurst | pkt_len < 64 AND rate >= 100 pps AND control flags present |

**Escalation ceiling:** Heuristic-only matches cap at `RECOMMEND_BLOCK` unless `is_internal=True` AND >= 2 rules matched (`HEURISTIC_MIN_RULES_FOR_QUARANTINE`).

Confidence floor when escalated: **75.0%** (`HEURISTIC_CONFIDENCE_FLOOR`).

---

## 12. Explainability Engine

On-demand (NOT on the prediction hot path). Triggered by `GET /api/v1/prediction/{id}/explain`.

| `fusion_source` | Method | Output |
|---|---|---|
| `"supervised"` or `"agreement"` | SHAP TreeExplainer (cached per model id) | `explanation_source="shap"` |
| `"unsupervised"` | z-score deviation vs benign training mean/std from metadata.json | `explanation_source="deviation"` |

Both paths return identical `ExplanationResult` shape: `prediction_id`, `top_features` (list of `FeatureContribution` with name, value, contribution, direction), `base_value`, `generated_at`.

SHAP explainers are **lazy-loaded and cached** in a module-level dict keyed by `id(model)` — created once, reused for all subsequent calls. Protected by `threading.Lock`.

---

## 13. Database Design

**Database:** `netriq_db` on MongoDB Atlas

| Collection | Use | Key Fields | Indexes |
|---|---|---|---|
| `threats` | High-volume flow/threat records | `timestamp`, `severity`, `src_ip` | Compound `(timestamp DESC, severity, src_ip)` + TTL on `timestamp` (default 7 days) |
| `predictions` | Per-inference record for lazy explain | `raw_features`, `fusion_source`, `model_used`, `created_at` | TTL on `created_at` (default 30 days) |
| `incidents` | Security incident tickets | `status`, `severity`, `created_at` | Compound `(status ASC, created_at DESC)` |
| `users` | User accounts + auth state | `email`, `hashed_password`, `role`, `active_refresh_token_hash`, `locked_until` | Unique on `email` |
| `responses` | Enforcement action audit log | — | None defined |
| `feedback` | Analyst prediction feedback | — | None defined |
| `reports` | Report metadata | — | None defined |
| `settings` | System settings | — | None defined |

**Repository pattern:** All collections accessed via `BaseRepository(collection_name)`. `_format_out()` converts `_id` -> `id` (str) for Pydantic compatibility. `_prepare_doc()` strips None values before insert/update.

**Exported singleton instances** (from `collections.py`):
`threats_repo`, `incidents_repo`, `responses_repo`, `users_repo`, `feedback_repo`, `reports_repo`, `settings_repo`, `predictions_repo`

---

## 14. API Contracts

All routes under `/api/v1` prefix.

### Auth (public endpoints)
| Method | Path | Capability | Returns |
|---|---|---|---|
| POST | `/auth/login` | public | `{access_token, refresh_token, token_type, role}` |
| POST | `/auth/refresh` | public | New token pair (rotation) |
| POST | `/auth/logout` | authenticated | `{message, success}` |
| POST | `/auth/register` | MANAGE_USERS | `{message, success}` |

### Prediction
| Method | Path | Capability | Returns |
|---|---|---|---|
| POST | `/prediction/test` | MANAGE_SETTINGS | `PredictionResult` + `X-Prediction-Id` header |
| GET | `/prediction/{id}/explain` | MANAGE_SETTINGS | `ExplanationResult` |

### Monitoring
| Method | Path | Capability | Returns |
|---|---|---|---|
| POST | `/monitoring/start` | MANAGE_SETTINGS | `MonitorStatus` |
| POST | `/monitoring/stop` | MANAGE_SETTINGS | `MonitorStatus` |
| GET | `/monitoring/status` | VIEW_SMART_SUMMARY | `MonitorStatus` |

### Other endpoints
- `GET /health` — public liveness + DB ping
- `GET /dashboard/*` — VIEW_SMART_SUMMARY
- `GET /analytics/*` — VIEW_SMART_SUMMARY
- `GET/PATCH /incidents/*` — VIEW_SMART_SUMMARY / VIEW_RAW_LOGS (viewers get stripped fields)
- `GET /history/*` — VIEW_RAW_LOGS
- `GET /reports/*` — VIEW_RAW_LOGS (PDF/Excel download)
- `POST /response/*` — REVERSE_RESPONSE_ACTION / TRIGGER_QUARANTINE
- `GET/POST/DELETE /users/*` — MANAGE_USERS
- `GET/PATCH /settings/*` — MANAGE_SETTINGS
- `WS /ws` — first-message JWT auth handshake

---

## 15. RBAC (Role-Based Access Control)

| Capability | admin | analyst | viewer |
|---|---|---|---|
| VIEW_SMART_SUMMARY | Y | Y | Y |
| VIEW_RAW_LOGS | Y | Y | N |
| REVERSE_RESPONSE_ACTION | Y | Y | N |
| TRIGGER_QUARANTINE | Y | Y | N |
| MANAGE_USERS | Y | N | N |
| MANAGE_SETTINGS | Y | N | N |

**Enforcement:** `require_permission(Capabilities.X)` FastAPI dependency reads `request.state.user.role` (injected by `AuthMiddleware`). Missing/invalid role -> 401/403.

---

## 16. Environment Variables

All loaded from `backend/.env` via `python-dotenv` before any module-level `os.getenv()` calls.

| Variable | Default | Notes |
|---|---|---|
| `MONGO_URI` / `MONGODB_URL` | `mongodb://localhost:27017` | Atlas URI in .env |
| `MONGO_DB` | `netriq_db` | Database name |
| `MONGO_MIN_POOL_SIZE` | `10` | Motor pool |
| `MONGO_MAX_POOL_SIZE` | `100` | Motor pool |
| `THREAT_RETENTION_DAYS` | `7` | TTL days for threats collection |
| `PREDICTION_RETENTION_DAYS` | `30` | TTL days for predictions collection |
| `JWT_SECRET_KEY` | hardcoded fallback | MUST set in production |
| `JWT_ALGORITHM` | `HS256` | — |
| `JWT_ACCESS_EXPIRY_MINUTES` | `5` (.env) / `15` (code default) | Short-lived access token |
| `JWT_REFRESH_EXPIRY_DAYS` | `7` | — |
| `JWT_ISSUER` | `netriq-api` | RFC 7519 iss claim |
| `JWT_AUDIENCE` | `netriq-client` | RFC 7519 aud claim |
| `PASSWORD_HASH_ROUNDS` | `12` | bcrypt cost factor |
| `LOGIN_MAX_ATTEMPTS` | `5` | Lockout trigger |
| `LOGIN_LOCKOUT_MINUTES` | `15` | Lockout duration |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | CORS |
| `FIREWALL_ADAPTER_TYPE` | `noop` | Options: `generic_rest`, `noop` |
| `FIREWALL_API_URL` | `https://firewall.local/api/v1` | Layer 1 |
| `FIREWALL_API_KEY` | `secret_key` | Layer 1 |
| `QUARANTINE_MODE` | `noop` | Options: `active`, `noop` |
| `QUARANTINE_API_URL` | `https://sdn-controller.local/api/isolate` | Layer 2 |
| `QUARANTINE_API_KEY` | `secret_key` | Layer 2 |
| `SANDBOX_MODE` | `noop` | Not implemented |
| `ENVIRONMENT` / `ENV` | `development` | `production` enables strict guards |
| `ANOMALY_DETECTOR_ENABLED` | `True` | Toggle unsupervised fusion |
| `ZERO_DAY_WEIGHT` | `0.8` | Zero-day escalation weight (must be 0.0-1.0) |
| `HIGH_ANOMALY_THRESHOLD` | `70.0` | Isolation Forest threshold for fusion Case B |
| `RISK_LOW_MAX` | `40.0` | Risk boundary |
| `RISK_MEDIUM_MAX` | `70.0` | Risk boundary + actionable threshold |
| `RISK_HIGH_MAX` | `90.0` | Risk boundary |
| `HEURISTIC_CONFIDENCE_FLOOR` | `75.0` | Fallback confidence when rules fire |
| `HEURISTIC_PACKET_RATE_THRESHOLD` | `1000.0` | Rule 4 pps trigger |
| `HEURISTIC_SUSTAINED_DURATION_SEC` | `2.0` | Bulk transfer guard for Rule 4 |
| `HEURISTIC_MICRO_PACKET_RATE_THRESHOLD` | `100.0` | Rule 5 pps trigger |
| `HEURISTIC_SENSITIVE_PORTS` | `22,88,3389,3306,5432,5985` | Rule 1 ports |
| `HEURISTIC_MIN_RULES_FOR_QUARANTINE` | `2` | Min rules for internal QUARANTINE |

**Production startup guards:**
- `JWT_SECRET_KEY` == default + `ENVIRONMENT=production` -> `RuntimeError` (startup fails)
- Model artifacts absent + `ENVIRONMENT=production` -> `ModelLoadError` (startup fails)

---

## 17. Model Artifacts

Located at `models/` (gitignored). Expected structure by `ModelManager`:

```
models/
+- metadata.json                         # versions + calibration + feature_stats
+- scaler.joblib                         # StandardScaler fitted on training data
+- encoders.joblib                       # Label encoders for categorical features
+- network_traffic_RandomForest.joblib   # TrafficType.NETWORK
+- firewall_XGBoost.joblib              # TrafficType.FIREWALL
+- system_logs_LightGBM.joblib          # TrafficType.SYSTEM
+- network_traffic_IsolationForest.joblib # Unsupervised anomaly detector (71 features)
```

**Dev fallback:** If `metadata.json` absent, `_init_fallback_models()` loads a `MockClassifier` always returning 90% anomaly probability. Full pipeline still executes.

**metadata.json schema:**
```json
{
  "models": {"network_traffic_RandomForest": "1.0", "firewall_XGBoost": "1.0", "system_logs_LightGBM": "1.0"},
  "calibration": {
    "isolation_forest": {
      "min_score": -0.45,
      "max_score": 0.48,
      "sample_count": 2000,
      "feature_count": 71,
      "feature_stats": {"Flow Duration": {"mean": 123.4, "std": 12.1}, ...}
    }
  }
}
```
`feature_stats` is required for deviation-based explainability (unsupervised path). Generated by `scripts/train_anomaly_detector.py`.

---

## 18. Authentication Flow

```
POST /auth/login {email, password}
  -> AuthService.login()
    -> users_repo.list({"email": email})
    -> check locked_until > now  -> AccountLockedError (time remaining shown)
    -> verify_password(bcrypt)   -> InvalidCredentialsError + increment failed_attempts
    -> on 5th failure: set locked_until = now + 15min
    -> on success: reset failed_attempts + locked_until
    -> create_access_token(user_id, role)   [exp: 5 min]
    -> create_refresh_token(user_id)        [exp: 7 days]
    -> store SHA-256(refresh_token) in users.active_refresh_token_hash
    <- {access_token, refresh_token, token_type, role}

POST /auth/refresh {refresh_token}
  -> verify_token(refresh_token, expected_type="refresh")
  -> fetch user; verify stored_hash == SHA-256(old_refresh_token)
  -> if mismatch: REVOKE ALL (critical security alert) + InvalidTokenError
  -> issue new access + refresh tokens; update stored hash (rotation)

POST /auth/logout
  -> users_repo.update(user_id, {active_refresh_token_hash: None})
```

JWT claims: `sub` (user_id), `role`, `iat`, `nbf`, `exp`, `jti` (random hex 16), `iss`, `aud`, `type`.
Verification enforces: signature + expiry + nbf + iss + aud + type + required claims set.

---

## 19. Response Engine Flow

```
ResponseEngine.handle_verdict(prediction, action, context)
  1. Validate target_ip (reject invalid IPs before enforcement)
  2. WhitelistManager.is_whitelisted(ip, mac) -> if True: log + return True (bypass)
  3. Dispatch by action:
     NOTIFY          -> log only, no network call
     RECOMMEND_BLOCK -> FirewallAdapter.block_ip(ip, reason)   [Layer 1; 2s timeout]
     QUARANTINE      -> QuarantineService.quarantine_device(ip, mac, reason) [Layer 2; 3s timeout]
  4. ResponseLogger.log_action(action, ip, outcome, success, context)
  5. asyncio.create_task -> IncidentService.create_from_response_action()
                            -> NotificationService.notify_new_incident()
                            -> broadcaster.publish(NewIncidentEvent)
                               -> ConnectionManager.broadcast_to_role()
```

Both firewall and quarantine have noop adapters active by default (no real network calls in dev).

---

## 20. Error Handling

**Exception hierarchy** (all inherit `NetriqException`):

```
NetriqException
  +- Auth: InvalidCredentialsError, AccountLockedError, TokenExpiredError,
  |         InvalidTokenError, WeakPasswordError, InsufficientPermissionError
  +- Database: DatabaseConnectionError, DocumentNotFoundError, DuplicateKeyError
  +- AI/ML: PredictionError, ModelLoadError, FeatureEncodingError
  +- Response: FirewallUnreachableError, QuarantineFailedError, FirewallApiError,
  |             SandboxRoutingError
  +- API: ValidationError, RateLimitExceededError
  +- DB Ops: FatalRestoreError
```

**Fail-safe behaviors:**
- `AnomalyDetector`: returns 0.0 on absence (`[ABSENT]`) or inference failure (`[EXCEPTION]`)
- `HeuristicFallback`: never raises; returns non-escalating verdict on bad input
- `RateLimitMiddleware`: fails OPEN on internal errors (logs, allows request through)
- `FirewallAdapter`: 2s HTTP timeout; raises typed exceptions caught by ResponseEngine
- `QuarantineService`: 3s HTTP timeout; raises `QuarantineFailedError`

---

## 21. Security Practices

- **JWT:** HS256, 32-byte+ key, `jti` per token, `iss`/`aud` scope validation, `nbf` prevents early use
- **Token rotation theft detection:** Replayed old refresh token -> revoke all sessions
- **Refresh token storage:** SHA-256 hash only; plaintext never persisted
- **Password:** bcrypt (cost=12); policy: 8+ chars, 1 upper, 1 lower, 1 digit
- **Account lockout:** 5 attempts -> 15-min lockout
- **Rate limiting:** 100 req/60s global, 5 req/60s per IP per `/auth/*` path
- **User enumeration prevention:** "user not found" and "wrong password" return identical error
- **WebSocket auth:** First-message handshake; no token in URL; 5s timeout; WS_1008 close on failure
- **Security headers:** Via `SecurityHeadersMiddleware`
- **CORS:** Configurable origins; not `*` in production
- **Production startup guards:** Default JWT key or missing models abort startup

---

## 22. Performance Considerations

- **Prediction hot path:** Target <=15ms (documented in code comments)
- **SHAP explainability:** Off hot path; on-demand only; 50-200ms acceptable
- **TreeExplainer cache:** Module-level dict by `id(model)`; created once, reused forever; thread-safe lock
- **Model singleton:** Thread-safe `threading.Lock`; loaded once at startup
- **Async inference:** `predict_async()` uses `asyncio.to_thread()` to avoid blocking event loop
- **MongoDB:** Motor async; pool 10-100 connections; compound index optimizes dashboard queries
- **Packet sniffer:** Bounded queue (10,000 packets); drops logged in batches every 5s
- **WebSocket broadcast:** `asyncio.gather(*tasks, return_exceptions=True)` for concurrent fan-out
- **Rate limiter:** In-memory (not suitable for multi-instance; needs Redis for production scale)
- **httpx clients:** Persistent `AsyncClient` instances (connection pooling) in firewall/quarantine adapters

---

## 23. Feature Schema (71 CICIDS2017 Features)

Canonical list in `anomaly_detector.py:EXPECTED_FEATURE_NAMES`. Must exactly match `FeatureExtractor.extract_features()` output in both keys and order.

Feature groups:
- **Flow duration:** `Flow Duration`
- **Packet counts:** `Total Fwd Packets`, `Total Backward Packets`
- **Byte totals:** `Total Length of Fwd Packets`, `Total Length of Bwd Packets`
- **Packet length stats (fwd/bwd/all):** Max, Min, Mean, Std, Variance
- **Flow rates:** `Flow Bytes/s`, `Flow Packets/s`, `Fwd Packets/s`, `Bwd Packets/s`
- **Inter-arrival times (flow/fwd/bwd):** Total, Mean, Std, Max, Min
- **TCP flags:** FIN, SYN, RST, PSH, ACK, URG, CWR, ECE counts; Fwd/Bwd PSH/URG flags
- **Header lengths:** Fwd Header Length, Bwd Header Length, Fwd Header Length.1 (duplicate)
- **Subflow stats:** Subflow Fwd/Bwd Packets, Subflow Fwd/Bwd Bytes
- **TCP window:** Init_Win_bytes_forward, Init_Win_bytes_backward
- **Other:** Down/Up Ratio, Average Packet Size, Avg Fwd/Bwd Segment Size, act_data_pkt_fwd, min_seg_size_forward
- **Active/Idle periods:** Mean, Std, Max, Min for Active and Idle

**Schema mismatch handling:** `Predictor` raises `PredictionError([SCHEMA_MISMATCH])`; `AnomalyDetector` defaults missing to 0.0 (DEBUG log).

---

## 24. Coding Standards & Conventions

- **Async:** All DB and network I/O is `async`; blocking CPU work offloaded to `asyncio.to_thread()`
- **Singletons:** `ModelManager` and `AnomalyDetector` use `__new__` + `threading.Lock`
- **Layering:** `api/` -> `services/` -> (`ai/` | `database/`); `ai/` never imports `database/` or `services/`
- **Contracts first:** Inter-module data exchanged via `ai/contracts.py` Pydantic models
- **Enums over strings:** `TrafficType`, `RiskCategory`, `Action`, `Role`, `Capabilities`, `EventType`
- **Logger:** `get_logger(__name__)` from `utils/logger.py`; tags use `[MODULE][TAG]` pattern
- **Tagged logs:** `[ABSENT]`, `[EXCEPTION]`, `[SCHEMA_MISMATCH]`, `[CASE_B_MALFORMED]`, `[QUEUE_DROP_SUMMARY]`
- **Error handling:** Domain exceptions from `utils/exceptions.py`; never bare `Exception`
- **Repository instances:** Exported as module-level singletons from `collections.py`

---

## 25. Reusable Patterns

| Pattern | Location | Notes |
|---|---|---|
| Thread-safe singleton | `ModelManager`, `AnomalyDetector` | `__new__` + `threading.Lock` |
| Generic repository | `BaseRepository` | CRUD over any collection |
| Factory | `get_firewall_adapter()` | Env-driven adapter selection |
| FastAPI dependency | `require_permission(Capabilities.X)` | Declarative route authorization |
| Async CPU wrapper | `predict_async()` | `asyncio.to_thread()` pattern |
| Role-aware event fan-out | `broadcaster.publish(Event)` | WebSocket broadcast by role |
| Lazy init with cache | `_get_or_create_explainer()` | Per-model SHAP TreeExplainer cache |
| Fail-safe default | `AnomalyDetector.predict()` | Returns 0.0 on any failure |
| Escalation ceiling guard | `predict_service.py:167` | Heuristic caps at RECOMMEND_BLOCK |

---

## 26. External Integrations

| Integration | Default Mode | Config Vars | Notes |
|---|---|---|---|
| MongoDB Atlas | Required | `MONGO_URI`, `MONGO_DB` | Motor async, connection pool |
| Firewall REST API | noop | `FIREWALL_API_URL`, `FIREWALL_API_KEY`, `FIREWALL_ADAPTER_TYPE` | Layer 1; set to `generic_rest` to enable |
| SDN Controller (Quarantine) | noop | `QUARANTINE_API_URL`, `QUARANTINE_API_KEY`, `QUARANTINE_MODE` | Layer 2; VLAN isolation |
| Sandbox | noop | `SANDBOX_MODE` | Not implemented beyond mode check |
| Email (SMTP) | stub | — | TODO in `NotificationService` |
| SMS (Twilio) | stub | — | TODO in `NotificationService` |

---

## 27. Testing Strategy

```
tests/unit/
  test_ai.py                     # Predictor, AnomalyDetector, FusionEngine unit tests
  test_auth_module.py            # JWT handler, AuthService
  test_database.py               # Repository CRUD
  test_response.py               # ResponseEngine dispatch
  test_utils.py                  # Validators, exceptions
  test_reports.py                # PDF/Excel generation
  test_websocket.py              # ConnectionManager
  test_packet_sniffer_visibility.py # PacketSniffer edge cases

tests/integration/
  test_api.py                    # End-to-end REST endpoint tests
  test_auth.py                   # Full auth flow (login/refresh/logout)
  test_dashboard.py              # Dashboard aggregation
  test_monitoring.py             # Pipeline start/stop

tests/ (root)
  test_explainability.py         # Full ExplainabilityEngine (SHAP + deviation paths)
  test_heuristic_fallback.py     # All 5 heuristic rules + edge cases
  test_security_subsystem.py     # Firewall/quarantine adapter tests
  test_zero_day_fusion.py        # FusionEngine zero-day Case B
```

**Runner:** pytest (no `[tool.pytest]` section in pyproject.toml; default config).

**No CI/CD configuration found** in the repository.

---

## 28. Common Commands

```bash
# --- Setup ---
python -m venv .venv
.venv\Scripts\activate             # Windows
pip install -r requirements.txt

# --- Run server ---
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# --- Tests ---
pytest tests/                      # All tests
pytest tests/unit/                 # Unit only
pytest tests/integration/          # Integration only
pytest tests/test_explainability.py -v

# --- Model training (offline, one-time) ---
python preprocessing/preprocess_cicids2017.py
python preprocessing/preprocess_nsl_kdd.py
python preprocessing/preprocess_unsw.py

python training/train_random_forest.py
python training/train_nsl_kdd.py
python training/train_unsw.py
python scripts/train_anomaly_detector.py  # -> models/network_traffic_IsolationForest.joblib

# --- API docs ---
# Swagger UI: http://localhost:8000/docs
# ReDoc:      http://localhost:8000/redoc
# Health:     http://localhost:8000/api/v1/health
```

---

## 29. Important Files Quick Reference

| File | Purpose |
|---|---|
| `backend/main.py` | App factory, lifespan, middleware order, all routers |
| `backend/engine.py` | High-level orchestrator (for CLI/testing, not the server entry) |
| `backend/.env` | Runtime secrets and env configuration |
| `backend/config/config.py` | AI thresholds and heuristic params |
| `backend/ai/contracts.py` | ALL data contracts (Pydantic models + enums) |
| `backend/ai/anomaly_detector.py` | `EXPECTED_FEATURE_NAMES` - canonical 71-feature list |
| `backend/ai/model_manager.py` | Model loading, singleton, MockClassifier fallback |
| `backend/ai/fusion_engine.py` | 4-case fusion logic, zero-day detection |
| `backend/auth/roles.py` | Role enum + PERMISSION_MATRIX |
| `backend/auth/jwt_handler.py` | Token create/decode/verify |
| `backend/database/collections.py` | All repository singleton instances |
| `backend/database/indexes.py` | All index definitions (TTL, compound, unique) |
| `backend/live_monitor/heuristic_fallback.py` | 5 deterministic safety-net rules |
| `backend/services/predict_service.py` | Full ML pipeline + DB persistence + fallback logic |
| `backend/response/response_engine.py` | Canonical enforcement dispatch |
| `models/metadata.json` | Model versions + calibration bounds + feature_stats |

---

## 30. Known Limitations & Technical Debt

1. **Live pipeline persistence incomplete:** `monitor_service._run_loop()` logs predictions but does NOT persist to `threats` collection or dispatch through `ResponseEngine` for normal completed flows (`# TODO` at line 155).

2. **[RESOLVED 2026-09-02] Frontend files implemented:** Vite 6 + React 18 SPA built with Tailwind CSS, Shadcn UI primitives, React Router v6 protected routes, and single-flight Axios interceptor.

3. **Notification stubs:** Email (SMTP) and SMS (Twilio) in `NotificationService` are unimplemented `pass` stubs.

4. **In-memory rate limiter:** Not suitable for multi-process/multi-instance deployments. State lost on restart. Production needs Redis-backed limiter.

5. **No CI/CD configuration:** No `.github/`, Dockerfile, docker-compose, or pipeline YAML found.

6. **Access token revocation:** Access tokens cannot be revoked before expiry (no blocklist/revocation list). Refresh token rotation provides secondary defense only.

7. **Model drift hook unimplemented:** `Predictor._track_model_drift_hook()` is a `pass` TODO.

8. **Feature count comment mismatch:** `feature_extractor.py` docstring says "77 features" but actual output and `EXPECTED_FEATURE_NAMES` have 71 features.

9. **Sandbox integration:** `sandbox.py` exists but is noop-only with no active path.

10. **Duplicate response_engine:** `live_monitor/response_engine.py` appears to be a copy of `response/response_engine.py`. Unclear if intentional.

11. **Heuristic ceiling divergence:** Escalation ceiling guard in `predict_service.py` is NOT applied in `monitor_service._handle_malformed_heuristic()` — two code paths may diverge in enforcement behavior.

12. **`JWT_ACCESS_EXPIRY_MINUTES` inconsistency:** `.env` sets 5 minutes; `jwt_handler.py` code default is 15 minutes. The env value wins at runtime.

---

## 31. Data Flow Overview

```
[Live Network Interface]
    |
    v Scapy (daemon thread)
PacketSniffer -> packet_queue -> FlowBuilder -> FeatureExtractor -> 71-feature dict
    |                                                                     |
    | (Case B: malformed)                                                v
    v                                          Predictor.predict() --------+
HeuristicFallback                              AnomalyDetector.predict()   |
    | (if escalate)                            fuse()                      |
    v                                          classify_risk()             |
ResponseEngine.handle_verdict()  <------------ decide()                    |
    |                                                                       |
    +-> FirewallAdapter.block_ip()        (Layer 1: external threat)       |
    +-> QuarantineService.quarantine()    (Layer 2: internal device)       |
    +-> ResponseLogger.log_action()                                        |
    +-> IncidentService.create_from_response_action()                      |
          +-> NotificationService.notify_*()                               |
                +-> broadcaster.publish(Event)                             |
                      +-> WebSocket clients (by role)                      |
                                                                           |
[TODO: normal flows not yet routed to ResponseEngine+DB] <-----------------+

[Manual API: POST /api/v1/prediction/test]
    |
    v predict_service.predict_manual()
    -> same AI pipeline (Predictor + AnomalyDetector + fuse + risk + decide)
    -> persist PredictionRecord to predictions collection
    <- PredictionResult + X-Prediction-Id header

[GET /api/v1/prediction/{id}/explain]
    -> fetch raw_features from predictions collection
    -> ExplainabilityEngine.explain()
       +- SHAP TreeExplainer  (if fusion_source in {supervised, agreement})
       +- z-score deviation   (if fusion_source == unsupervised)
    <- ExplanationResult
```

---

## 32. Assumptions & Unknowns

| Item | Status |
|---|---|
| Frontend framework version | **React 18 + Vite 6 + Tailwind CSS** |
| Frontend routing implementation | **React Router v6 with Role Capability Guards (`ProtectedRoute`)** |
| Frontend state management | **React Auth Context + Single-Flight Axios Mutex Interceptor** |
| Whether `live_monitor/response_engine.py` is an intentional copy | UNKNOWN |
| Actual training datasets used | Not in repo (gitignored) |
| Deployment environment | UNKNOWN -- no Dockerfile or infra config found |
| CI/CD pipeline | UNKNOWN -- no config found |
| Whether `ENVIRONMENT=production` is set in deployed envs | UNKNOWN |
| `models/` directory pre-populated on deployment | Must be done manually (gitignored) |

---

## 33. Maintenance Guidelines

1. **New API endpoint:** Add handler in `api/`, service method in `services/`, Pydantic schema in `schemas/`, mount router in `main.py`, add `require_permission()` dependency.

2. **Change AI thresholds:** Modify via env vars (`RISK_LOW_MAX`, `RISK_MEDIUM_MAX`, etc.) in `.env`. Read at import time from `config.py` -- no code changes needed.

3. **Retrain models:** Run preprocessing -> training scripts -> `scripts/train_anomaly_detector.py`. Place `.joblib` artifacts in `models/`. Update `metadata.json`. Restart server.

4. **Add heuristic rule:** Add `_check_X()` method to `HeuristicFallback`, append to `rules` list in `evaluate()`. Expose threshold as env var in `config.py`.

5. **Change feature schema:** Update `EXPECTED_FEATURE_NAMES` in `anomaly_detector.py` AND `FeatureExtractor.extract_features()` together, then retrain ALL models (supervised + IsolationForest).

6. **New WebSocket event:** Add `EventType` to `events.py`, create `class XEvent(Event)` with `target_audience`, call `broadcaster.publish(XEvent(...))` from the service layer.

7. **Enable real firewall/quarantine:** Set `FIREWALL_ADAPTER_TYPE=generic_rest` and `QUARANTINE_MODE=active` in `.env`. Provide real API URLs and keys.

8. **Scale rate limiter:** Replace `RateLimitMiddleware` in-memory dict with Redis-backed sliding window (e.g., `fastapi-limiter`).

9. **Change TTL:** Set `THREAT_RETENTION_DAYS` / `PREDICTION_RETENTION_DAYS` in `.env`. Indexes recreated on next startup.

10. **Rotate JWT secret:** Update `JWT_SECRET_KEY` in env. All existing access tokens immediately invalid. Users must re-login. No access token blocklist needed.

---

## 34. Recent System Enhancements & Architecture Updates (2026-09-02)

### 1. Phase 1 — Frontend Scaffold & Single-Flight Auth
- **Vite 6 + React 18 Setup**: Configured with Tailwind CSS and Shadcn UI primitives (`Card`, `Badge`, `Button`, `cn` helper).
- **In-Memory JWT Access Tokens**: Tokens held strictly in memory; HTTP-only refresh tokens stored in `localStorage` for session restoration.
- **Single-Flight Refresh Mutex Interceptor**: In `frontend/src/services/api.js`, a single shared refresh promise queues concurrent 401 requests, preventing parallel refresh calls that trigger server-side token replay revocation. Verified via automated stress test (5 concurrent 401s $\rightarrow$ 1 `/auth/refresh` HTTP call).

### 2. Phase 2 — Smart Summary View & Explainability Isolation
- **Humanized Feature Lookup**: Created `frontend/src/utils/featureLabels.js` mapping all 71 CICIDS2017 features into human-understandable descriptions. 100% feature coverage verified.
- **On-Demand SHAP & Deviation Drawer**: Integrated `frontend/src/components/ExplanationPanel.jsx` with dual-mode visualization (Impact Bars for Smart Summary, Data Matrix for Raw Logs).
- **Capability-Gated Endpoint & Wire Isolation**:
  - `GET /api/v1/prediction/{id}/explain` permission updated to `Capabilities.VIEW_SMART_SUMMARY` in `backend/api/prediction.py`.
  - **Server-Side Data Sanitization**: When a user session lacks `VIEW_RAW_LOGS` (Viewer role), `result.top_features[*].value = None` is enforced on the server before JSON serialization, preventing raw packet metrics from existing in browser memory or DevTools network logs.

### 3. Backend Authentication & Account Seeding
- **Flexible Identity Field**: `AuthService.login()` accepts username or email. MongoDB query evaluates `$or` against `email`, `username`, and domain alias (`username@netriq.local`).
- **Initial Account Seeder**: Startup seeder `seed_initial_users()` provisions demo accounts (`Admin`, `Analyst`, `Viewer`) with pre-hashed BCrypt passwords.

### 4. Wire-Level TLS SNI Parser
- Updated `PacketSniffer._process_packet()` to parse TCP port 443 ClientHello TLS extension blocks, extracting domain SNI hostnames (e.g., `youtube.com`). Falls back gracefully to `dst_ip:dst_port` when unencrypted or non-TLS.

### 5. Repository Maintenance & Git Untracking
- Purged 7,800+ tracked `node_modules` files from Git tracking while preserving local disk dependencies. Updated root and frontend `.gitignore` rules.

### 6. Phase 3 — Live Monitoring & Packet Stream Architecture
- **Sniffer Control Panel (`SnifferControlPanel.jsx`)**: Admin-gated Start/Stop engine toggle (`Capabilities.MANAGE_SETTINGS`), interface auto-detect display, live uptime interval ticker (`00:00:00`), and packet/flow counters.
- **Operational Telemetry Stat Cards (`OperationalMetrics.jsx`)**: Live visualization of sniffer health counters:
  - `queue_drop_count`: Overflow drops when consumer queue (10k) is exceeded.
  - `non_ip_count`: Case A filtered frames (ARP, LLDP, STP).
  - `malformed_ip_count`: Case B malformed packets evaluated via `HeuristicFallback`.
- **Dense Tabular Connection Feed (`ConnectionTable.jsx`)**:
  - Live flow table capped at 50 entries ring buffer.
  - Displays formatted timestamps, source IP:Port, SNI hostname or destination IP:Port, protocol, model engine with dedicated `Case B Heuristic` badge, severity badges, and mitigation action.
  - Severity filter pills (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Flow Throughput Chart (`FlowRateChart.jsx`)**:
  - 12-bucket 5-second interval histogram covering a rolling 60-second window.
  - Color-coded stacked bar distribution (Critical/High, Medium, Low/Pass).

### 7. Phase 3 Verification & Reliability Hardening
- **Direct Wire API RBAC 403 Enforcement**:
  - Direct HTTP wire testing verified `POST /api/v1/monitoring/start` and `POST /api/v1/monitoring/stop` return `403 Forbidden` for `Analyst` and `Viewer` tokens, while returning `200 OK` for `Admin`. `GET /api/v1/monitoring/status` returns `200 OK` across all roles.
- **ASGI WebSocket Double-Accept Bug Resolution**:
  - Identified and removed redundant `await websocket.accept()` inside `ConnectionManager.connect()` which was causing Starlette `RuntimeError: Expected ASGI message "websocket.send" or "websocket.close", but got 'websocket.accept'`.
- **Capped Exponential Reconnection Backoff**:
  - Enhanced `useWebSocket.js` with capped exponential retry backoff: $delay = \min(3000 \times 1.5^{\text{attempt}}, 30000)$ ms. Prevents hammering on extended server downtime while ensuring auto-reconnect upon server restart.
- **Browser Performance Under Sustained Flow Load**:
  - Verified in Chrome DevTools under 60 continuous simulated threat evaluations (~6-10 events/sec).
  - 50-entry ring buffer ceiling held strictly in browser state; JS heap remained stable at ~27-35 MB with 0 console errors and 0 DOM leaks.

