#!/bin/bash
# Start the Bika AI backend server
# Run the detector separately: python -m detector.detector

set -e
cd "$(dirname "$0")"

echo "Starting Bika AI backend on http://127.0.0.1:8000"
echo "Review page: http://127.0.0.1:8000"
echo ""
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
