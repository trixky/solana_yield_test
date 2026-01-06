# Kyros Vault - Technical Challenge

🌐 **Live Demo:** [https://kyros.bitmoon.studio/](https://kyros.bitmoon.studio/)

---

A full-stack DeFi application featuring a Solana vault program with IOU tokens and a modern React frontend.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Running Locally](#running-locally)
- [Deployed Addresses](#deployed-addresses)
- [Transaction Examples](#transaction-examples)
- [Architecture](#architecture)
- [Open Questions](#open-questions)

---

## Overview

This project implements a vault mechanism on Solana with the following features:

| Feature | Description |
|---------|-------------|
| **Deposit** | Users deposit tokens and receive IOU shares representing their stake |
| **Two-Step Withdrawal** | Step 1: Request withdrawal → Step 2: Claim at next epoch |
| **Increase Rate** | Simulates vault accruing rewards, increasing IOU value |
| **Epoch System** | Time-based epochs control when withdrawals can be claimed |

---

## Project Structure

```text
kyros_technical_test/
├── vault-program/          # Solana smart contract (Anchor)
│   ├── programs/
│   │   └── vault-program/
│   │       └── src/
│   │           ├── lib.rs
│   │           ├── instructions/
│   │           └── state/
│   ├── scripts/
│   │   └── initialize-vault.ts
│   ├── tests/
│   │   └── vault-program.ts
│   └── Anchor.toml
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── idl/
│   │   └── config.ts
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Yarn** | 1.22+ | `npm install -g yarn` |
| **Rust** | 1.70+ | [rustup.rs](https://rustup.rs/) |
| **Solana CLI** | 1.18+ | [docs.solana.com](https://docs.solana.com/cli/install-solana-cli-tools) |
| **Anchor** | 0.30+ | [anchor-lang.com](https://www.anchor-lang.com/docs/installation) |

### Running Locally

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd kyros_technical_test
```

#### 2. Start the Vault Program (Solana)

```bash
# Navigate to vault program
cd vault-program

# Install dependencies
yarn install

# Build the program
anchor build

# Run tests (starts local validator automatically)
anchor test
```

#### 3. Start the Frontend

```bash
# Navigate to client folder
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at **http://localhost:5173**

#### 4. Connect Your Wallet

1. Install [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/) wallet extension
2. Switch to **Devnet** network in your wallet settings
3. Get Devnet SOL: `solana airdrop 2 <your-wallet-address> --url devnet`
4. Connect your wallet to the dApp

---

## Deployed Addresses

| Resource | Address |
|----------|---------|
| **Program ID** | `D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx` |
| **Vault PDA** | `FHihEf49WmvseqA5rH4xsVmcf5tQc4bN8axk2NGmwrSE` |
| **Deposit Token (USDC Devnet)** | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| **IOU Token Mint** | `61H6FDhpq22N1VPSbPb6EsZimmoM17tGtwEfw4pGP9vx` |
| **Vault Authority** | `B6eTFMeTZuoYAzfis1nmnFVepd9uYSiCz8EfhZnt94VM` |

**Network:** Solana Devnet

---

## Transaction Examples

All transactions are on **Devnet**. Click the links to view on Solana Explorer.

### Vault Initialization

| Transaction | Link |
|-------------|------|
| Initialize Vault | [5VyPG3B9c7h6v6zqhbexmUQx9Wg9GpL97Sovx1Y4FVnefQ82xs1KRRpuRb5AyYnVjVPPmWy6Zps1hLXT7viyUjsv](https://explorer.solana.com/tx/5VyPG3B9c7h6v6zqhbexmUQx9Wg9GpL97Sovx1Y4FVnefQ82xs1KRRpuRb5AyYnVjVPPmWy6Zps1hLXT7viyUjsv?cluster=devnet) |

### Core Operations

| Operation | Transaction Signature | Explorer Link |
|-----------|----------------------|---------------|
| **Deposit** | `4HDREsVJxtTL9bUEmbiA2XvyM6GhazKVY6KTazwZg2ubgVv5nvUpAA6E1ZVsHJyFsqZH4D78eF5Z9dTMPVvPcszS` | [View on Explorer](https://explorer.solana.com/tx/4HDREsVJxtTL9bUEmbiA2XvyM6GhazKVY6KTazwZg2ubgVv5nvUpAA6E1ZVsHJyFsqZH4D78eF5Z9dTMPVvPcszS?cluster=devnet) |
| **Increase Rate** | `3PznoyrJJ4ewKqe7dUiZzxhTeBdhKkL9rFMbY5B5CbQmmsG99K8rRt2jSanPdh4k7nVddmFhhAqPr3LwTRqrGCPW` | [View on Explorer](https://explorer.solana.com/tx/3PznoyrJJ4ewKqe7dUiZzxhTeBdhKkL9rFMbY5B5CbQmmsG99K8rRt2jSanPdh4k7nVddmFhhAqPr3LwTRqrGCPW?cluster=devnet) |
| **Request Withdrawal** | `2Wt1rED4nnyhj9aWqHB5pkPiPFvLz9h14B9LaGMY9bv5YdwpsXsErmCeecbfykJygsXbNdHYftnr5RSMRJGa3kqM` | [View on Explorer](https://explorer.solana.com/tx/2Wt1rED4nnyhj9aWqHB5pkPiPFvLz9h14B9LaGMY9bv5YdwpsXsErmCeecbfykJygsXbNdHYftnr5RSMRJGa3kqM?cluster=devnet) |
| **Claim Withdrawal** | `2gvodqFGQbcQq18eAsot22JRTKV91bQEJRiMCbQcxbotocnSpB9CAhBcyM5QEFmBWx8kGPuWqTTNjMvtsF38meu2` | [View on Explorer](https://explorer.solana.com/tx/2gvodqFGQbcQq18eAsot22JRTKV91bQEJRiMCbQcxbotocnSpB9CAhBcyM5QEFmBWx8kGPuWqTTNjMvtsF38meu2?cluster=devnet) |

---

## Architecture

### Vault Mechanism

```text
┌─────────────────────────────────────────────────────────────┐
│                        KYROS VAULT                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   User Deposits Token  ──────►  Receives IOU Shares         │
│                                                             │
│   Rate = Total Deposits / Total Shares                      │
│                                                             │
│   Authority adds rewards  ──►  Rate increases               │
│   (increase_rate)             (IOU worth more)              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    TWO-STEP WITHDRAWAL                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Step 1: request_withdrawal                                │
│   ├── User burns IOU shares                                 │
│   ├── Tokens to receive locked at current rate              │
│   └── Creates WithdrawalRequest (claimable next epoch)      │
│                                                             │
│   Step 2: claim_withdrawal (after epoch advances)           │
│   ├── Verify current_epoch >= claimable_epoch               │
│   └── Transfer tokens to user                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Rate Calculation

```text
rate = (total_deposits × RATE_PRECISION) / total_shares

RATE_PRECISION = 1,000,000,000 (1e9)
```

**Example:**
- Initial: 1 share = 1 token (rate = 1e9)
- After 10% rewards: 1 share = 1.1 tokens (rate = 1.1e9)

### Account Structure

| Account | Seeds | Purpose |
|---------|-------|---------|
| **Vault** | `["vault", authority, deposit_mint]` | Stores vault state and config |
| **WithdrawalRequest** | `["withdrawal", vault, user]` | Tracks pending withdrawals |

---

## Open Questions

### AI Usage in This Challenge

**Tools used:**

Cursor

### Can AI fully vibe code new features without much supervision from a dev?

No

### What limitations do you see to vibe coding?

Vibe coding is incredibly powerful, especially for repetitive tasks. However, I believe it requires three key practices to be effective:

1. **Modular code architecture** — Split different modules/parts of the code to reduce interconnections and complexity. AI can quickly generate unnecessarily complex code with many dependencies if not properly guided. Clean separation of concerns helps the AI produce cleaner, more maintainable code.

2. **Thoughtful prompting** — Think ahead about all positive and negative scenarios, potential edge cases, security flaws, etc. A good prompt for a medium-sized feature should take at least 2-3 minutes to write. Rushing prompts leads to incomplete implementations that require multiple back-and-forth iterations.

3. **Systematic code review** — Always review everything the AI generates. Never blindly trust generated code. This includes checking for security vulnerabilities, performance issues, and ensuring the code follows project conventions.
