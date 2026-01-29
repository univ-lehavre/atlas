---
title: Technical Setup
description: Installation and development guide for Talent Finder
scope: technical
tags: [installation, development, setup, nodejs, sveltekit]
---

# Technical Setup

> **Voir aussi** : [Appwrite Setup](appwrite-setup.md) | [Design System](design-system.md)

## Tech Stack

- **Runtime**: Node.js 24
- **Package Manager**: pnpm 10
- **Framework**: SvelteKit with Svelte 5
- **Styling**: Tailwind CSS 4
- **Backend**: Appwrite for authentication
- **Validation**: Zod schemas
- **Testing**: Vitest

## Prerequisites

- Node.js 24+
- pnpm 10+
- An Appwrite instance for authentication (see [Appwrite Setup](appwrite-setup.md))

## Installation

```bash
# Clone the repository
git clone https://github.com/univ-lehavre/talent-finder.git
cd talent-finder

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Appwrite credentials
```

## Development

```bash
# Start the development server
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Tests
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
talent-finder/
├── src/
│   ├── lib/
│   │   ├── server/          # Server-side modules
│   │   │   ├── auth/        # Authentication logic
│   │   │   ├── user/        # User management
│   │   │   ├── git-stats/   # Git repository analysis
│   │   │   ├── github/      # GitHub API integration
│   │   │   ├── http/        # HTTP utilities
│   │   │   └── appwrite/    # Appwrite client
│   │   ├── ui/              # Reusable Svelte components
│   │   ├── validators/      # Client-side validation
│   │   └── constants/       # Shared constants
│   └── routes/
│       ├── api/v1/          # REST API endpoints
│       ├── repository/      # Repository stats page
│       └── login/           # Magic link callback
├── docs/
│   ├── technical-setup.md   # This document
│   ├── design-system.md     # Style guide
│   └── appwrite-setup.md    # Appwrite configuration
└── CLAUDE.md                # AI assistant instructions
```

## REST API

The REST API follows pure REST conventions with JSON responses:

| Endpoint              | Method | Description                      |
| --------------------- | ------ | -------------------------------- |
| `/api/v1/auth/signup` | POST   | Send magic link for registration |
| `/api/v1/auth/login`  | POST   | Validate magic link and session  |
| `/api/v1/auth/logout` | POST   | End session                      |
| `/api/v1/me`          | GET    | Get current user profile         |
| `/api/v1/repository`  | GET    | Get repository statistics        |
| `/api/v1/github`      | GET    | Get GitHub statistics and URLs   |

Full API documentation available at `/api/docs` when the application is running.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Citation

If you use this software in your research, please cite it using the DOI badge from the README.
