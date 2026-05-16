# CodeGuard 🛡️

**Automated Security Audit Tool** | Built with IBM Bob for the IBM Bob Hackathon

## What it does
CodeGuard analyzes GitHub repositories for security vulnerabilities including:
- 🔑 Hardcoded secrets and API keys
- 💉 SQL injection risks
- 🔓 Missing authentication middleware
- 🌐 Exposed routes
- ✅ Missing input validation

## Built with IBM Bob
CodeGuard was designed and built using IBM Bob as the core AI development partner. See the `bob_sessions/` folder for all task session reports.

## Quick Start
```bash
git clone https://github.com/Ninja42kzt/codeguard
cd codeguard
npm install
cp .env.example .env
npm start
```
Open http://localhost:3000 and paste any public GitHub repo URL to analyze.

## Tech Stack
- Node.js / Express
- Vanilla HTML/CSS/JS
- simple-git, glob, winston
