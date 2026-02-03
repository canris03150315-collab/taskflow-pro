#!/bin/bash

echo "=== Restarting Cloudflare Tunnel ==="
echo ""

echo "Step 1: Stopping old cloudflared process..."
pkill cloudflared
sleep 2

echo "Step 2: Starting new tunnel with HTTPS and --no-tls-verify..."
nohup cloudflared tunnel --url https://localhost:3000 --no-tls-verify --no-autoupdate > /root/cloudflared.log 2>&1 &

sleep 3

echo ""
echo "Step 3: Checking if tunnel is running..."
ps aux | grep cloudflared | grep -v grep

echo ""
echo "Step 4: Getting new tunnel URL..."
sleep 2
cat /root/cloudflared.log | grep 'https://.*trycloudflare.com' | tail -1

echo ""
echo "=== Tunnel Restart Complete ==="
