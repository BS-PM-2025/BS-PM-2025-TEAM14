#!/bin/bash

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Message
echo "AI Service is ready for use by the main FastAPI application!"
echo "The AI service runs automatically when the FastAPI backend starts." 