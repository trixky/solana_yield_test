`anchor deploy --provider.cluster devnet    `

```bash
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: /home/trixky2/.config/solana/id.json
Deploying program "vault_program"...
Program path: /home/trixky2/Documents/kyros_technical_test/vault-program/target/deploy/vault_program.so...
Program Id: D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx

Signature: 5ZukxyL8DN3LNdm8yETdiGN1rYnn69JnPDbZazHBECmHxtyDBLz81LDtRhGZP2d4kxckc17WgvsMwpdWKNsHVQyy

Waiting for program D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx to be confirmed...
Program confirmed on-chain
Idl data length: 2141 bytes
Step 0/2141 
Step 600/2141 
Step 1200/2141 
Step 1800/2141 
Idl account created: 44QuM27Zd1a6oQ5VoPCKBVAzddG37cHMWKSkoLAA46YM
Deploy success
```

`yarn init-vault`

```bash
🚀 Initializing Kyros Vault on Devnet...

📍 Authority (your wallet): B6eTFMeTZuoYAzfis1nmnFVepd9uYSiCz8EfhZnt94VM
📍 Deposit Token Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
📍 Epoch Duration: 60 seconds

(node:84872) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
💰 Wallet balance: 2.00578216 SOL
📦 Derived addresses:
   Vault PDA: 8EUYJ3UPPEniLABedRQFAg7jRRqwPrt9qGaNKQZeRyJK
   IOU Token Mint: 2ggKUpV2iorBwzQdNMF3rh8XAYe9586UPJGgG6qLy1fW
   Vault Token Account: DLTtqK8x2eX1X8R38bPJ9XJ7muC76mHAwM57AJ9bZ2oo

⏳ Initializing vault...
✅ Vault initialized successfully!
📝 Transaction: 2WAE4eCfegM3esnMbuGfA43UbJJQVvfo66HRJYptgLGNr5hWNt2DEoyRYspxTv1gMkGuz9SpiUFgx13r6dFLi2EY
🔗 https://explorer.solana.com/tx/2WAE4eCfegM3esnMbuGfA43UbJJQVvfo66HRJYptgLGNr5hWNt2DEoyRYspxTv1gMkGuz9SpiUFgx13r6dFLi2EY?cluster=devnet

📋 Copy these values to your frontend config.ts:

export const CONFIG = {
  VAULT_ADDRESS: '8EUYJ3UPPEniLABedRQFAg7jRRqwPrt9qGaNKQZeRyJK',
  DEPOSIT_TOKEN_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  VAULT_AUTHORITY: 'B6eTFMeTZuoYAzfis1nmnFVepd9uYSiCz8EfhZnt94VM',
  TOKEN_DECIMALS: 6, // USDC = 6, custom token = 9
  PROGRAM_ID: 'D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx',
};
```

```bash
🚀 Initializing Kyros Vault on Devnet...

📍 Authority (your wallet): B6eTFMeTZuoYAzfis1nmnFVepd9uYSiCz8EfhZnt94VM
📍 Deposit Token Mint: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
📍 Epoch Duration: 60 seconds

(node:95023) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
💰 Wallet balance: 1.99804156 SOL
📦 Derived addresses:
   Vault PDA: FHihEf49WmvseqA5rH4xsVmcf5tQc4bN8axk2NGmwrSE
   IOU Token Mint: 61H6FDhpq22N1VPSbPb6EsZimmoM17tGtwEfw4pGP9vx
   Vault Token Account: HujCEJZragMSeVKebv9D54DToA96mhM5N34ZDzaoEesD

⏳ Initializing vault...
✅ Vault initialized successfully!
📝 Transaction: 5VyPG3B9c7h6v6zqhbexmUQx9Wg9GpL97Sovx1Y4FVnefQ82xs1KRRpuRb5AyYnVjVPPmWy6Zps1hLXT7viyUjsv
🔗 https://explorer.solana.com/tx/5VyPG3B9c7h6v6zqhbexmUQx9Wg9GpL97Sovx1Y4FVnefQ82xs1KRRpuRb5AyYnVjVPPmWy6Zps1hLXT7viyUjsv?cluster=devnet

📋 Copy these values to your frontend config.ts:

export const CONFIG = {
  VAULT_ADDRESS: 'FHihEf49WmvseqA5rH4xsVmcf5tQc4bN8axk2NGmwrSE',
  DEPOSIT_TOKEN_MINT: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  VAULT_AUTHORITY: 'B6eTFMeTZuoYAzfis1nmnFVepd9uYSiCz8EfhZnt94VM',
  TOKEN_DECIMALS: 6, // USDC = 6, custom token = 9
  PROGRAM_ID: 'D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx',
};
```