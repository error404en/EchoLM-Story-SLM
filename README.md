# 🌌 Story-SLM: End-to-End Generative Story Studio

*(A gorgeous Next.js and PyTorch local generative text application)*

**Story-SLM** is a bespoke, fully local, end-to-end Small Language Model (SLM) application designed for creative storytelling. Built entirely from scratch, it pairs a custom-trained **29.37M Parameter PyTorch GPT model** with a stunning, highly interactive **Next.js frontend**. 

This project goes far beyond a simple API wrapper. It features custom model architecture implementation, dynamic inference, zero-shot atmosphere classification via DistilBERT, and complex data visualizations using D3.js—all running entirely on your local machine without needing a massive GPU.

---

## 📑 Table of Contents
1. [Core Features & Highlights](#-core-features--highlights)
2. [Deep-Dive Architecture](#-deep-dive-architecture)
    - [The Small Language Model (SLM)](#1-the-small-language-model-slm)
    - [Backend Inference Engine (FastAPI)](#2-backend-inference-engine-fastapi)
    - [Frontend UI (Next.js & D3.js)](#3-frontend-ui-nextjs--d3js)
3. [API Documentation](#-api-documentation)
4. [Getting Started & Installation](#-getting-started--installation)
5. [Model Checkpoints & Git LFS](#-model-checkpoints--git-lfs)
6. [Future Roadmap](#-future-roadmap)

---

## ✨ Core Features & Highlights

* **🧠 Custom 29.37M Parameter SLM:** A from-scratch GPT-style autoregressive model trained specifically on the **TinyStories** dataset for 20,000 steps. Highly optimized for CPU and consumer GPU inference.
* **🎭 Intelligent Zero-Shot Atmosphere Detection:** As the user types their prompt, the backend utilizes a dedicated NLP pipeline (`typeform/distilbert-base-uncased-mnli`) to perform zero-shot classification on the text. It dynamically detects the semantic theme (Fantasy, Sci-Fi, Thriller, Romantic, Comedy) and seamlessly morphs the entire frontend UI color palette to match the mood.
* **⚛️ Real-time D3.js Quadtree Visualization:** A state-of-the-art live visualization engine. As the model infers tokens, the frontend runs a real-time force-directed physics simulation, rendering tokens and mapping them into spatial quadtree boundary cells to visualize the model's token distribution.
* **📊 Developer Evaluation Dashboard:** A built-in dashboard featuring a custom radar chart, real-time performance tracking (simulated Latency, Memory Usage, Tokens/sec), and session history archiving.
* **💎 Premium Glassmorphism UI:** Built with Next.js and Tailwind CSS, featuring rich micro-animations, glowing radial gradients, and a gorgeous dark-mode-first aesthetic.

---

## 🏗️ Deep-Dive Architecture

### 1. The Small Language Model (SLM)
The core of the project is a causal language model implemented in pure PyTorch.
* **Hyperparameters:**
  * **Layers:** 8
  * **Attention Heads:** 8
  * **Embedding Dimension:** 512
  * **Context Window (Block Size):** 512 tokens
  * **Vocabulary Size:** 8,192 (Custom BPE Tokenizer)
* **Training Context:** The model was trained using a custom training loop with Gradient Accumulation, Cosine Learning Rate Decay, and Weight Decay optimization on the `roneneldan/TinyStories` corpus. It is highly proficient at generating coherent, creative, and short English narratives.

### 2. Backend Inference Engine (FastAPI)
Located in `my_model/api.py`, the backend is a lightning-fast Python server.
* **Dynamic Generation:** Implements `temperature` and `top_p` nucleus sampling. It intercepts and cleanly handles `<|endofstory|>` tokens to prevent bleeding and safely strips the prompt from the output tensor.
* **Lazy-Loaded NLP Pipeline:** The zero-shot classification pipeline is lazy-loaded into memory on the first request to drastically reduce initial server boot times.

### 3. Frontend UI (Next.js & D3.js)
Located in `story-slm/`, the frontend is a highly reactive React application.
* **Debounced State Synchronization:** Connects the React `textarea` to the backend `/api/analyze-atmosphere` endpoint using a 600ms debounce to prevent API flooding while typing.
* **CSS Custom Properties for Theming:** Instead of swapping hundreds of Tailwind classes, the app uses `data-theme` attributes on the root container to seamlessly interpolate CSS variables (e.g., `--theme-bg`, `--theme-accent`) for smooth, animated theme transitions.

---

## 📡 API Documentation

The FastAPI backend exposes the following robust endpoints:

### `GET /api/health`
Checks the server status and model load state.
* **Response:** `{"status": "ok", "model": "Story-SLM", "device": "cuda" | "cpu"}`

### `POST /api/analyze-atmosphere`
Performs zero-shot NLP classification on the prompt.
* **Payload:** `{"prompt": "A brave knight slayed the dragon."}`
* **Response:** `{"theme": "fantasy"}` (Options: `fantasy`, `scifi`, `thriller`, `romantic`, `funny`)

### `POST /api/generate`
Generates a story continuation based on hyperparameters.
* **Payload:** 
  ```json
  {
    "prompt": "Once upon a time",
    "temperature": 75.0,
    "length": 50.0 
  }
  ```
* **Response:** `{"story": "...in a land far away, lived a tiny bird...", "prompt": "Once upon a time"}`

---

## 🚀 Getting Started & Installation

### 1. Start the API Server
Ensure you have Python 3.10+ installed.

```bash
# Navigate to the root directory
cd MAJOR

# Install backend dependencies
pip install torch transformers fastapi uvicorn tokenizers pydantic

# Run the FastAPI server
python my_model/api.py
```
*The API will boot up on `http://127.0.0.1:8000`.*

### 2. Start the Frontend Application
In a separate terminal, boot up the Next.js development server.

```bash
# Navigate to the frontend directory
cd MAJOR/story-slm

# Install frontend dependencies
npm install

# Run the dev server
npm run dev
```
*The app will be available at `http://localhost:3000`.*

---

## 🔒 Model Checkpoints & Git Tracking

Due to GitHub's strict 100 MB file size limit, **the `.pt` PyTorch model checkpoints are explicitly ignored in this repository** via the `.gitignore` configuration.

If you are cloning this repository to run it locally, **you must supply your own trained model weights**. 
Place your `latest.pt` (or equivalent checkpoint) inside the `my_model/checkpoints/` directory before starting the FastAPI server. Without it, the application will fail to start.

---

## 🔮 Future Roadmap

- [ ] **Quantization:** Implement INT8 or 4-bit quantization to further reduce memory overhead for the model inference.
- [ ] **Streaming Responses:** Upgrade the `/api/generate` endpoint to use Server-Sent Events (SSE) so the frontend can typewriter-stream the generated story in real-time.
- [ ] **Custom Training Configurator:** A dedicated UI panel to view training loss graphs and actively tweak inference hyperparameters directly from the dashboard.

---
*Built for advanced Agentic UI workflows and AI storytelling.*
