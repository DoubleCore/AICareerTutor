<div align="center">

# AI Career Tutor — Product Engineering Fork

**Career Guidance · Mobile Product · FastAPI**

![Fork](https://img.shields.io/badge/Repository-Fork-6E7781?style=flat-square&logo=github)
![Expo](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)

A fork-based development workspace for exploring an AI-native career guidance product.

</div>

## Repository Context

This repository is a **fork of [`y-ii-ii/AICareerTutor`](https://github.com/y-ii-ii/AICareerTutor)**. The upstream project and original product concept belong to its original author and contributors.

I use this fork as a product-engineering workspace for studying how to turn an AI product idea into a runnable mobile + backend loop.

## Current P0 Scope

The current repository contains a runnable P0 skeleton with:

- an Expo-based mobile application;
- a FastAPI backend;
- development/mock data;
- a fixed development user for early iteration;
- OpenAPI / Swagger documentation;
- a unified error response format.

## Run the Mobile App

```powershell
cd apps/mobile
npm install
npm run start
```

Use Expo Go or the web preview during development.

## Run the API

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Useful local endpoints:

```text
Swagger UI   http://localhost:8000/docs
Health       http://localhost:8000/health
```

## Product Questions Being Explored

- How should an AI career assistant turn vague career uncertainty into structured actions?
- How should interview analysis, planning, and follow-up live in one product flow?
- What is the minimum backend contract required to validate the mobile experience?
- Which interactions should be deterministic product logic and which should be delegated to an LLM?

## Status

`Fork-based Development` · `P0 Prototype` · `Mobile + API`

This repository is part of my AI product training portfolio, but it is **not presented as an original codebase**.

## Upstream

Canonical source: [`y-ii-ii/AICareerTutor`](https://github.com/y-ii-ii/AICareerTutor)
