# Story-SLM ✨

Story-SLM is a bespoke, end-to-end local story generation studio powered by a custom-trained **29-Million Parameter Small Language Model (SLM)**. Built from the ground up, the project features a custom GPT-style PyTorch architecture, a high-performance FastAPI backend, and a stunning, highly-interactive Next.js frontend that brings your stories to life.

## 🌟 Key Features

* **Custom 29M Parameter Model:** A lightweight, GPT-style autoregressive model trained specifically on the TinyStories corpus. It's fast, efficient, and runs entirely locally without needing a heavy GPU.
* **Intelligent Atmosphere Detection:** Instead of relying on hardcoded keywords, the app utilizes an active Natural Language Processing (NLP) pipeline (`typeform/distilbert-base-uncased-mnli`). It performs zero-shot classification on your prompt in real-time to organically detect the theme (Fantasy, Sci-Fi, Thriller, Romantic, or Comedy) and adapts the entire UI's color palette and visual atmosphere dynamically.
* **Real-time Token Quadtree Simulation:** A state-of-the-art data visualization built with **D3.js**. As you type your prompt, the UI runs a live force-directed physics simulation, rendering the semantic tokens and mapping them into spatial quadtree cells to visualize the model's "thought process".
* **Rich Story Studio Interface:** A premium, dark-mode-first aesthetic with glassmorphism, micro-animations, model latency statistics, and session archive tracking.

## 🛠️ Architecture

### Backend (Python / PyTorch / FastAPI)
* **`my_model/api.py`**: The core API server. Features a custom GPT architecture (`CausalSelfAttention`, `Block`, `MLP`) and loads the trained `.pt` weights. It manages both the autoregressive token generation and the zero-shot context classification.
* **Model Specs**: 8 Transformer Layers, 512 Embedding Dimension, 8 Heads, 8,192 BPE Vocabulary.

### Frontend (Next.js / React / Tailwind)
* **`story-slm/`**: The user interface. Uses React hooks to manage streaming data, debounced API calls for atmosphere detection, and complex SVG D3 layouts for the evaluation dashboard. 

## 🚀 Getting Started

To run Story-SLM locally, you'll need to start both the Python API and the Next.js frontend.

### 1. Start the API Server
Ensure you have Python 3.10+ installed.

```bash
cd MAJOR
# Install dependencies
pip install torch transformers fastapi uvicorn tokenizers pydantic

# Run the FastAPI server
python my_model/api.py
```
*The API will boot up on `http://127.0.0.1:8000`.*

### 2. Start the Frontend Application
In a separate terminal, start the Next.js development server.

```bash
cd MAJOR/story-slm
# Install dependencies
npm install

# Run the dev server
npm run dev
```
*The app will be available at `http://localhost:3000`.*

## 🔒 Notes on Model Checkpoints
To keep the GitHub repository clean and lightweight, the massive `.pt` model checkpoint files (355 MB each) are explicitly ignored via `.gitignore`. To fully run this project locally, you must provide the trained `latest.pt` checkpoint inside the `my_model/checkpoints/` directory.
