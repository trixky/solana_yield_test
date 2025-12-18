import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair, 
  Connection,
  clusterApiUrl 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// Load IDL
const idlPath = path.join(__dirname, "../target/idl/vault_program.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

// Program ID
const PROGRAM_ID = new PublicKey("D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx");

// ============================================
// CONFIGURATION - MODIFIEZ CES VALEURS
// ============================================

// Token de dépôt (USDC Devnet ou votre token custom)
const DEPOSIT_TOKEN_MINT = new PublicKey(
  "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" // USDC Devnet
  // Ou mettez l'adresse de votre token custom
);

// Durée d'une epoch en secondes (60 = 1 minute)
const EPOCH_DURATION = 60;

// ============================================

async function main() {
  console.log("🚀 Initializing Kyros Vault on Devnet...\n");

  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Load wallet from default Solana CLI location
  const walletPath = process.env.HOME + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );
  
  console.log("📍 Authority (your wallet):", walletKeypair.publicKey.toBase58());
  console.log("📍 Deposit Token Mint:", DEPOSIT_TOKEN_MINT.toBase58());
  console.log("📍 Epoch Duration:", EPOCH_DURATION, "seconds\n");

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("💰 Wallet balance:", balance / 1e9, "SOL");
  
  if (balance < 0.1 * 1e9) {
    console.log("⚠️  Low balance! Run: solana airdrop 2");
    return;
  }

  // Setup Anchor
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new Program(idl, provider);

  // Derive PDAs
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      walletKeypair.publicKey.toBuffer(),
      DEPOSIT_TOKEN_MINT.toBuffer(),
    ],
    PROGRAM_ID
  );

  const [iouMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultPDA.toBuffer()],
    PROGRAM_ID
  );

  const vaultTokenAccount = await getAssociatedTokenAddress(
    DEPOSIT_TOKEN_MINT,
    vaultPDA,
    true // allowOwnerOffCurve for PDA
  );

  console.log("📦 Derived addresses:");
  console.log("   Vault PDA:", vaultPDA.toBase58());
  console.log("   IOU Token Mint:", iouMintPDA.toBase58());
  console.log("   Vault Token Account:", vaultTokenAccount.toBase58());
  console.log("");

  // Check if vault already exists
  const vaultAccount = await connection.getAccountInfo(vaultPDA);
  if (vaultAccount) {
    console.log("✅ Vault already initialized!");
    console.log("\n📋 Use these values in your frontend config.ts:");
    console.log(`
export const CONFIG = {
  VAULT_ADDRESS: '${vaultPDA.toBase58()}',
  DEPOSIT_TOKEN_MINT: '${DEPOSIT_TOKEN_MINT.toBase58()}',
  VAULT_AUTHORITY: '${walletKeypair.publicKey.toBase58()}',
  TOKEN_DECIMALS: 6, // USDC = 6, custom token = 9
  PROGRAM_ID: '${PROGRAM_ID.toBase58()}',
};
`);
    return;
  }

  // Initialize vault
  console.log("⏳ Initializing vault...");
  
  try {
    const tx = await program.methods
      .initialize(new anchor.BN(EPOCH_DURATION))
      .accounts({
        authority: walletKeypair.publicKey,
        depositTokenMint: DEPOSIT_TOKEN_MINT,
        vault: vaultPDA,
        iouTokenMint: iouMintPDA,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Vault initialized successfully!");
    console.log("📝 Transaction:", tx);
    console.log(`🔗 https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    console.log("📋 Copy these values to your frontend config.ts:");
    console.log(`
export const CONFIG = {
  VAULT_ADDRESS: '${vaultPDA.toBase58()}',
  DEPOSIT_TOKEN_MINT: '${DEPOSIT_TOKEN_MINT.toBase58()}',
  VAULT_AUTHORITY: '${walletKeypair.publicKey.toBase58()}',
  TOKEN_DECIMALS: 6, // USDC = 6, custom token = 9
  PROGRAM_ID: '${PROGRAM_ID.toBase58()}',
};
`);

  } catch (error) {
    console.error("❌ Error initializing vault:", error);
  }
}

main().catch(console.error);





