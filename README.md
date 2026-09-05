# NDIS Progress Report Generator

This project is a web app for turning allied health session notes into structured NDIS progress report drafts with evidence-backed claims. It is designed for clinicians and portfolio reviewers who want a faster drafting workflow without sacrificing traceability.

Demo link: https://youtu.be/EF_Z82xH-WE

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

## Development Tooling: Lavish Editor Skill

This repo uses the Claude Code `lavish` skill (see `.claude/skills/lavish/SKILL.md`) to render rich HTML review artifacts - plans, comparisons, diagrams - during development. That skill works by shelling out to the `lavish-axi` CLI via `npx -y lavish-axi`, which by default pulls the latest published package from npm and runs a small local review server.

This project points at a security-hardened fork instead: https://github.com/joey-ict-fullstackdev/lavish-axi. The fork changes three defaults in the upstream tool that otherwise widen its exposure beyond "runs on localhost for one person": Tailscale network auto-exposure and telemetry are now opt-in rather than opt-out, and the local review server refuses to open anything but an `.html`/`.htm` file (upstream accepted any path). `skills-lock.json` records this fork as the skill's source.

To install the fork so `npx -y lavish-axi` resolves to it instead of the public package:

1. Clone the fork somewhere outside this repo (use a native filesystem path - on WSL, a Windows drive under `/mnt/c` or `/mnt/d`, not a path under `/tmp`, since npm's install scripts don't handle WSL's UNC paths):
   ```
   git clone https://github.com/joey-ict-fullstackdev/lavish-axi.git
   ```
2. Build it and link it globally:
   ```
   cd lavish-axi
   npm install
   npm link
   ```
3. Verify it resolved to the fork instead of the registry:
   ```
   npx -y lavish-axi --version
   ```

This is a machine-wide `npm link`, not a project dependency - it affects every project on the machine that invokes `lavish-axi`, and only needs to be done once per machine. It has no effect on the app itself; it is purely a development-time tool for the AI-assisted workflow described in CLAUDE.md.
