#!/bin/bash
echo "🛑 Stopping Next.js app and worker..."
pkill -f "next" || true
pkill -f "fetch-patients" || true  
pkill -f "ts-node" || true
pkill -f "concurrently" || true
echo "✅ All processes stopped"