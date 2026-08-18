# 🛡️ NETRIQ — Network Intrusion & Threat Intelligence Platform

**NETRIQ** is an enterprise-grade, AI-driven Network Intrusion Detection System (NIDS), Threat Analytics, and Autonomous Response Platform. Built with **FastAPI**, **MongoDB**, **React**, and **Scikit-Learn**, NETRIQ provides real-time traffic monitoring, machine learning-powered threat classification, dynamic risk scoring, and automated mitigation.

---

## 🌟 Key Features

- 🧠 **Multi-Dataset Machine Learning Engine**: Pre-trained classifiers supporting **NSL-KDD**, **CICIDS2017**, and **UNSW-NB15** network intrusion datasets.
- ⚡ **Real-Time WebSockets**: Live network packet streaming, incident telemetry, and instant threat alerting via WebSockets (`/ws`).
- 🎯 **Dynamic Risk Scoring & Explainable AI**: Risk engine categorizing threat severity (Low, Medium, High, Critical) with SHAP-based feature importance explainability.
- 🤖 **Automated Response Engine**: Configurable mitigation triggers (e.g., IP blocking when confidence exceeds 85%).
- 📊 **Automated PDF & Excel Reporting**: On-demand and scheduled compliance/audit report generation powered by `ReportLab` and `OpenPyXL`.
- 🔐 **Enterprise Security & RBAC**: JWT-based authentication, password hashing with `bcrypt`, strict rate-limiting (Anti-DoS), CORS protection, and Security HTTP headers.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[🖥️ Client / Browser - React Frontend] -->|HTTPS REST API| API[⚡ FastAPI Backend Service]
    Client -->|WebSocket Stream| WS[📡 Real-time Telemetry /ws]
    
    subgraph Backend Pipeline
        API --> MW[🔒 Middleware Stack<br>RateLimit | Auth | Security | CORS | Logging]
        MW --> AuthDep[🛡️ RBAC & Permissions]
        AuthDep --> Services[⚙️ Application Services]
    end
    
    subgraph AI / ML Subsystem
        Services --> Predictor[🔮 Predictor Engine]
        Predictor --> Manager[📦 Model Manager]
        Manager --> Models[(🤖 Trained Models<br>NSL-KDD | CICIDS2017 | UNSW)]
        Predictor --> RiskEngine[⚖️ Risk & Decision Engine]
    end

    subgraph Data & Storage
        Services --> DB[(🍃 MongoDB - Motor Async)]
        Services --> Reports[📄 Report Engine<br>ReportLab PDF / OpenPyXL Excel]
    end
```

---

## 📁 Repository Structure

```
NTRIQ/
├── backend/                  # FastAPI Application Core
│   ├── ai/                   # Machine Learning Predictor, Risk Engine & Model Manager
│   ├── api/                  # REST API Routers (Auth, Analytics, Incidents, Reports, etc.)
│   ├── auth/                 # JWT Authentication, Password Hashing & RBAC Permissions
│   ├── config/               # App Configuration & Risk Thresholds
│   ├── database/             # MongoDB Connection Manager & Schemas
│   ├── middleware/           # Rate Limiting, Auth Context, Security Headers, CORS & Logging
│   ├── response/             # Automated Mitigation & Response Engine
│   ├── schemas/              # Pydantic Request/Response Data Validation Schemas
│   ├── services/             # Core Business Logic & Service Layers
│   ├── utils/                # Logging, Exceptions & Utility Functions
│   ├── websocket/            # Real-Time Telemetry & Alert Websocket Handlers
│   └── main.py               # FastAPI App Initialization & Middleware Registration
├── frontend/                 # React UI Dashboard Application
│   └── src/                  # Components, Pages, Context, Hooks & Router
├── models/                   # Serialized ML Model Artifacts (.joblib, .pkl)
│   ├── cicids2017/           # CICIDS2017 Trained Classifiers & Scalers
│   ├── nsl_kdd/              # NSL-KDD Trained Classifiers & Scalers
│   └── unsw/                 # UNSW-NB15 Trained Classifiers & Scalers
├── preprocessing/            # Data Cleaning, Feature Engineering & Encoding Pipelines
├── training/                 # Model Training Scripts (Random Forest, XGBoost, etc.)
├── datasets/                 # Raw & Processed Network Dataset Files
├── tests/                    # Unit and Integration Test Suites
├── requirements.txt          # Python Dependencies Manifest
└── README.md                 # Master Platform Documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **Database** | MongoDB (Motor Async Driver) |
| **Machine Learning** | Scikit-Learn, Pandas, NumPy, SHAP, Joblib |
| **Security & Auth** | PyJWT, Passlib (bcrypt), Starlette Middleware |
| **Real-time Telemetry** | WebSockets, Scapy (Packet Capture) |
| **Reporting & Export** | ReportLab (PDF), OpenPyXL (Excel) |
| **Frontend** | React, Modern Vanilla CSS / Tailwind |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10 or higher
- MongoDB instance (Local or MongoDB Atlas)
- Node.js & npm (for Frontend)

### 1. Environment Setup
Create a `.env` file in the `backend/` directory:

```env
PROJECT_NAME="NETRIQ API"
ENV="development"
PORT=8000

# MongoDB Configuration
MONGODB_URL="mongodb://localhost:27017"
DATABASE_NAME="netriq_db"

# JWT Authentication
JWT_SECRET_KEY="your_super_secret_jwt_key_here"
JWT_ALGORITHM="HS256"
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# CORS Setup
ALLOWED_ORIGINS="*"
```

### 2. Backend Installation & Execution

```bash
# Clone repository
git clone https://github.com/Abhilash-C-K/NETRIQ-LEARN.git
cd NTRIQ

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The Interactive API Documentation will be available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 3. Framework SDK & Command Line Interface (`netriq-cli`)

The platform can also be used as a standalone Python SDK or CLI tool via `framework/`:

```bash
# Run simulation mode with 5 synthetic network flows
python -m framework.cli --mode simulate --count 5

# Run live network interface sniffing
python -m framework.cli --mode live --interface eth0
```

#### Canonical CLI Telemetry Output
```text
===========================================================================
 🚀 NETRIQ Framework CLI v1.0.0
 AI Model: Random Forest (Network Traffic) + XGBoost / LightGBM
 Mode: SIMULATE | Dataset: CICIDS2017
===========================================================================

[ACTION: RECOMMEND_BLOCK] [Layer 1] Threat Level: HIGH
  Connection : 203.0.113.45:58413 -> 192.168.1.1:80 (TCP)
  Prediction : ANOMALY (Confidence: 90.0%)
  Decision   : Layer 1 Recommendation: High threat confidence (90.00% >= 85.0%). External firewall action recommended.
  Flow Stats : 845.0 ms | Packets: 0 Fwd / 169 Bwd | Bytes: 149,406 B
---------------------------------------------------------------------------
[ACTION: QUARANTINE] [Layer 2] Threat Level: HIGH
  Connection : 192.168.1.50:48191 -> 192.168.1.1:443 (TCP)
  Prediction : ANOMALY (Confidence: 90.0%)
  Decision   : Layer 2 Auto-Quarantine: Internal asset threat detected with HIGH risk level.
  Flow Stats : 10.0 ms | Packets: 0 Fwd / 2 Bwd | Bytes: 94 B
---------------------------------------------------------------------------
```

---

## 🌐 API Route Summary

| Endpoint Group | Prefix | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | User Registration, Login, Token Refresh & Logout |
| **Dashboard** | `/api/v1/dashboard` | Real-time system metrics, threat counters & status overview |
| **Prediction** | `/api/v1/prediction` | ML intrusion classification & risk score evaluation |
| **Incidents** | `/api/v1/incidents` | Incident triage, resolution status & escalation |
| **Analytics** | `/api/v1/analytics` | Threat distribution stats, attack vectors & trend analysis |
| **Monitoring** | `/api/v1/monitoring` | Live network interface packet streaming |
| **Response** | `/api/v1/response` | Automated & manual IP blocking / firewall actions |
| **Reports** | `/api/v1/reports` | Download PDF and Excel threat report exports |
| **Users** | `/api/v1/users` | Admin Role-Based Access Control (RBAC) management |
| **WebSockets** | `/ws` | Real-time live threat telemetry streaming |

---

## 🧪 Training & Preprocessing ML Models

To re-train or generate new intrusion detection models:

```bash
# 1. Run Data Preprocessing
python preprocessing/preprocess_nsl_kdd.py
python preprocessing/preprocess_cicids2017.py
python preprocessing/preprocess_unsw.py

# 2. Train Classifiers
python training/train_nsl_kdd.py
python training/train_random_forest.py
python training/train_unsw.py
```

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more details.
