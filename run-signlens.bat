@echo off
title SignLens Live Prototype
cd /d "%~dp0"
echo Starting SignLens on http://localhost:5173/ ...
start "" "http://localhost:5173/"
call pnpm preview --port 5173
