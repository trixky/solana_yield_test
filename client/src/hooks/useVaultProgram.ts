import { useMemo, useCallback } from 'react';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import toast from 'react-hot-toast';

import idl from '../idl/vault_program.json';

// Program ID from the IDL
const PROGRAM_ID = new PublicKey('D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx');

// Rate precision constant
const RATE_PRECISION = 1_000_000_000;

export interface VaultData {
  authority: PublicKey;
  depositTokenMint: PublicKey;
  iouTokenMint: PublicKey;
  vaultTokenAccount: PublicKey;
  totalDeposits: BN;
  totalShares: BN;
  rate: BN;
  currentEpoch: BN;
  epochDuration: BN;
  lastEpochTimestamp: BN;
  bump: number;
  iouMintBump: number;
}

export interface WithdrawalRequestData {
  user: PublicKey;
  vault: PublicKey;
  sharesAmount: BN;
  tokensToReceive: BN;
  requestEpoch: BN;
  claimableEpoch: BN;
  claimed: boolean;
  bump: number;
}

export function useVaultProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }
    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(idl as any, provider);
  }, [provider]);

  // Derive vault PDA
  const getVaultPDA = (authority: PublicKey, depositTokenMint: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), authority.toBuffer(), depositTokenMint.toBuffer()],
      PROGRAM_ID
    );
  };

  // Derive IOU token mint PDA
  const getIouMintPDA = (vault: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), vault.toBuffer()],
      PROGRAM_ID
    );
  };

  // Derive withdrawal request PDA
  const getWithdrawalRequestPDA = (vault: PublicKey, user: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('withdrawal'), vault.toBuffer(), user.toBuffer()],
      PROGRAM_ID
    );
  };

  // Fetch vault data
  const fetchVault = useCallback(async (vaultAddress: PublicKey): Promise<VaultData | null> => {
    if (!program) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vault = await (program.account as any).vault.fetch(vaultAddress);
      return vault as VaultData;
    } catch {
      return null;
    }
  }, [program]);

  // Fetch withdrawal request
  const fetchWithdrawalRequest = useCallback(async (
    vault: PublicKey,
    user: PublicKey
  ): Promise<WithdrawalRequestData | null> => {
    if (!program) return null;
    try {
      const [withdrawalRequestPDA] = getWithdrawalRequestPDA(vault, user);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const request = await (program.account as any).withdrawalRequest.fetch(withdrawalRequestPDA);
      return request as WithdrawalRequestData;
    } catch {
      return null;
    }
  }, [program]);

  // Initialize vault
  const initialize = async (
    depositTokenMint: PublicKey,
    epochDuration: number
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const [vaultPDA] = getVaultPDA(wallet.publicKey, depositTokenMint);
      const [iouMintPDA] = getIouMintPDA(vaultPDA);
      const vaultTokenAccount = await getAssociatedTokenAddress(
        depositTokenMint,
        vaultPDA,
        true
      );

      // @ts-expect-error - Anchor types are too deep for TypeScript
      const tx = await program.methods
        .initialize(new BN(epochDuration))
        .accounts({
          authority: wallet.publicKey,
          depositTokenMint,
          vault: vaultPDA,
          iouTokenMint: iouMintPDA,
          vaultTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      toast.success('Vault initialized successfully!');
      return tx;
    } catch (error) {
      console.error('Initialize error:', error);
      toast.error(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Deposit
  const deposit = async (
    vaultAddress: PublicKey,
    amount: number,
    decimals: number
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const vault = await fetchVault(vaultAddress);
      if (!vault) {
        toast.error('Vault not found');
        return null;
      }

      const userTokenAccount = await getAssociatedTokenAddress(
        vault.depositTokenMint,
        wallet.publicKey
      );
      const userIouAccount = await getAssociatedTokenAddress(
        vault.iouTokenMint,
        wallet.publicKey
      );

      // Check if user has the token account with sufficient balance
      try {
        const tokenAccountInfo = await getAccount(connection, userTokenAccount);
        const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        if (tokenAccountInfo.amount < amountInSmallestUnit) {
          toast.error(`Insufficient balance. You have ${Number(tokenAccountInfo.amount) / Math.pow(10, decimals)} tokens.`);
          return null;
        }
      } catch {
        toast.error(
          'You don\'t have any deposit tokens. Please get some USDC Devnet tokens first.\n' +
          'You can use a faucet like spl-token-faucet.com or ask someone to send you some.'
        );
        return null;
      }

      const amountBN = new BN(amount * Math.pow(10, decimals));

      const tx = await program.methods
        .deposit(amountBN)
        .accounts({
          user: wallet.publicKey,
          vault: vaultAddress,
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

      toast.success('Deposit successful!');
      return tx;
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error(`Failed to deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Request withdrawal
  const requestWithdrawal = async (
    vaultAddress: PublicKey,
    sharesAmount: number,
    decimals: number
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const vault = await fetchVault(vaultAddress);
      if (!vault) {
        toast.error('Vault not found');
        return null;
      }

      const [withdrawalRequestPDA] = getWithdrawalRequestPDA(vaultAddress, wallet.publicKey);
      const userIouAccount = await getAssociatedTokenAddress(
        vault.iouTokenMint,
        wallet.publicKey
      );

      const sharesAmountBN = new BN(sharesAmount * Math.pow(10, decimals));

      const tx = await program.methods
        .requestWithdrawal(sharesAmountBN)
        .accounts({
          user: wallet.publicKey,
          vault: vaultAddress,
          withdrawalRequest: withdrawalRequestPDA,
          userIouAccount,
          iouTokenMint: vault.iouTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success('Withdrawal requested! Wait for next epoch to claim.');
      return tx;
    } catch (error) {
      console.error('Request withdrawal error:', error);
      toast.error(`Failed to request withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Claim withdrawal
  const claimWithdrawal = async (vaultAddress: PublicKey): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const vault = await fetchVault(vaultAddress);
      if (!vault) {
        toast.error('Vault not found');
        return null;
      }

      const [withdrawalRequestPDA] = getWithdrawalRequestPDA(vaultAddress, wallet.publicKey);
      const userTokenAccount = await getAssociatedTokenAddress(
        vault.depositTokenMint,
        wallet.publicKey
      );

      const tx = await program.methods
        .claimWithdrawal()
        .accounts({
          user: wallet.publicKey,
          vault: vaultAddress,
          withdrawalRequest: withdrawalRequestPDA,
          userTokenAccount,
          vaultTokenAccount: vault.vaultTokenAccount,
          depositTokenMint: vault.depositTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      toast.success('Withdrawal claimed successfully!');
      return tx;
    } catch (error) {
      console.error('Claim withdrawal error:', error);
      toast.error(`Failed to claim withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Increase rate (admin only)
  const increaseRate = async (
    vaultAddress: PublicKey,
    additionalTokens: number,
    decimals: number
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const vault = await fetchVault(vaultAddress);
      if (!vault) {
        toast.error('Vault not found');
        return null;
      }

      const authorityTokenAccount = await getAssociatedTokenAddress(
        vault.depositTokenMint,
        wallet.publicKey
      );

      const additionalTokensBN = new BN(additionalTokens * Math.pow(10, decimals));

      const tx = await program.methods
        .increaseRate(additionalTokensBN)
        .accounts({
          authority: wallet.publicKey,
          vault: vaultAddress,
          authorityTokenAccount,
          vaultTokenAccount: vault.vaultTokenAccount,
          depositTokenMint: vault.depositTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      toast.success('Rate increased successfully!');
      return tx;
    } catch (error) {
      console.error('Increase rate error:', error);
      toast.error(`Failed to increase rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Advance epoch (anyone can call if time has elapsed)
  const advanceEpoch = async (vaultAddress: PublicKey): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const tx = await program.methods
        .advanceEpoch()
        .accounts({
          vault: vaultAddress,
        })
        .rpc();

      toast.success('Epoch advanced successfully!');
      return tx;
    } catch (error) {
      console.error('Advance epoch error:', error);
      toast.error(`Failed to advance epoch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Force advance epoch (admin only)
  const forceAdvanceEpoch = async (vaultAddress: PublicKey): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const tx = await program.methods
        .forceAdvanceEpoch()
        .accounts({
          authority: wallet.publicKey,
          vault: vaultAddress,
        })
        .rpc();

      toast.success('Epoch advanced successfully!');
      return tx;
    } catch (error) {
      console.error('Force advance epoch error:', error);
      toast.error(`Failed to advance epoch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Format rate for display
  const formatRate = (rate: BN): string => {
    const rateNum = rate.toNumber() / RATE_PRECISION;
    return rateNum.toFixed(6);
  };

  return {
    program,
    provider,
    getVaultPDA,
    getIouMintPDA,
    getWithdrawalRequestPDA,
    fetchVault,
    fetchWithdrawalRequest,
    initialize,
    deposit,
    requestWithdrawal,
    claimWithdrawal,
    increaseRate,
    advanceEpoch,
    forceAdvanceEpoch,
    formatRate,
    PROGRAM_ID,
    RATE_PRECISION,
  };
}


