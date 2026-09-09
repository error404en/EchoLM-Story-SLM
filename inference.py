import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
from dataclasses import dataclass, asdict
from tokenizers import Tokenizer

# -----------------------------------------------------------------------------
# 1. Configuration Setup
# -----------------------------------------------------------------------------
# Look for the run_info.json and latest.pt pointer in the checkpoints directory
if not os.path.exists("run_info.json"):
    print("ERROR: Could not find 'run_info.json'. Make sure you extracted the Kaggle ZIP here!")
    exit(1)

with open("run_info.json", "r") as f:
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

# -----------------------------------------------------------------------------
# 2. Model Architecture Definition (Same as Kaggle)
# -----------------------------------------------------------------------------
class CausalSelfAttention(nn.Module):
    def __init__(self, cfg: Config):
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
        y = F.scaled_dot_product_attention(q, k, v, dropout_p=self.dropout if self.training else 0.0, is_causal=True)
        return self.resid_dropout(self.c_proj(y.transpose(1, 2).contiguous().view(B, T, C)))

class MLP(nn.Module):
    def __init__(self, cfg: Config):
        super().__init__()
        self.c_fc = nn.Linear(cfg.n_embd, 4 * cfg.n_embd, bias=cfg.bias)
        self.gelu = nn.GELU()
        self.c_proj = nn.Linear(4 * cfg.n_embd, cfg.n_embd, bias=cfg.bias)
        self.dropout = nn.Dropout(cfg.dropout)
    def forward(self, x): return self.dropout(self.c_proj(self.gelu(self.c_fc(x))))

class Block(nn.Module):
    def __init__(self, cfg: Config):
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
    def __init__(self, cfg: Config):
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
        x = self.ln_f(x)
        logits = self.head(x)
        return logits
        
    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=0.8, top_p=0.9):
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
        return idx

# -----------------------------------------------------------------------------
# 3. Load Weights & Tokenizer
# -----------------------------------------------------------------------------
print("Loading tokenizer...")
tokenizer = Tokenizer.from_file("tokenizer/tokenizer.json")

print("Initializing model...")
model = GPT(cfg)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("Locating latest checkpoint...")
latest_ptr = torch.load("checkpoints/latest.pt", map_location="cpu")
actual_ckpt_path = os.path.join("checkpoints", os.path.basename(latest_ptr["points_to"]))

print(f"Loading weights from {actual_ckpt_path}...")
checkpoint = torch.load(actual_ckpt_path, map_location="cpu")
model.load_state_dict(checkpoint["model_state"])
model = model.to(DEVICE)
print(f"Model successfully loaded on {DEVICE}!\n")

# -----------------------------------------------------------------------------
# 4. Inference
# -----------------------------------------------------------------------------
prompt = "Once upon a time, there was a brave mouse named"
print(f"Prompt: '{prompt}'\nGenerating...\n")

ids = tokenizer.encode(prompt).ids
x = torch.tensor([ids], dtype=torch.long, device=DEVICE)

out = model.generate(x, max_new_tokens=150, temperature=0.8, top_p=0.9)
generated_text = tokenizer.decode(out[0].tolist())

print("-" * 50)
print(generated_text)
print("-" * 50)
