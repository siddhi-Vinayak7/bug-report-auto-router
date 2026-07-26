# Bug Router — Frontend

A React + Tailwind CSS web interface built with Vite for the Bug Report Auto-Router system.

## Setup Instructions

### 1. Installation

Navigate to the `frontend/` directory and install dependencies:

```bash
cd frontend
npm install
```

### 2. Environment Configuration

Create a `.env` file in `frontend/` (or copy `.env.example`):

```bash
cp .env.example .env
```

Configure your backend URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

### 3. Local Development Server

Ensure your FastAPI backend is running on `http://127.0.0.1:8000`, then start the Vite dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Features

- **Automated Bug Triage**: Submits raw bug report text to the ML backend via `POST /api/triage`.
- **Visual Predictions**: Displays predicted Module (`Auth`, `Chat`, `Tasks`, `Profile`, `Payments`, `Other`) and Severity (`Critical`, `Major`, `Minor`) with confidence progress bars.
- **Color-Coded Severity Tiers**:
  - `Critical`: Red/Crimson badge & border
  - `Major`: Amber/Orange badge & border
  - `Minor`: Emerald/Teal badge & border
- **Human-in-the-Loop Feedback**: Allows engineers to edit any misclassified module or severity dropdown.
- **Correction Logging**: Submits overrides or confirmations to the Postgres database via `POST /api/correct`.
