# ExternAI: Technical Documentation & Architecture

ExternAI is a modern, AI-native Integrated Development Environment (IDE) built for the next generation of software development. This document provides a deep dive into its architecture, technology stack, rationale for tool choices, and roadmap for future improvements.

---

## 🏗 Architecture Overview

ExternAI follows a **decoupled client-server architecture** to ensure security, scalability, and performance.

### 1. Frontend (The IDE Client)
- **Framework**: Electron + React + Vite.
- **Responsibility**: Provides the user interface, file exploration, terminal emulation, and code editing capabilities.
- **Native Integration**: Uses `electron` APIs to interact with the local file system and `node-pty` for high-performance terminal operations.

### 2. Backend (The Secure Proxy)
- **Framework**: Node.js + Express.
- **Responsibility**: Acts as a secure intermediary between the client and third-party APIs (Claude, Firebase, PayFast).
- **Security**: Protects sensitive API keys and enforces usage limits (e.g., prompt caps) that cannot be bypassed by client-side modifications.

### 3. AI Engine
- **Provider**: Anthropic (Claude 3.5 Sonnet / Haiku).
- **Role**: Powers the AI assistant, code generation, and project planning capabilities.

---

## 🛠 Technology Stack & Rationale

| Tool | Usage | Rationale | Advantages |
| :--- | :--- | :--- | :--- |
| **Electron** | Desktop Shell | Industry standard for cross-platform desktop apps (VS Code, Discord). | Cross-platform compatibility (macOS/Win/Linux) with a single codebase. |
| **Vite** | Build Tool | Modern, extremely fast build tool for frontend assets. | Near-instant Hot Module Replacement (HMR) and optimized production builds. |
| **React** | UI Library | Declarative UI management with a rich ecosystem of components. | High performance through the Virtual DOM and massive community support. |
| **Node.js/Express** | Backend | High-performance, event-driven runtime. | Shares the same language as the frontend (JavaScript), simplifying development. |
| **Firebase** | Auth/Database | Real-time backend-as-a-service. | Handled authentication and real-time data sync with zero infrastructure management. |
| **node-pty** | Terminal | Native terminal fork for Electron. | Provides a "real" terminal experience with support for interactive commands and colored output. |
| **GitHub Actions** | CI/CD | Automated build and release pipeline. | Builds and releases installers for Windows, Mac, and Linux automatically on every version tag. |

---

## 🚀 Build & Distribution Pipeline

### The Challenge of Native Modules
ExternAI uses `node-pty`, which is a **native C++ module**. These modules must be "rebuilt" for every specific Operating System and Node version.
- **Local Building**: Works great for the OS you are currently using (e.g., Mac).
- **Cross-Platform Building**: Building a Windows `.exe` from a Mac is extremely difficult because you cannot easily compile Windows C++ code on a Mac.

### The Solution: GitHub Actions
We use an automated `release.yml` workflow:
1. **Triggers**: On every new version tag (e.g., `v1.0.2`).
2. **Strategy**: Spins up three separate virtual machines (macOS, Ubuntu, Windows).
3. **Action**: Each machine builds the version of ExternAI meant for its own OS, ensuring all native modules (like the terminal) are compiled perfectly.
4. **Outcome**: Automatically creates a GitHub Release and attaches the `.dmg`, `.exe`, and `.AppImage` files.

---

## ✅ Advantages of the Current Approach

1. **Security-First**: By proxying AI requests through a backend, we keep API keys safe and prevent users from "stealing" unlimited free prompts by tampering with the frontend.
2. **Developer Velocity**: Using Vite ensures that development is fast and the app feels snappy.
3. **Professional Distribution**: The automated pipeline ensures that users on any OS get a version that "just works" without installation errors.
4. **Monetization Ready**: Integrated with PayFast (Sandbox) to allow for premium upgrades directly in the flow.

---

## 📈 Potential Improvements

### 1. Performance
- **Monaco Customization**: Further tune the Monaco Editor (the heart of VS Code) for even better performance with extremely large files.
- **Bundle Optimization**: Use dynamic imports for larger components (like the AI Assistant) to decrease initial load time.

### 2. Features
- **Remote SSH**: Allow the terminal to connect to remote servers.
- **Plugin System**: Create an API for users to build their own ExternAI extensions.
- **Offline AI**: Integration with local LLMs (like Ollama) for developers who cannot share code with the cloud.

### 3. Build System
- **Code Signing**: Currently, the app is "unsigned". Signing the app with an Apple Developer or Microsoft certificate would remove the "Untrusted Developer" warnings that users see upon first launch.
- **Delta Updates**: Implement differential updates so users only download the *changes* in an update rather than the entire 100MB installer.
