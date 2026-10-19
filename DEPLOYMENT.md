# NETRIQ Cloud Deployment Guide (Render + Vercel)

This guide walks you through deploying the **FastAPI Backend on Render** and the **React + Vite Frontend on Vercel**.

---

## Architecture Overview

```
┌─────────────────────────────────┐       HTTPS / REST       ┌──────────────────────────────────┐
│          Vercel                 │ ───────────────────────> │            Render                │
│   (React + Vite Frontend)       │                          │      (FastAPI + Python Backend)  │
│   https://netriq.vercel.app     │ <══════════════════════> │  https://netriq.onrender.com     │
└─────────────────────────────────┘        WSS / WebSocket   └──────────────────────────────────┘
                                                                               │
                                                                               ▼
                                                             ┌──────────────────────────────────┐
                                                             │         MongoDB Atlas            │
                                                             │   (Free M0 Cloud Cluster)        │
                                                             └──────────────────────────────────┘
```

---

## Step 1: Set Up Cloud MongoDB (MongoDB Atlas)

Since Render is hosted in the cloud, you need a cloud-accessible MongoDB database:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account.
2. Create a free shared cluster (**M0 Free Tier**).
3. Under **Security → Database Access**, create a database user (e.g., `netriq_admin`) with a secure password.
4. Under **Security → Network Access**, add IP Address: `0.0.0.0/0` (Allow access from anywhere).
5. Under **Deployment → Database**, click **Connect** → **Drivers** (Python 3.12+).
6. Copy your connection string. It will look like:
   ```
   mongodb+srv://netriq_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy Backend to Render

1. Log in to [Render](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`NETRIQ` or `NETRIQ-LEARN`).
4. Configure the Web Service settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `netriq-backend` *(or your preferred name)* |
| **Region** | Choose nearest (e.g., `Oregon (US West)` or `Frankfurt`) |
| **Branch** | `main` |
| **Root Directory** | *(leave blank / repository root)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| **Plan Type** | **Free** |

5. Under **Advanced → Environment Variables**, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures compatible Python runtime |
| `MONGODB_URL` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Step 1 |
| `MONGO_DB` | `netriq_db` | Database name |
| `JWT_SECRET_KEY` | *(generate a random string, e.g. 32 chars)* | Secret for auth JWTs |
| `ALLOWED_ORIGINS` | `*` | Or your Vercel URL once deployed |

6. Click **Create Web Service**.
7. Once deployed, Render will provide your public backend URL, e.g.:
   ```
   https://netriq-backend.onrender.com
   ```
8. Verify it works by opening `https://your-backend.onrender.com/health` or `/docs` in your browser.

---

## Step 3: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`NETRIQ` or `NETRIQ-LEARN`).
4. Configure the Project Settings:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Root Directory** | Click **Edit** and select `frontend` |
| **Build Command** | `npm run build` *(default)* |
| **Output Directory** | `dist` *(default)* |
| **Install Command** | `npm install` *(default)* |

5. Under **Environment Variables**, add:

| Key | Value | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://<YOUR-RENDER-APP>.onrender.com/api/v1` | `https://netriq-backend.onrender.com/api/v1` |
| `VITE_WS_URL` | `wss://<YOUR-RENDER-APP>.onrender.com/ws` | `wss://netriq-backend.onrender.com/ws` |

*(Note: If you leave `VITE_WS_URL` blank, the app will automatically infer `wss://` from `VITE_API_URL`)*.

6. Click **Deploy**.
7. In ~1 minute, your frontend will be live on Vercel at `https://your-project.vercel.app`!

---

## Step 4: Verification Checklist

1. **Authentication:** Open your Vercel URL, log in with initial credentials (`admin` / `admin123` or your configured user).
2. **REST API & Live Endpoints:** Check that the Dashboard displays your metrics without 404 or CORS errors in the browser console.
3. **WebSockets:** Look at the beacon header on the Dashboard: it should show **`WebSocket Live`** (green), indicating live bidirection streaming to Render is active!
4. **Interactive Simulation:** Click **Simulate Attack** on the Dashboard header to confirm live threats and verdicts flow from Render to Vercel in real time.
