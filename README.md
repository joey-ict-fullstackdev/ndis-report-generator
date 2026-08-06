# NDIS Progress Report Generator

This project is a web app for turning allied health session notes into structured NDIS progress report drafts with evidence-backed claims. It is designed for clinicians and portfolio reviewers who want a faster drafting workflow without sacrificing traceability.

## The Traceability Problem

A progress note is a per-session record of what happened in one appointment. A progress report is a cross-session synthesis used for plan reviews and funding decisions. That synthesis step is where hallucination risk is highest, because the model must combine many notes into a single narrative and decide what counts as progress.

Without verification, an AI-generated report can invent progress that is never actually supported by the source notes. This project avoids that failure mode by requiring every generated claim to cite a verbatim quote from a specific session note and by checking that quote before the claim is ever treated as fact.

## How Verification Works

The verification engine in lib/verify.ts compares each cited quote against the referenced note using normalized text matching. It ignores differences in case and whitespace, checks that the quote truly exists in the intended note, and rejects unsupported or mismatched evidence. The result is a deterministic check: no AI is asked to judge another AI's output, and unsupported claims are flagged rather than rendered as fact.

## Quick Start

Prerequisites:

- Node.js 20+ and npm
- An Anthropic API key for generation

1. Install dependencies:
   npm install
2. Create your environment file:
   cp .env.example .env.local

   Then add your Anthropic API key to .env.local.

3. Start the app locally:
   npm run dev

4. Run the checks you will use while developing:
   npm run typecheck
   npm test
5. Build for production or run the eval suite when you are ready:
   npm run build
   npm run eval

## Synthetic Data

All examples, tests, and eval cases use synthetic data only; no real patient information is stored or used.

## Architecture

The broader architecture and project conventions are described in CLAUDE.md. In short, lib/schema.ts defines the report structure, lib/generate.ts handles generation, lib/verify.ts performs evidence validation, and app/api/generate/route.ts wires the flow together for the app.
