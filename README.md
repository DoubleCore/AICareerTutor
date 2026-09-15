<div align="center">

# AI Career Tutor

### Zhaopin Hackathon Project

**AI Career Guidance · Interview Analysis · Action Planning**

![Hackathon](https://img.shields.io/badge/Project-Zhaopin%20Hackathon-2563EB?style=flat-square)
![Expo](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)

An AI-powered career assistant prototype developed in the context of the **Zhaopin Hackathon**, exploring how AI can turn career uncertainty into structured analysis and actionable next steps.

</div>

## Hackathon Context

This project was used as a hackathon product workspace focused on the career and recruitment domain.

The core challenge was to explore how an AI-native product could help users move from vague career questions to concrete decisions and actions.

### Focus Areas

- career direction analysis;
- interview analysis and feedback;
- structured action planning;
- mobile-first AI product experience;
- rapid product iteration under hackathon constraints.

## Product Loop

```text
Career Question
      |
      v
User Context / Input
      |
      v
AI Analysis
      |
      +----> Interview Feedback
      |
      +----> Career Suggestions
      |
      v
Action Plan
      |
      v
Follow-up / Iteration
```

## Current P0 Scope

The repository contains a runnable P0 skeleton with:

- an Expo-based mobile application;
- a FastAPI backend;
- development and mock data;
- a fixed development user for early iteration;
- OpenAPI / Swagger documentation;
- a unified error response format.

## Technology Stack

| Layer | Stack |
| --- | --- |
| Mobile | Expo, TypeScript |
| API | FastAPI, Python |
| Interface | REST / OpenAPI |
| Product Focus | AI career guidance, interview analysis, action planning |

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

## What This Project Trains

This project is part of my **Professional AI Player** training portfolio and focuses on:

- understanding an unfamiliar business domain quickly;
- converting a hackathon brief into a product hypothesis;
- designing an AI-native user flow;
- connecting mobile interfaces with backend contracts;
- building and validating a runnable prototype under time constraints.

## Repository Context

This repository is a **fork of [`y-ii-ii/AICareerTutor`](https://github.com/y-ii-ii/AICareerTutor)**. The upstream project and original codebase belong to its original author and contributors.

This fork is used as a hackathon and product-engineering workspace. The competition context and my local development work should not be interpreted as authorship of the upstream codebase.

## Status

`Zhaopin Hackathon` · `P0 Prototype` · `Mobile + API` · `AI Product Engineering`

## Upstream

Canonical source: [`y-ii-ii/AICareerTutor`](https://github.com/y-ii-ii/AICareerTutor)
