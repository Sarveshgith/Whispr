# Whispr

An AI-powered Git companion that automatically generates clear, conventional commit messages from your staged changes using Google Gemini.

## Features

✅ **Smart Commit Generation** — Creates meaningful, context-aware commit messages
✅ **Interactive Review** — Accept or refine commit suggestions before finalizing
✅ **Lightweight & Fast** — Powered by Gemini 2.5 Flash Lite for instant responses
✅ **Secure Key Management** — Stores API keys locally in `~/.whispr/config.json`
✅ **Git-Aware Intelligence** — Detects repository state and staged changes
✅ **Custom Context Support** — Enhance commit suggestions with additional notes

## Installation

```bash
npm install -g whispr
```

## Quick Start

```bash
whispr set api-key YOUR_GEMINI_API_KEY

git add .
whispr
```
