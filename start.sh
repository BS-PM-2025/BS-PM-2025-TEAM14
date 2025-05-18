#!/bin/bash

echo "Starting FastAPI Backend..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &

echo "Starting React Frontend..."
cd ../frontend
npm start &
