# Q9 Multi-Specialty Hospital — Production Deployment Guide

This guide details the step-by-step instructions, environment configurations, and security requirements to deploy the **AI-Powered Smart Hospital Platform** to a live production environment.

---

## Architecture Overview
The platform consists of three main components:
1. **Frontend**: React SPA powered by Vite (Build output: static files in `dist/` directory).
2. **Backend**: Node.js/Express REST API & Socket.IO WebRTC signaling gateway.
3. **ML Service**: FastAPI microservice serving AI diagnosis models & Gemini-powered chatbot queries.

---

## Crucial Production Requirements

### 1. SSL/HTTPS (Secure Context)
> [!IMPORTANT]
> **WebRTC and Camera/Mic Permissions**: Modern web browsers (Chrome, Safari, Firefox, Edge) restrict camera and microphone access (`navigator.mediaDevices.getUserMedia`) to **Secure Contexts (HTTPS)** only.
> - If you host the frontend on a plain `http://` domain, video conferencing will fail, and local/remote webcam feeds will be blocked.
> - **Action**: Ensure your frontend hosting provider has SSL enabled (most modern hosts like Vercel, Netlify, and Cloudflare Pages do this automatically).

### 2. WebRTC Traversal (STUN vs TURN)
The project includes pre-configured public Google STUN servers in `VideoCallRoom.jsx`:
```javascript
const peerConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};
```
STUN servers are sufficient for 85%+ of direct internet connections. However, if any patient or doctor is behind a symmetric NAT or highly restrictive enterprise firewall (e.g., cellular data or hospital networks), connections might fail to negotiate.
- **Production Recommendation**: Set up a free or paid TURN server (using providers like Metered.ca, Twilio Network Traversal, Xirsys, or self-hosted `coturn`) and append the credentials to your `peerConfiguration.iceServers` list in `VideoCallRoom.jsx`:
  ```javascript
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'your-username',
    credential: 'your-password'
  }
  ```

---

## Step 1: Environment Variables Setup

Configure the following environment variables on your hosting platforms:

### A. Frontend Environment Variables
Set these in your frontend hosting control panel (e.g., Vercel / Netlify):

| Variable Name | Example / Production Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://api.myhospital.com/api` | The base URL of your deployed Express backend API. |
| `VITE_SOCKET_URL` | `https://api.myhospital.com` | (Optional) Explicit socket endpoint if different from the API base domain. |
| `VITE_RAZORPAY_KEY_ID` | `rzp_live_xxxxxxxxxxxxxx` | Your live production Razorpay Key ID (or keep test key for staging). |

### B. Backend Environment Variables
Set these in your backend hosting control panel (e.g., Render / Railway / Heroku / AWS ECS):

| Variable Name | Example / Production Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables performance optimizations and disables verbose debug stacks. |
| `PORT` | `5000` | The port the server binds to (assigned automatically by most PaaS). |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | Connection string to your production MongoDB cluster. |
| `JWT_SECRET` | `generate-a-long-random-string-here` | Secret key used to sign JWT authentication tokens. |
| `JWT_REFRESH_SECRET` | `generate-another-long-random-string-here` | Secret key used to sign JWT refresh tokens. |
| `ML_SERVICE_URL` | `https://ml.myhospital.com` | Deployed URL of the Python FastAPI ML microservice. |
| `FRONTEND_URL` | `https://myhospital.com,https://www.myhospital.com` | Comma-separated list of allowed frontend domains. Used for CORS matching. |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxxxxxxxxxxx` | Production Razorpay Key ID. |
| `RAZORPAY_KEY_SECRET` | `prod_secret_xxxxxxxxxxxxx` | Production Razorpay Key Secret. |

### C. ML Service Environment Variables
Set these in your FastAPI hosting platform:

| Variable Name | Example / Production Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Bind port for the FastAPI service. |
| `GEMINI_API_KEY` | `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxx` | Google Gemini API Key for smart clinical assistant chatbot features. |

---

## Step 2: Deploying the Backend & ML Service

### Option 1: PaaS (Render / Railway / Heroku)
1. **GitHub Repository**: Push your code to GitHub.
2. **Create New Web Service**:
   - Point to your repository.
   - For **Backend**:
     - Set the base directory/root path to `backend`.
     - Build command: `npm install`
     - Start command: `npm start`
     - Bind Port: Ensure it matches the host-provided port variable.
   - For **ML Service**:
     - Set the base directory/root path to `ml-service`.
     - Build/Start command: FastAPI runs with uvicorn. If your provider supports Python natively, use:
       ```bash
       pip install -r requirements.txt
       uvicorn main:app --host 0.0.0.0 --port $PORT
       ```
3. **Add Environment Variables**: Paste the corresponding environment keys listed in Step 1.

### Option 2: Docker Compose (VM / AWS EC2 / DigitalOcean)
If you are deploying to a Linux server with Docker and Docker Compose installed:
1. Transfer the workspace directory to the server.
2. Configure `.env` files inside `backend/` and `ml-service/` folders.
3. Open `docker-compose.yml` and verify the `FRONTEND_URL` points to your production domain.
4. Run the services in detached mode:
   ```bash
   docker compose up -d --build
   ```

---

## Step 3: Deploying the Frontend

You can deploy the frontend static files to any static host (Vercel, Netlify, Github Pages, etc.):

### Deploying to Vercel (Recommended)
1. Install Vercel CLI globally or use the Vercel Git integration:
   - Go to [vercel.com](https://vercel.com) -> Add New Project -> Import your Github repository.
2. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the Frontend environment variables (e.g., `VITE_API_URL`).
4. Click **Deploy**. Vercel will automatically provision a secure `https://` domain for you.

---

## Step 4: Post-Deployment Smoke Tests

Once all three services are live, verify the following core features:

1. **User Authentication**: Check that signup and login succeed, saving cookies/JWT tokens correctly.
2. **AI Clinical Assistant Chatbot**: Open the chatbot drawer and type "Hi" or "I have a fever". Ensure the chatbot returns responses (it will run on local fallback rules if no Gemini key is provided, or query Gemini directly if it's set).
3. **Razorpay Payments**: Try booking a consultation:
   - Check if the Razorpay checkout overlay launches when clicking "Confirm and Pay".
   - If using live keys, verify payment goes through. If keys are omitted, confirm the simulation checkout screen functions.
4. **WebRTC Video Consultations**:
   - Log in as a patient on a mobile device and a doctor on a laptop.
   - Start the video call.
   - Verify that camera/mic feeds mount correctly on both devices, indicating the Socket.IO signaling relay and STUN networks are working.
5. **Print Prescriptions**: Complete a consultation on the doctor dashboard, verify the print preview screen opens, and print the resulting document.
