#!/bin/bash

echo "Stopping FastAPI Backend..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    taskkill //F //IM "python.exe" //T 2> NUL
else
    # macOS/Linux
    backend_pid=$(ps aux | grep "uvicorn main:app" | grep -v grep | awk '{print $2}')
    if [ -n "$backend_pid" ]; then
        kill "$backend_pid"
        echo "FastAPI Backend stopped."
    else
        echo "FastAPI Backend not running."
    fi
fi

echo "Stopping React Frontend..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    taskkill //F //IM "node.exe" //T 2> NUL
else
    # macOS/Linux
    frontend_pid=$(ps aux | grep "npm start" | grep -v grep | awk '{print $2}')
    if [ -n "$frontend_pid" ]; then
        kill "$frontend_pid"
        echo "React Frontend stopped."
    else
        echo "React Frontend not running."
    fi
fi

echo "All processes checked and stopped if running."
