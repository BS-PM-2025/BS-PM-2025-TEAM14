#!/bin/bash

echo "Stopping FastAPI Backend..."
pkill -f "uvicorn main:app"

echo "Stopping React Frontend..."
pkill -f "npm start"

echo "All processes stopped."
