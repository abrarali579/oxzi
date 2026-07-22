# OXZI — Project Overview

## Product Definition

OXZI is an AI Project Architect and long-term context system. A user describes a project in normal language, pastes a detailed master prompt, or imports existing documents. OXZI extracts all available requirements, identifies only critical gaps, asks a minimal adaptive interview, and generates an AI-ready Project Bible.

## Target Users

- Founders planning software, websites, automation systems, content products, or internal tools
- Solo builders using Codex, Cursor, Claude Code, or similar coding agents
- Agencies that repeatedly create project briefs and technical specifications
- Teams that need persistent architecture, visual direction, and progress memory

## Core Problem

Long-running AI-assisted projects lose decisions, repeat questions, drift from architecture, and produce inconsistent visual or technical results. Existing project briefs are often static, incomplete, and disconnected from implementation progress.

## Core Solution

OXZI maintains one structured project truth and renders it into six living files that coding agents read before working. The system updates project context as decisions and implementation progress change.

## Primary User Flow

1. User creates a project.
2. User enters a quick idea, master prompt, or imported material.
3. OXZI extracts known facts, constraints, preferences, assumptions, and uncertainties.
4. OXZI calculates critical completeness.
5. OXZI skips the interview or asks only high-impact missing questions.
6. User reviews the interpreted project summary and assumptions.
7. OXZI generates the six living files.
8. User approves, edits, or exports the package.
9. A coding agent reads the files and implements one scoped unit at a time.
10. Progress, decisions, and architecture changes remain synchronized.

## MVP Capabilities

### Project Intake

- Quick idea input
- Master Prompt input
- Existing text/document import
- Project-type detection
- Requirement and constraint extraction

### Minimal Discovery

- Completeness scoring
- Duplicate-question prevention
- Criticality-based question ranking
- Suggested answers and selectable chips
- Interview skip logic
- Maximum question budget

### Project Bible

- Generate six living files
- Review extracted understanding
- Show assumptions and unresolved decisions
- Edit and regenerate outputs
- Version structured project state

### Export

- Markdown folder
- ZIP package
- Codex/Cursor-ready context
- Obsidian-compatible folder

### Provider Architecture

- Cloud AI provider abstraction
- User API key support later
- Local OpenAI-compatible endpoint support

## Explicitly Out of Scope for Initial MVP

- Autonomous full-project coding
- Direct Figma generation
- Real-time multiplayer collaboration
- Billing and subscription enforcement
- Direct GitHub repository creation
- Automatic deployment
- Continuous code-versus-spec auditing

## Success Criteria

1. A complete master prompt can generate a usable Project Bible with zero interview questions.
2. A short project idea can reach a usable Project Bible with no more than five typical questions.
3. OXZI never asks for a fact clearly present in the source input.
4. Generated files contain no unresolved placeholders when the project is marked approved.
5. A fresh coding agent can read the package and correctly identify project goal, stack, current phase, next task, and protected decisions.
6. The same canonical project state can regenerate all six files consistently.

## Validation Projects

### Oxzire 3D Website

Validates visual direction, responsive design, motion, 3D assets, localization, CMS requirements, video portfolio behavior, performance, and accessibility.

### News Website Automation Systems in 2026

Validates complex integrations, ingestion pipelines, AI transformation, editorial review, fact-checking, scheduling, publishing, retries, monitoring, and failure recovery.
