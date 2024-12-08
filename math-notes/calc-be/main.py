from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from apps.calculator.route import router as calculator_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

# Initialize the FastAPI app
app = FastAPI(lifespan=lifespan)

# Middleware for handling CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ai-notepad.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint to confirm the server is running
@app.get('/')
async def root():
    return {"message": "Server is running"}

# Include routes
app.include_router(calculator_router, tags=["calculate"])

if __name__ == "__main__":
    # Get the PORT from environment variables (required for Render)
    port = int(os.getenv("PORT", 8000))  # Default to 8000 if not set
    # Run the app with Uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=os.getenv("ENV") == "dev")
