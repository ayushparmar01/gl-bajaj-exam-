# 🚀 GLB EXAMSPHERE Vercel Deployment Guide

This guide provides complete, step-by-step instructions to deploy **GLB EXAMSPHERE** (Express Backend + Vite React Frontend) on **Vercel**.

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. A **[Vercel Account](https://vercel.com/signup)** (Free Hobby tier is sufficient).
2. A **[MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas/register)** (Free M0 Sandbox cluster for cloud database).
3. Your project pushed to **GitHub** (or use the Vercel CLI below).

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Free Database)

Because Vercel functions are stateless and serverless, an in-memory database cannot be used in production.

1. Log into [MongoDB Atlas](https://cloud.mongodb.com).
2. Click **Create** to deploy a new cluster:
   - Select the **M0 Free (Shared)** tier.
   - Choose a region closest to your users.
   - Click **Create Deployment**.
3. **Database Access (User Credentials)**:
   - Go to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Set Authentication Method to **Password**.
   - Create a username (e.g. `exampro_admin`) and a secure password (note this down).
   - Set Database User Privileges to **Read and write to any database**.
4. **Network Access (IP Whitelist)**:
   - Go to **Security** → **Network Access**.
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) — *required because Vercel serverless IPs change dynamically*.
   - Click **Confirm**.
5. **Get Connection String**:
   - Go to **Database** → Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the URI. It will look like:
     ```
     mongodb+srv://exampro_admin:<password>@cluster0.abcde.mongodb.net/exampro?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password and specify `/exampro` database name.

---

## 🚀 Choose Your Deployment Approach

You have two options on Vercel:

| Method | Recommended For | Vercel Setup |
|---|---|---|
| **Option A: Two Separate Projects** | Best practice, cleaner builds, independent logs | Deploy `backend` and `frontend` as 2 separate Vercel projects |
| **Option B: Single Fullstack Project** | Single URL, no cross-domain CORS | Deploy the whole repository in 1 Vercel project |

---

## 🌐 Option A: Deploy as Two Projects (Recommended)

### A1. Deploy the Backend Project

1. Go to [vercel.com/new](https://vercel.com/new) and import your Git repository.
2. In the **Project Configuration**:
   - **Project Name**: `exampro-backend` (or your choice).
   - **Root Directory**: Click *Edit* and select **`backend`**.
   - **Framework Preset**: Other (Vercel automatically detects `@vercel/node` via `backend/vercel.json`).
3. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `MONGO_URI` | `mongodb+srv://exampro_admin:...@cluster0.../exampro` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | Any random 32+ character string | Secret key for signing tokens |
   | `JWT_EXPIRE` | `7d` | Token lifetime |
   | `NODE_ENV` | `production` | Production environment mode |
   | `EMAIL_HOST` | `smtp.gmail.com` *(optional)* | SMTP email host for OTP verification |
   | `EMAIL_USER` | `your-email@gmail.com` *(optional)* | Sender email |
   | `EMAIL_PASS` | `your-app-password` *(optional)* | Gmail App Password (16 characters) |
   | `GOOGLE_CLIENT_ID` | *(optional)* | Google OAuth client ID |
4. Click **Deploy**.
5. Once deployed, note down your backend URL (e.g. `https://exampro-backend.vercel.app`).
   - Test by opening `https://glb-exam-sphere-backend.vercel.app/api/health` in your browser. You should see `{"success":true,"message":"GLB EXAMSPHERE API is running"}`.

---

### A2. Deploy the Frontend Project

1. Go to [vercel.com/new](https://vercel.com/new) and import the **same repository** a second time.
2. In the **Project Configuration**:
   - **Project Name**: `exampro-app` (or your choice).
   - **Root Directory**: Click *Edit* and select **`frontend`**.
   - **Framework Preset**: **Vite** (detected automatically).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://exampro-backend.vercel.app/api` *(replace with your actual backend URL from step A1)* |
   | `VITE_GOOGLE_CLIENT_ID` | *(optional)* |
4. Click **Deploy**.
5. Your frontend is live! Visiting `https://exampro-app.vercel.app` connects directly to your backend API.

---

## 📦 Option B: Deploy as a Single Fullstack Project

Both the Express API (`/api/*`) and React frontend (`/*`) can be served from a single unified Vercel domain.

1. Go to [vercel.com/new](https://vercel.com/new) and import your Git repository.
2. In the **Project Configuration**:
   - Keep **Root Directory** as **`./`** (root).
   - Framework Preset: **Other**.
   - Vercel will automatically read root [`vercel.json`](file:///c:/Users/aptes/OneDrive/Desktop/exam/vercel.json) which handles routing `/api/(.*)` to `api/index.js` and all other traffic to `frontend/dist`.
3. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `MONGO_URI` | `mongodb+srv://exampro_admin:...@cluster0.../exampro` |
   | `JWT_SECRET` | Your secure secret key |
   | `JWT_EXPIRE` | `7d` |
   | `NODE_ENV` | `production` |
4. Click **Deploy**.
5. Since frontend and backend share the same domain, relative `/api` calls work automatically without setting `VITE_API_URL`.

---

## 💻 Alternative: Deploying via Vercel CLI

If you prefer deploying directly from your terminal without pushing to GitHub:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Log into Vercel:
   ```bash
   vercel login
   ```
3. **Deploy Backend**:
   ```bash
   cd backend
   vercel --prod
   ```
   Follow prompts to set up the project and add environment variables (`MONGO_URI`, `JWT_SECRET`).

4. **Deploy Frontend**:
   ```bash
   cd ../frontend
   vercel --prod
   ```
   Add `VITE_API_URL` during prompt or in the dashboard.

---

## 🧪 Verification & Default Accounts

When the backend connects to an empty database on first boot, it automatically seeds two test accounts:

| Role | Email | Password |
|---|---|---|
| 👑 **Administrator** | `admin@exampro.com` | `password123` |
| 👨‍🎓 **Student** | `student@exampro.com` | `password123` |

After deployment:
1. Open your frontend URL.
2. Log in with `admin@exampro.com` / `password123` to access the Admin Exam Dashboard, Question Bank, and Live Proctoring console.
3. Log in with `student@exampro.com` in another window or browser tab to take exams and verify end-to-end functionality.
