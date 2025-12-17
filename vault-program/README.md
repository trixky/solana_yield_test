# Kyros Vault Program

A Solana smart contract implementing a vault mechanism with IOU (share) tokens, two-step withdrawals, and simulated yield generation.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Deployment](#deployment)
- [Usage](#usage)
- [Testing](#testing)
- [Frontend Integration](#frontend-integration)
- [Program ID](#program-id)

---

## Overview

The Kyros Vault is a DeFi primitive that allows users to:

1. **Deposit** tokens and receive IOU shares representing their stake
2. **Request Withdrawal** - initiate a two-step withdrawal process
3. **Claim Withdrawal** - receive tokens after the epoch delay
4. **Earn Yield** - share value increases when the vault authority adds rewards

### Key Features

| Feature | Description |
|---------|-------------|
| **IOU Token** | SPL token automatically created representing vault shares |
| **Two-Step Withdrawal** | Request →V Wait for epoch → Claim (prevents bank runs) |
| **Dynamic Rate** | Exchange rate between tokens and shares updates with rewards |
| **Epoch System** | Time-based epochs control when withdrawals can be claimed |
| **Admin Controls** | Authority can add rewards and advance epochs |

---

## Architecture

### Project Structure

```
vault-program/
├── programs/vault-program/src/
│   ├── lib.rs                 # Main entry point + instruction logic
│   ├── constants.rs           # RATE_PRECISION, INITIAL_RATE
│   ├── errors.rs              # VaultError enum
│   ├── utils.rs               # Helper functions
│   ├── state/                 # Account structures
│   │   ├── vault.rs           # Vault account
│   │   └── withdrawal_request.rs
│   └── instructions/          # Instruction contexts
│       ├── initialize.rs
│       ├── deposit.rs
│       ├── request_withdrawal.rs
│       ├── claim_withdrawal.rs
│       ├── increase_rate.rs
│       └── advance_epoch.rs
├── tests/
│   └── vault-program.ts       # Integration tests
├── scripts/
│   └── initialize-vault.ts    # Deployment helper script
└── Anchor.toml
```

### Account Structure

#### Vault (PDA)
```
Seeds: ["vault", authority, deposit_token_mint]
```

| Field | Type | Description |
|-------|------|-------------|
| `authority` | Pubkey | Admin who can manage the vault |
| `deposit_token_mint` | Pubkey | Token users deposit (e.g., USDC) |
| `iou_token_mint` | Pubkey | Auto-created share token |
| `vault_token_account` | Pubkey | Holds deposited tokens |
| `total_deposits` | u64 | Total tokens in vault |
| `total_shares` | u64 | Total IOU shares issued |
| `rate` | u64 | Exchange rate (scaled by 1e9) |
| `current_epoch` | u64 | Current epoch number |
| `epoch_duration` | i64 | Seconds per epoch |

#### WithdrawalRequest (PDA)
```
Seeds: ["withdrawal", vault, user]
```

| Field | Type | Description |
|-------|------|-------------|
| `user` | Pubkey | User who requested |
| `shares_amount` | u64 | Shares being withdrawn |
| `tokens_to_receive` | u64 | Tokens to receive (locked at request time) |
| `claimable_epoch` | u64 | Epoch when claim is allowed |
| `claimed` | bool | Whether claimed |

### Instructions

| Instruction | Access | Description |
|-------------|--------|-------------|
| `initialize` | Authority | Create vault + IOU token mint |
| `deposit` | Anyone | Deposit tokens → receive IOU shares |
| `request_withdrawal` | Anyone | Burn shares → create withdrawal request |
| `claim_withdrawal` | Anyone | Claim tokens after epoch passes |
| `increase_rate` | Authority | Add rewards to increase share value |
| `advance_epoch` | Anyone | Advance epoch (if time elapsed) |
| `force_advance_epoch` | Authority | Force advance epoch (testing) |

---

## Installation

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (0.30+)
- [Node.js](https://nodejs.org/) (18+)
- [Yarn](https://yarnpkg.com/) or npm

### Setup

```bash
# Clone the repository
cd vault-program

# Install dependencies
yarn install

# Build the program
anchor build
```

---

## Deployment

### Devnet

```bash
# 1. Configure Solana CLI for devnet
solana config set --url devnet

# 2. Check your wallet
solana address
solana balance

# 3. Airdrop SOL if needed
solana airdrop 2

# 4. Build the program
anchor build

# 5. Deploy to devnet
anchor deploy --provider.cluster devnet

# 6. Initialize the vault (edit scripts/initialize-vault.ts first)
yarn init-vault
```

### Mainnet

```bash
# 1. Configure Solana CLI for mainnet
solana config set --url mainnet-beta

# 2. Ensure you have enough SOL for deployment (~3 SOL)
solana balance

# 3. Build with mainnet features
anchor build

# 4. Deploy to mainnet
anchor deploy --provider.cluster mainnet

# 5. Initialize the vault
# ⚠️ IMPORTANT: Update DEPOSIT_TOKEN_MINT in scripts/initialize-vault.ts
#    to the mainnet token address (e.g., USDC mainnet)
yarn init-vault
```

### Post-Deployment

After `initialize`, the script will output:

```
📋 Copy these values to your frontend config.ts:

export const CONFIG = {
  VAULT_ADDRESS: 'xxx...',
  DEPOSIT_TOKEN_MINT: 'xxx...',
  VAULT_AUTHORITY: 'xxx...',
  TOKEN_DECIMALS: 6,
  PROGRAM_ID: 'D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx',
};
```

---

## Usage

### Rate Calculation

The exchange rate determines how many tokens each share is worth:

```
rate = (total_deposits * RATE_PRECISION) / total_shares
```

Where `RATE_PRECISION = 1,000,000,000` (1e9)

**Example:**
- Initial: 1 share = 1 token (rate = 1e9)
- After 10% rewards: 1 share = 1.1 tokens (rate = 1.1e9)

### Deposit Flow

```
User deposits 100 USDC
├── Rate: 1.0 (1 share = 1 USDC)
├── Shares minted: 100 / 1.0 = 100 IOU
└── User receives: 100 IOU tokens
```

### Withdrawal Flow

```
Step 1: Request Withdrawal
├── User burns 50 IOU shares
├── Rate: 1.1 (1 share = 1.1 USDC)
├── Tokens to receive: 50 × 1.1 = 55 USDC (locked)
└── Claimable at: epoch 1 (current epoch + 1)

Step 2: Claim Withdrawal (after epoch advances)
├── Current epoch ≥ claimable epoch
└── User receives: 55 USDC
```

### Yield Generation

The authority can simulate yield by calling `increase_rate`:

```
Before:
├── Total deposits: 1000 USDC
├── Total shares: 1000 IOU
└── Rate: 1.0

Authority adds 100 USDC rewards:

After:
├── Total deposits: 1100 USDC
├── Total shares: 1000 IOU (unchanged)
└── Rate: 1.1 (+10%)
```

---

## Testing

### Run All Tests

```bash
# Start local validator and run tests
anchor test

# Or run tests on devnet
anchor test --provider.cluster devnet
```

### Test Coverage

The test suite covers:

- ✅ Vault initialization
- ✅ Single and multiple deposits
- ✅ Rate calculations
- ✅ Withdrawal request and claim flow
- ✅ Epoch advancement
- ✅ Rate increase (yield simulation)
- ✅ Error cases (insufficient funds, unauthorized, etc.)
- ✅ Edge cases (zero amounts, overflow protection)

### Running Specific Tests

```bash
# Run with verbose output
anchor test -- --grep "should deposit"
```

---

## Frontend Integration

### IDL

After building, the IDL is available at:
```
target/idl/vault_program.json
```

Copy this to your frontend project.

### TypeScript Types

Generated types are available at:
```
target/types/vault_program.ts
```

### Example: Connect to Vault

```typescript
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from './idl/vault_program.json';

const PROGRAM_ID = new PublicKey('D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx');

// Derive vault PDA
const [vaultPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('vault'),
    authority.toBuffer(),
    depositTokenMint.toBuffer(),
  ],
  PROGRAM_ID
);

// Fetch vault data
const vault = await program.account.vault.fetch(vaultPDA);
console.log('Total deposits:', vault.totalDeposits.toString());
console.log('Rate:', vault.rate.toNumber() / 1e9);
```

### Example: Deposit

```typescript
await program.methods
  .deposit(new BN(amount))
  .accounts({
    user: wallet.publicKey,
    vault: vaultPDA,
    userTokenAccount,
    userIouAccount,
    vaultTokenAccount: vault.vaultTokenAccount,
    depositTokenMint: vault.depositTokenMint,
    iouTokenMint: vault.iouTokenMint,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Frontend App

A complete React frontend is available in the `../client` folder:

```bash
cd ../client
npm install
npm run dev
```

Features:
- Wallet connection (Phantom, Solflare)
- Deposit tokens
- Request/Claim withdrawals
- Admin panel (increase rate, advance epoch)

---

## Program ID

| Network | Program ID |
|---------|------------|
| Devnet | `D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx` |
| Mainnet | `D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx` |

---

## Security Considerations

1. **Authority Control**: Only the vault authority can add rewards and force advance epochs
2. **Overflow Protection**: All math operations use checked arithmetic
3. **PDA Security**: All accounts are PDAs with proper seed validation
4. **Withdrawal Lock**: Two-step withdrawal prevents bank runs
5. **Rate Lock**: Withdrawal amount is locked at request time (no rate manipulation)

---

## License

ISC

---

## Contributing

Built for Kyros Technical Test.

