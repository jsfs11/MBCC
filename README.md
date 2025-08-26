# Mood-Based Content Curator (MBCC)

A "Daylio × Spotify Wrapped" style application built with React Native mobile frontend and Node.js backend, featuring enterprise-grade tooling and scalable architecture.

## 🏗️ Architecture

This project uses a monorepo structure with Turborepo and pnpm workspaces for optimal development experience and build performance.

```
mbcc/
├── packages/
│   ├── mobile/          # React Native + Expo app
│   └── server/          # Node.js + Express API
├── turbo.json           # Turborepo configuration
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── ARCHITECTURE.md      # Detailed architecture documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Expo CLI (for mobile development)

### Installation

```bash
# Install dependencies for all packages
pnpm install

# Start development servers for all packages
pnpm dev
```

### Package-specific commands

```bash
# Mobile app
cd packages/mobile
pnpm start          # Start Expo development server
pnpm android        # Run on Android
pnpm ios            # Run on iOS
pnpm web            # Run on web

# Server
cd packages/server
pnpm dev            # Start development server with hot reload
pnpm build          # Build for production
pnpm start          # Start production server
```

## 🧪 Testing & Quality

```bash
# Run all tests
pnpm test

# Run linting (strict mode - max warnings = 0)
pnpm lint

# Build all packages
pnpm build
```

## 📱 Mobile Package

- **Framework**: React Native 0.74 + Expo SDK 51
- **Language**: TypeScript (strict mode)
- **Testing**: Jest with 100% coverage requirement
- **Linting**: ESLint with strict configuration

## 🖥️ Server Package

- **Runtime**: Node.js 20
- **Framework**: Express
- **ML**: Hugging Face Transformers.js for sentiment analysis
- **Language**: TypeScript (strict mode)
- **Testing**: Jest with 100% coverage requirement

## 🔧 Development Workflow

1. **Code Quality**: All code must pass TypeScript strict checks and ESLint with zero warnings
2. **Testing**: 100% test coverage required for all packages
3. **Build Pipeline**: Turborepo handles optimized builds with caching
4. **Monorepo**: Shared tooling and dependencies across packages

## 📚 Documentation

- [Architecture Overview](./ARCHITECTURE.md) - Detailed system architecture and design decisions
- [Mobile Package](./packages/mobile/) - React Native app documentation
- [Server Package](./packages/server/) - Node.js API documentation

## 🛠️ Tech Stack

### Frontend (Mobile)

- React Native 0.74
- Expo SDK 51
- TypeScript 5.4
- Jest + React Native Testing Library

### Backend (Server)

- Node.js 20
- Express 4.19
- Hugging Face Transformers.js
- TypeScript 5.4
- Jest + Supertest

### DevOps & Tooling

- Turborepo (monorepo management)
- pnpm (package management)
- ESLint (code quality)
- Prettier (code formatting)
- TypeScript (type safety)

## 📄 License

This project is private and proprietary.# Mood-Based-Content-Curator
