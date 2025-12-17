import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultProgram } from "../target/types/vault_program";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { expect } from "chai";

describe("vault-program", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultProgram as Program<VaultProgram>;
  const authority = provider.wallet;

  // Test accounts
  let depositTokenMint: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let iouTokenMint: anchor.web3.PublicKey;
  let iouMintBump: number;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let authorityTokenAccount: anchor.web3.PublicKey;
  let authorityIouAccount: anchor.web3.PublicKey;

  // Second user for testing
  const user2 = anchor.web3.Keypair.generate();
  let user2TokenAccount: anchor.web3.PublicKey;
  let user2IouAccount: anchor.web3.PublicKey;

  // Third user (unauthorized) for security tests
  const unauthorizedUser = anchor.web3.Keypair.generate();
  let unauthorizedUserTokenAccount: anchor.web3.PublicKey;

  const RATE_PRECISION = 1_000_000_000;
  const EPOCH_DURATION = 1; // 1 second for testing

  before(async () => {
    // Airdrop SOL to user2 and unauthorizedUser
    const airdropSig1 = await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    const airdropSig2 = await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig1);
    await provider.connection.confirmTransaction(airdropSig2);

    // Create deposit token mint
    depositTokenMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      6 // 6 decimals like USDC
    );

    console.log("Deposit Token Mint:", depositTokenMint.toBase58());

    // Derive vault PDA
    [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        authority.publicKey.toBuffer(),
        depositTokenMint.toBuffer(),
      ],
      program.programId
    );

    console.log("Vault PDA:", vaultPda.toBase58());

    // Derive IOU mint PDA
    [iouTokenMint, iouMintBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultPda.toBuffer()],
      program.programId
    );

    console.log("IOU Token Mint:", iouTokenMint.toBase58());

    // Get vault token account address
    vaultTokenAccount = await getAssociatedTokenAddress(
      depositTokenMint,
      vaultPda,
      true
    );

    // Create authority's token account
    authorityTokenAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      depositTokenMint,
      authority.publicKey
    );

    // Mint tokens to authority
    await mintTo(
      provider.connection,
      (authority as any).payer,
      depositTokenMint,
      authorityTokenAccount,
      authority.publicKey,
      10_000_000_000 // 10,000 tokens (with 6 decimals)
    );

    // Create user2's token account
    user2TokenAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      depositTokenMint,
      user2.publicKey
    );

    // Mint tokens to user2
    await mintTo(
      provider.connection,
      (authority as any).payer,
      depositTokenMint,
      user2TokenAccount,
      authority.publicKey,
      5_000_000_000 // 5,000 tokens
    );

    // Create unauthorized user's token account
    unauthorizedUserTokenAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      depositTokenMint,
      unauthorizedUser.publicKey
    );

    // Mint tokens to unauthorized user
    await mintTo(
      provider.connection,
      (authority as any).payer,
      depositTokenMint,
      unauthorizedUserTokenAccount,
      authority.publicKey,
      1_000_000_000 // 1,000 tokens
    );

    // Get IOU token account addresses
    authorityIouAccount = await getAssociatedTokenAddress(
      iouTokenMint,
      authority.publicKey
    );

    user2IouAccount = await getAssociatedTokenAddress(
      iouTokenMint,
      user2.publicKey
    );
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("Initializes the vault", async () => {
      const tx = await program.methods
        .initialize(new anchor.BN(EPOCH_DURATION))
        .accounts({
          authority: authority.publicKey,
          depositTokenMint: depositTokenMint,
          vault: vaultPda,
          iouTokenMint: iouTokenMint,
          vaultTokenAccount: vaultTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();

      console.log("Initialize tx:", tx);

      // Verify vault state
      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.authority.toBase58()).to.equal(authority.publicKey.toBase58());
      expect(vault.depositTokenMint.toBase58()).to.equal(depositTokenMint.toBase58());
      expect(vault.iouTokenMint.toBase58()).to.equal(iouTokenMint.toBase58());
      expect(vault.totalDeposits.toNumber()).to.equal(0);
      expect(vault.totalShares.toNumber()).to.equal(0);
      expect(vault.rate.toNumber()).to.equal(RATE_PRECISION);
      expect(vault.currentEpoch.toNumber()).to.equal(0);
    });
  });

  // ============================================================================
  // DEPOSIT TESTS
  // ============================================================================

  describe("Deposits", () => {
    it("Deposits tokens and receives IOU shares", async () => {
      const depositAmount = 1_000_000_000; // 1,000 tokens

      const initialBalance = await getAccount(
        provider.connection,
        authorityTokenAccount
      );

      const tx = await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          user: authority.publicKey,
          vault: vaultPda,
          userTokenAccount: authorityTokenAccount,
          userIouAccount: authorityIouAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          iouTokenMint: iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Deposit tx:", tx);

      // Verify balances
      const finalTokenBalance = await getAccount(
        provider.connection,
        authorityTokenAccount
      );
      const iouBalance = await getAccount(
        provider.connection,
        authorityIouAccount
      );
      const vaultBalance = await getAccount(
        provider.connection,
        vaultTokenAccount
      );

      expect(Number(finalTokenBalance.amount)).to.equal(
        Number(initialBalance.amount) - depositAmount
      );
      expect(Number(iouBalance.amount)).to.equal(depositAmount); // 1:1 initially
      expect(Number(vaultBalance.amount)).to.equal(depositAmount);

      // Verify vault state
      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.totalDeposits.toNumber()).to.equal(depositAmount);
      expect(vault.totalShares.toNumber()).to.equal(depositAmount);
    });

    it("Second user deposits tokens", async () => {
      const depositAmount = 500_000_000; // 500 tokens

      const tx = await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          user: user2.publicKey,
          vault: vaultPda,
          userTokenAccount: user2TokenAccount,
          userIouAccount: user2IouAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          iouTokenMint: iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([user2])
        .rpc();

      console.log("User2 deposit tx:", tx);

      const iouBalance = await getAccount(provider.connection, user2IouAccount);
      expect(Number(iouBalance.amount)).to.equal(depositAmount);

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.totalDeposits.toNumber()).to.equal(1_500_000_000);
      expect(vault.totalShares.toNumber()).to.equal(1_500_000_000);
    });

    it("Fails to deposit zero amount", async () => {
      try {
        await program.methods
          .deposit(new anchor.BN(0))
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            userTokenAccount: authorityTokenAccount,
            userIouAccount: authorityIouAccount,
            vaultTokenAccount: vaultTokenAccount,
            depositTokenMint: depositTokenMint,
            iouTokenMint: iouTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidAmount");
      }
    });
  });

  // ============================================================================
  // INCREASE RATE TESTS
  // ============================================================================

  describe("Increase Rate", () => {
    it("Increases rate (simulates rewards)", async () => {
      const rewardAmount = 150_000_000; // 150 tokens reward (10% yield)

      const vaultBefore = await program.account.vault.fetch(vaultPda);

      const tx = await program.methods
        .increaseRate(new anchor.BN(rewardAmount))
        .accounts({
          authority: authority.publicKey,
          vault: vaultPda,
          authorityTokenAccount: authorityTokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      console.log("Increase rate tx:", tx);

      const vaultAfter = await program.account.vault.fetch(vaultPda);

      // Total deposits should increase
      expect(vaultAfter.totalDeposits.toNumber()).to.equal(
        vaultBefore.totalDeposits.toNumber() + rewardAmount
      );

      // Rate should increase (new_rate = total_deposits * PRECISION / total_shares)
      // = 1,650,000,000 * 1e9 / 1,500,000,000 = 1.1e9
      const expectedRate = Math.floor(
        (vaultAfter.totalDeposits.toNumber() * RATE_PRECISION) /
          vaultAfter.totalShares.toNumber()
      );
      expect(vaultAfter.rate.toNumber()).to.equal(expectedRate);

      console.log("New rate:", vaultAfter.rate.toNumber());
      console.log(
        "1 share now equals:",
        vaultAfter.rate.toNumber() / RATE_PRECISION,
        "tokens"
      );
    });

    it("Fails increase_rate with zero amount", async () => {
      try {
        await program.methods
          .increaseRate(new anchor.BN(0))
          .accounts({
            authority: authority.publicKey,
            vault: vaultPda,
            authorityTokenAccount: authorityTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            depositTokenMint: depositTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as any)
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidAmount");
      }
    });

    it("Fails increase_rate from unauthorized user", async () => {
      const unauthorizedIouAccount = await getAssociatedTokenAddress(
        iouTokenMint,
        unauthorizedUser.publicKey
      );

      try {
        await program.methods
          .increaseRate(new anchor.BN(100_000_000))
          .accounts({
            authority: unauthorizedUser.publicKey,
            vault: vaultPda,
            authorityTokenAccount: unauthorizedUserTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            depositTokenMint: depositTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as any)
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });
  });

  // ============================================================================
  // WITHDRAWAL REQUEST TESTS
  // ============================================================================

  describe("Withdrawal Requests", () => {
    it("Requests withdrawal", async () => {
      const sharesToWithdraw = 500_000_000; // 500 shares

      const vault = await program.account.vault.fetch(vaultPda);
      const expectedTokens = Math.floor(
        (sharesToWithdraw * vault.rate.toNumber()) / RATE_PRECISION
      );

      // Derive withdrawal request PDA
      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      const tx = await program.methods
        .requestWithdrawal(new anchor.BN(sharesToWithdraw))
        .accounts({
          user: authority.publicKey,
          vault: vaultPda,
          withdrawalRequest: withdrawalRequestPda,
          userIouAccount: authorityIouAccount,
          iouTokenMint: iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Request withdrawal tx:", tx);

      // Verify withdrawal request
      const withdrawalRequest = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      expect(withdrawalRequest.user.toBase58()).to.equal(
        authority.publicKey.toBase58()
      );
      expect(withdrawalRequest.sharesAmount.toNumber()).to.equal(sharesToWithdraw);
      expect(withdrawalRequest.tokensToReceive.toNumber()).to.equal(expectedTokens);
      expect(withdrawalRequest.claimableEpoch.toNumber()).to.equal(1);
      expect(withdrawalRequest.claimed).to.be.false;

      console.log("Tokens to receive:", expectedTokens);

      // Verify IOU tokens were burned
      const iouBalance = await getAccount(
        provider.connection,
        authorityIouAccount
      );
      expect(Number(iouBalance.amount)).to.equal(1_000_000_000 - sharesToWithdraw);

      // Verify total_shares was decremented
      const vaultAfter = await program.account.vault.fetch(vaultPda);
      expect(vaultAfter.totalShares.toNumber()).to.equal(
        vault.totalShares.toNumber() - sharesToWithdraw
      );
    });

    it("Fails to request withdrawal with zero amount", async () => {
      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          user2.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .requestWithdrawal(new anchor.BN(0))
          .accounts({
            user: user2.publicKey,
            vault: vaultPda,
            withdrawalRequest: withdrawalRequestPda,
            userIouAccount: user2IouAccount,
            iouTokenMint: iouTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([user2])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidAmount");
      }
    });

    it("Fails to request another withdrawal while one is pending (SECURITY)", async () => {
      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        // Try to request another withdrawal while one is pending
        await program.methods
          .requestWithdrawal(new anchor.BN(100_000_000))
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            withdrawalRequest: withdrawalRequestPda,
            userIouAccount: authorityIouAccount,
            iouTokenMint: iouTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .rpc();
        expect.fail("Should have thrown error - pending withdrawal exists");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("PendingWithdrawalExists");
      }
    });
  });

  // ============================================================================
  // CLAIM TESTS
  // ============================================================================

  describe("Claiming", () => {
    it("Cannot claim before epoch advances", async () => {
      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .claimWithdrawal()
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            withdrawalRequest: withdrawalRequestPda,
            userTokenAccount: authorityTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            depositTokenMint: depositTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as any)
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("EpochNotReached");
      }
    });

    it("Force advances epoch (admin function)", async () => {
      const tx = await program.methods
        .forceAdvanceEpoch()
        .accounts({
          authority: authority.publicKey,
          vault: vaultPda,
        } as any)
        .rpc();

      console.log("Force advance epoch tx:", tx);

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.currentEpoch.toNumber()).to.equal(1);
    });

    it("Fails force_advance_epoch from unauthorized user", async () => {
      try {
        await program.methods
          .forceAdvanceEpoch()
          .accounts({
            authority: unauthorizedUser.publicKey,
            vault: vaultPda,
          } as any)
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Claims withdrawal after epoch", async () => {
      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      const withdrawalRequest = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      const tokensToReceive = withdrawalRequest.tokensToReceive.toNumber();

      const initialBalance = await getAccount(
        provider.connection,
        authorityTokenAccount
      );

      const tx = await program.methods
        .claimWithdrawal()
        .accounts({
          user: authority.publicKey,
          vault: vaultPda,
          withdrawalRequest: withdrawalRequestPda,
          userTokenAccount: authorityTokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      console.log("Claim withdrawal tx:", tx);

      // Verify tokens received
      const finalBalance = await getAccount(
        provider.connection,
        authorityTokenAccount
      );
      expect(Number(finalBalance.amount)).to.equal(
        Number(initialBalance.amount) + tokensToReceive
      );

      // Verify request marked as claimed
      const withdrawalRequestAfter = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      expect(withdrawalRequestAfter.claimed).to.be.true;

      console.log("Received tokens:", tokensToReceive);
    });

    it("Cannot claim again", async () => {
      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .claimWithdrawal()
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            withdrawalRequest: withdrawalRequestPda,
            userTokenAccount: authorityTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            depositTokenMint: depositTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as any)
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("AlreadyClaimed");
      }
    });
  });

  // ============================================================================
  // POST-CLAIM TESTS - New withdrawal after claiming
  // ============================================================================

  describe("Post-Claim Scenarios", () => {
    it("Can request new withdrawal after claiming previous one", async () => {
      // User should be able to request a new withdrawal after claiming the previous one
      const remainingShares = 500_000_000; // 500 shares remaining
      
      const iouBalanceBefore = await getAccount(
        provider.connection,
        authorityIouAccount
      );
      
      const sharesToWithdraw = Math.min(100_000_000, Number(iouBalanceBefore.amount)); // 100 shares

      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      const tx = await program.methods
        .requestWithdrawal(new anchor.BN(sharesToWithdraw))
        .accounts({
          user: authority.publicKey,
          vault: vaultPda,
          withdrawalRequest: withdrawalRequestPda,
          userIouAccount: authorityIouAccount,
          iouTokenMint: iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("New withdrawal request after claim tx:", tx);

      const withdrawalRequest = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      expect(withdrawalRequest.sharesAmount.toNumber()).to.equal(sharesToWithdraw);
      expect(withdrawalRequest.claimed).to.be.false;

      // Verify IOU tokens were burned
      const iouBalanceAfter = await getAccount(
        provider.connection,
        authorityIouAccount
      );
      expect(Number(iouBalanceAfter.amount)).to.equal(
        Number(iouBalanceBefore.amount) - sharesToWithdraw
      );
    });

    it("Advance epoch and claim second withdrawal", async () => {
      // Advance epoch
      await program.methods
        .forceAdvanceEpoch()
        .accounts({
          authority: authority.publicKey,
          vault: vaultPda,
        } as any)
        .rpc();

      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          authority.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Claim
      await program.methods
        .claimWithdrawal()
        .accounts({
          user: authority.publicKey,
          vault: vaultPda,
          withdrawalRequest: withdrawalRequestPda,
          userTokenAccount: authorityTokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      const withdrawalRequest = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      expect(withdrawalRequest.claimed).to.be.true;
    });
  });

  // ============================================================================
  // USER2 FULL FLOW TEST
  // ============================================================================

  describe("User2 Full Withdrawal Flow", () => {
    it("User2 requests full withdrawal", async () => {
      const iouBalance = await getAccount(provider.connection, user2IouAccount);
      const sharesToWithdraw = Number(iouBalance.amount);

      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          user2.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .requestWithdrawal(new anchor.BN(sharesToWithdraw))
        .accounts({
          user: user2.publicKey,
          vault: vaultPda,
          withdrawalRequest: withdrawalRequestPda,
          userIouAccount: user2IouAccount,
          iouTokenMint: iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([user2])
        .rpc();

      const withdrawalRequest = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      expect(withdrawalRequest.sharesAmount.toNumber()).to.equal(sharesToWithdraw);
    });

    it("User2 claims after epoch advance", async () => {
      // Advance epoch
      await program.methods
        .forceAdvanceEpoch()
        .accounts({
          authority: authority.publicKey,
          vault: vaultPda,
        } as any)
        .rpc();

      const [withdrawalRequestPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"),
          vaultPda.toBuffer(),
          user2.publicKey.toBuffer(),
        ],
        program.programId
      );

      const initialBalance = await getAccount(
        provider.connection,
        user2TokenAccount
      );

      const withdrawalRequest = await program.account.withdrawalRequest.fetch(
        withdrawalRequestPda
      );
      const tokensToReceive = withdrawalRequest.tokensToReceive.toNumber();

      await program.methods
        .claimWithdrawal()
        .accounts({
          user: user2.publicKey,
          vault: vaultPda,
          withdrawalRequest: withdrawalRequestPda,
          userTokenAccount: user2TokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([user2])
        .rpc();

      const finalBalance = await getAccount(
        provider.connection,
        user2TokenAccount
      );
      expect(Number(finalBalance.amount)).to.equal(
        Number(initialBalance.amount) + tokensToReceive
      );

      console.log("User2 received tokens with yield:", tokensToReceive);
      console.log("User2 original deposit was:", 500_000_000);
      console.log("Yield earned:", tokensToReceive - 500_000_000);
    });
  });

  // ============================================================================
  // DEPOSIT AFTER RATE INCREASE
  // ============================================================================

  describe("Deposit After Rate Increase", () => {
    it("New deposit receives fewer shares after rate increase", async () => {
      const depositAmount = 110_000_000; // 110 tokens

      const vaultBefore = await program.account.vault.fetch(vaultPda);
      const expectedShares = Math.floor(
        (depositAmount * RATE_PRECISION) / vaultBefore.rate.toNumber()
      );

      // Use user2 to deposit again (need to mint more tokens first)
      await mintTo(
        provider.connection,
        (authority as any).payer,
        depositTokenMint,
        user2TokenAccount,
        authority.publicKey,
        depositAmount
      );

      // User2's IOU account might be empty after full withdrawal, recreate it
      const tx = await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          user: user2.publicKey,
          vault: vaultPda,
          userTokenAccount: user2TokenAccount,
          userIouAccount: user2IouAccount,
          vaultTokenAccount: vaultTokenAccount,
          depositTokenMint: depositTokenMint,
          iouTokenMint: iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([user2])
        .rpc();

      console.log("Deposit after rate increase tx:", tx);

      const iouBalance = await getAccount(provider.connection, user2IouAccount);
      
      // Should receive fewer shares than tokens deposited (because rate > 1)
      console.log("Deposited tokens:", depositAmount);
      console.log("Received shares:", Number(iouBalance.amount));
      console.log("Expected shares:", expectedShares);
      
      expect(Number(iouBalance.amount)).to.equal(expectedShares);
      expect(expectedShares).to.be.lessThan(depositAmount);
    });
  });

  // ============================================================================
  // FINAL STATE VERIFICATION
  // ============================================================================

  describe("Final State", () => {
    it("Verifies vault state after all operations", async () => {
      const vault = await program.account.vault.fetch(vaultPda);

      console.log("\n=== Final Vault State ===");
      console.log("Total Deposits:", vault.totalDeposits.toNumber());
      console.log("Total Shares:", vault.totalShares.toNumber());
      console.log("Rate:", vault.rate.toNumber());
      console.log("Rate (human):", vault.rate.toNumber() / RATE_PRECISION);
      console.log("Current Epoch:", vault.currentEpoch.toNumber());
      console.log("========================\n");

      // Verify the vault is solvent (has enough tokens for remaining shares)
      const vaultBalance = await getAccount(
        provider.connection,
        vaultTokenAccount
      );
      const expectedTokensNeeded = Math.floor(
        (vault.totalShares.toNumber() * vault.rate.toNumber()) / RATE_PRECISION
      );
      
      console.log("Vault token balance:", Number(vaultBalance.amount));
      console.log("Tokens needed for all shares:", expectedTokensNeeded);
      
      // Vault should have at least as many tokens as needed
      expect(Number(vaultBalance.amount)).to.be.at.least(expectedTokensNeeded);
    });
  });
});
