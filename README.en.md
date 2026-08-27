# 🛣️ Pixel — A Multimodal AI Platform for Road Inspection in Plain Language

> **"Find the pothole areas", "Turn this data into a report"** — a road‑inspection AI workspace that runs on a single line of natural language.
>
> Pixel bundles VLM · YOLO · SAM · Hybrid RAG · LLM · AI Agent into one web service.

**🇰🇷 한국어 README: [README.md](README.md)**

![Home](docs/screenshots/dashboard.png)

---

## 🔗 Live Demo & Demo Accounts

**Open it: [https://dsm.gyungdal.cc](https://dsm.gyungdal.cc)**

Sign in with the accounts below to use every feature. **All passwords: `Pixel1234!`**

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| **User** | `user@pixel.com` | `Pixel1234!` | Labeling, search, reports, and more |
| **Company admin** | `admin@pixel.com` | `Pixel1234!` | Manage company members/reviewers, review projects |
| **Super admin** | `superadmin@pixel.com` | `Pixel1234!` | Full operations, company/owner approval, API keys |

---

## ✨ Features

All seven features live in a single top navigation bar.

| Feature | Description |
| --- | --- |
| 🏠 **Home dashboard** | Your work, stats, and resume‑where‑you‑left‑off at a glance. You can even drag a box on the hero. |
| 🏷 **Photo labeling** | Instruct in plain language and the AI draws boxes. **Our own YOLO (potholes · vehicles)** first, confidence threshold, COCO/YOLO export. |
| 🖼 **Photo captioning** | Upload a road photo and get a sentence + object list of what's dangerous (VLM). |
| 🔍 **Document search (RAG)** | Ask your uploaded documents in natural language → answers with citations (BM25 + contextual‑similarity hybrid). |
| 📊 **Public data** | data.go.kr integration — stats, rankings, and AI summaries by keyword, instantly. |
| ⛓ **Workflows** | Just write a goal and the AI lays out the task pipeline. |
| 📄 **Reports** | Pick a period and a template and it gathers your activity, searches, and labeling into a **submission‑ready draft** (copy · PDF · DOCX). |

<p align="center">
  <img src="docs/screenshots/labeling.png" width="49%" alt="Photo labeling" />
  <img src="docs/screenshots/report.png" width="49%" alt="Report" />
</p>

---

## 🧠 AI Backend (our own models first)

Box detection uses **our own dual YOLO models** as the first choice.

- 🎯 **`best.pt`** — **road‑damage** detection such as potholes and cracks (self‑trained)
- 🚗 **`vehicle.pt`** — **vehicle** (car · bus · truck) detection (self‑trained)
- 🧩 Both models plus general objects (yolov8n) are merged to return every object in the image with coordinates
- 🌐 **Fallback**: only when the models are absent on the server, Gemini grounding / GPT‑4o vision takes over

Text generation (captioning · RAG · reports · summaries · agent) falls back in the order **Gemini → local LLM (GPT‑OSS) → OpenAI**, and API keys can be swapped live from the admin screen.

> Model weights (`*.pt`) are not committed due to size (gitignored). Download them with `scripts/fetch_pothole_model.py` and drop them into `backend/storage/models/` to have them picked up automatically.

---

## 🛠 Tech Stack

| Area | Technology |
| --- | --- |
| **Frontend** | React 19 + Vite (MPA), pure‑CSS design system |
| **Backend** | Python · FastAPI · Uvicorn |
| **Vision AI** | Ultralytics YOLO (self‑trained), MobileSAM, Gemini/GPT‑4o Vision |
| **Generative AI** | Gemini · OpenAI · local LLM (GPT‑OSS, OpenAI‑compatible) |
| **Search (RAG)** | BM25 + contextual‑similarity hybrid |
| **Data** | Public Data Portal (data.go.kr) integration, SQLite |
| **Deploy** | Raspberry Pi + Docker, GitHub Actions CD |

---

## 🚀 Run Locally

### 1) Backend (unified web server)

```bash
# Install dependencies (uv recommended, pip also works)
uv sync --extra web        # with YOLO: uv sync --extra web --extra seg

# Start the server → http://127.0.0.1:8000
./run_web.sh               # Windows: .\run_web.ps1
# or: python -m uvicorn backend.app:app --port 8000
```

FastAPI serves `web/` (the built frontend) and exposes `/api/*`. Open **http://127.0.0.1:8000** in your browser.

### 2) Frontend dev mode (optional)

```bash
cd frontend
npm install
npm run dev                # Vite dev server
npm run build              # production build → copied to web/react
```

### 3) Environment variables (optional)

```bash
cp .env.example .env
# Fill in GEMINI_API_KEY / OPENAI_API_KEY / DATA_GO_KR_KEY for real AI
# Without keys, MOCK fallbacks still let you walk through every screen and flow
```

---

## 📁 Project Structure

```
pixel/
├── frontend/            # React + Vite source (src/) — one page per feature
├── web/                 # Built frontend (served by backend) + static assets
├── backend/             # FastAPI app · YOLO/vision services · RAG · public‑data adapters
│   ├── app.py           #   routes (/api/*)
│   ├── services.py      #   AI text/vision orchestration
│   ├── yolo_service.py  #   our dual‑model YOLO detection
│   └── pubdata/         #   Public Data Portal integration
├── prototypes/          # early per‑feature prototypes (Gradio, etc.)
├── scripts/             # utilities such as model provisioning
├── deploy/              # deployment scripts (RPi)
└── docs/                # planning/design/presentation materials, screenshots
```

---

## 📄 License

[GNU AGPL v3](LICENSE) — open source. If you offer this over a network, you must disclose the source.

<sub>© Pixel · Multimodal AI platform for road inspection</sub>
