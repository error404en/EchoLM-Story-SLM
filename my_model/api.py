import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
from dataclasses import dataclass
from tokenizers import Tokenizer
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ==========================================
# 1. ARCHITECTURE DEFINITION
# ==========================================
print("Loading architecture configuration...")
with open(os.path.join(BASE_DIR, "run_info.json"), "r") as f:
    info = json.load(f)

@dataclass
class Config:
    n_layer: int = info["config"]["n_layer"]
    n_head: int = info["config"]["n_head"]
    n_embd: int = info["config"]["n_embd"]
    block_size: int = info["config"]["block_size"]
    dropout: float = 0.0
    bias: bool = False
    vocab_size: int = info["config"]["vocab_size"]

cfg = Config()

class CausalSelfAttention(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.n_head = cfg.n_head
        self.head_dim = cfg.n_embd // cfg.n_head
        self.c_attn = nn.Linear(cfg.n_embd, 3 * cfg.n_embd, bias=cfg.bias)
        self.c_proj = nn.Linear(cfg.n_embd, cfg.n_embd, bias=cfg.bias)
        self.resid_dropout = nn.Dropout(cfg.dropout)
        self.dropout = cfg.dropout

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.c_attn(x).split(C, dim=2)
        q = q.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        y = F.scaled_dot_product_attention(q, k, v, dropout_p=0.0, is_causal=True)
        return self.resid_dropout(self.c_proj(y.transpose(1, 2).contiguous().view(B, T, C)))

class MLP(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.c_fc = nn.Linear(cfg.n_embd, 4 * cfg.n_embd, bias=cfg.bias)
        self.gelu = nn.GELU()
        self.c_proj = nn.Linear(4 * cfg.n_embd, cfg.n_embd, bias=cfg.bias)
        self.dropout = nn.Dropout(cfg.dropout)
    def forward(self, x): return self.dropout(self.c_proj(self.gelu(self.c_fc(x))))

class Block(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.ln_1 = nn.LayerNorm(cfg.n_embd, bias=cfg.bias)
        self.attn = CausalSelfAttention(cfg)
        self.ln_2 = nn.LayerNorm(cfg.n_embd, bias=cfg.bias)
        self.mlp = MLP(cfg)
    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x

class GPT(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.cfg = cfg
        self.tok_emb = nn.Embedding(cfg.vocab_size, cfg.n_embd)
        self.pos_emb = nn.Embedding(cfg.block_size, cfg.n_embd)
        self.drop = nn.Dropout(cfg.dropout)
        self.blocks = nn.ModuleList([Block(cfg) for _ in range(cfg.n_layer)])
        self.ln_f = nn.LayerNorm(cfg.n_embd, bias=cfg.bias)
        self.head = nn.Linear(cfg.n_embd, cfg.vocab_size, bias=False)
        self.tok_emb.weight = self.head.weight

    def forward(self, idx):
        B, T = idx.shape
        pos = torch.arange(T, device=idx.device)
        x = self.drop(self.tok_emb(idx) + self.pos_emb(pos)[None, :, :])
        for block in self.blocks: x = block(x)
        logits = self.head(self.ln_f(x))
        return logits
        
    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=0.8, top_p=0.9, eos_id=1):
        self.eval()
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -self.cfg.block_size:]
            logits = self(idx_cond)
            logits = logits[:, -1, :] / max(temperature, 1e-5)
            probs = F.softmax(logits, dim=-1)
            sorted_probs, sorted_idx = torch.sort(probs, descending=True)
            cum_probs = torch.cumsum(sorted_probs, dim=-1)
            mask = cum_probs - sorted_probs > top_p
            sorted_probs[mask] = 0.0
            sorted_probs /= sorted_probs.sum(dim=-1, keepdim=True)
            next_id = sorted_idx.gather(-1, torch.multinomial(sorted_probs, 1))
            idx = torch.cat([idx, next_id], dim=1)
            if eos_id is not None and next_id.item() == eos_id:
                break
        return idx

# ==========================================
# 2. LOAD WEIGHTS & TOKENIZER
# ==========================================
print("Loading tokenizer...")
tokenizer = Tokenizer.from_file(os.path.join(BASE_DIR, "tokenizer/tokenizer.json"))
EOS_ID = tokenizer.token_to_id("<|endofstory|>")
if EOS_ID is None:
    EOS_ID = 1

print("Initializing model...")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
model = GPT(cfg).to(DEVICE)

print("Locating checkpoint...")
latest_ptr = torch.load(os.path.join(BASE_DIR, "checkpoints/latest.pt"), map_location="cpu")
ckpt_path = os.path.join(BASE_DIR, "checkpoints", os.path.basename(latest_ptr["points_to"]))

print(f"Loading weights from {ckpt_path}...")
checkpoint = torch.load(ckpt_path, map_location="cpu")
model.load_state_dict(checkpoint["model_state"])
print(f"Model successfully loaded on {DEVICE}!\n")

# ==========================================
# 3. FASTAPI SERVER
# ==========================================
app = FastAPI(title="Story-SLM Inference API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str = ""
    temperature: float = 72.0
    length: float = 54.0

class AnalyzeRequest(BaseModel):
    prompt: str = ""

# Lazy-loaded transformer pipeline for intelligent theme detection
theme_classifier = None

@app.get("/")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "model": "Story-SLM", "device": DEVICE}

@app.post("/api/analyze-atmosphere")
def analyze_atmosphere(req: AnalyzeRequest):
    global theme_classifier
    clean_prompt = req.prompt.strip()
    if not clean_prompt or len(clean_prompt) < 3:
        return {"theme": "fantasy"}

    if theme_classifier is None:
        print("Loading zero-shot classification model for atmosphere detection...")
        try:
            from transformers import pipeline
            # Using a very small, fast model for classification
            device_id = 0 if DEVICE == "cuda" else -1
            theme_classifier = pipeline("zero-shot-classification", model="typeform/distilbert-base-uncased-mnli", device=device_id)
        except Exception as e:
            print(f"Failed to load transformers pipeline: {e}")
            return {"theme": "fantasy"}

    candidate_labels = ["fantasy", "sci-fi", "thriller", "romantic", "comedy"]
    try:
        result = theme_classifier(clean_prompt, candidate_labels)
        best_label = result["labels"][0]
        
        # Map labels to our specific ThemeName keys
        theme_map = {
            "fantasy": "fantasy",
            "sci-fi": "scifi",
            "thriller": "thriller",
            "romantic": "romantic",
            "comedy": "funny"
        }
        return {"theme": theme_map.get(best_label, "fantasy")}
    except Exception as e:
        print(f"Classification error: {e}")
        return {"theme": "fantasy"}

@app.post("/api/generate")
def generate_story(req: GenerateRequest):
    # Map React's 0-100 UI scale to reasonable model hyperparams
    actual_temp = max(0.1, req.temperature / 100.0 * 1.3) # Scale 0-100 to 0.1-1.3
    actual_len = int(max(30, req.length / 100.0 * 250))   # Scale 0-100 to 30-250 tokens
    
    clean_prompt = req.prompt.strip() if req.prompt else "Once upon a time"
    if not clean_prompt:
        clean_prompt = "Once upon a time"

    print(f"Incoming Request -> Prompt: '{clean_prompt[:40]}...', Temp: {actual_temp:.2f}, Max Tokens: {actual_len}")
    
    ids = tokenizer.encode(clean_prompt).ids
    if not ids:
        ids = tokenizer.encode("Once upon a time").ids

    x = torch.tensor([ids], dtype=torch.long, device=DEVICE)
    
    out = model.generate(x, max_new_tokens=actual_len, temperature=actual_temp, top_p=0.9, eos_id=EOS_ID)
    
    # Exclude the input prompt tokens from the decoded output
    prompt_len = len(ids)
    generated_ids = out[0].tolist()[prompt_len:]
    generated_text = tokenizer.decode(generated_ids)
    
    # Strip end-of-story marker if present
    if "<|endofstory|>" in generated_text:
        generated_text = generated_text.split("<|endofstory|>")[0]

    # Fix common mojibake characters (CP1252 / ISO-8859-1 misinterpretations of UTF-8)
    replacements = {
        "â€œ": "“",
        "â€\x9d": "”",
        "â€": "”",
        "â€™": "’",
        "â€˜": "‘",
        "â€”": "—",
        "â€“": "–",
        "â€¦": "…",
        "â€": '"',
        "Â": "",
        "<|pad|>": "",
        "<|endofstory|>": "",
    }
    for bad, good in replacements.items():
        generated_text = generated_text.replace(bad, good)
    
    return {"story": generated_text.strip()}

if __name__ == "__main__":
    import uvicorn
    import sys
    sys.path.insert(0, BASE_DIR)
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True, app_dir=BASE_DIR)
