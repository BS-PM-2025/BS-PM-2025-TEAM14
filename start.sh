#!/bin/bash

echo "Starting FastAPI Backend..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

echo "Starting React Frontend..."
cd ../frontend
npm start &
