@echo off
title SignLens Desktop App
cd /d "%~dp0src-tauri\target\release"
start "" "signlens.exe"
