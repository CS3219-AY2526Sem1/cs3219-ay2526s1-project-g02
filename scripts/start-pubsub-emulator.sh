#!/bin/bash
# Start Google Cloud Pub/Sub Emulator for local development
# Run this before starting backend services locally

echo "Starting Pub/Sub emulator on localhost:8085..."
echo "Note: This requires 'gcloud beta emulators pubsub' to be installed"
echo "Press Ctrl+C to stop the emulator"
echo ""

gcloud beta emulators pubsub start --host-port=localhost:8085
