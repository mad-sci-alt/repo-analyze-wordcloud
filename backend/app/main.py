from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import analyze

app = FastAPI(title="GitHub Word Cloud API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
