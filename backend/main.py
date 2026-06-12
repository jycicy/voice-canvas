from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.commands import router as commands_router
from routers.generate import router as generate_router

app = FastAPI(title="Voice Canvas API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commands_router)
app.include_router(generate_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "voice-canvas"}
