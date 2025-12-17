import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import VaultStats from '../components/VaultStats';
import { useVaultProgram, VaultData } from '../hooks/useVaultProgram';
import { CONFIG, isConfigured } from '../config';

export default function Admin() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const {
    fetchVault,
    initialize,
    increaseRate,
    forceAdvanceEpoch,
    formatRate,
    getVaultPDA,
  } = useVaultProgram();

  // States
  const [vaultAddress, setVaultAddress] = useState(CONFIG.VAULT_ADDRESS);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authorityBalance, setAuthorityBalance] = useState<number>(0);

  // Initialize vault form
  const [initDepositTokenMint, setInitDepositTokenMint] = useState('');
  const [initEpochDuration, setInitEpochDuration] = useState('60');

  // Increase rate form
  const [rewardAmount, setRewardAmount] = useState('');

  // Load vault data
  const loadVaultData = useCallback(async () => {
    if (!vaultAddress || !publicKey) return;

    setLoading(true);
    try {
      const vaultPubkey = new PublicKey(vaultAddress);
      const vaultData = await fetchVault(vaultPubkey);
      setVault(vaultData);

      if (vaultData) {
        // Fetch authority token balance
        try {
          const authorityTokenAta = await getAssociatedTokenAddress(
            vaultData.depositTokenMint,
            publicKey
          );
          const tokenAccountInfo = await connection.getTokenAccountBalance(authorityTokenAta);
          setAuthorityBalance(Number(tokenAccountInfo.value.uiAmount || 0));
        } catch {
          setAuthorityBalance(0);
        }
      }
    } catch (error) {
      console.error('Error loading vault:', error);
    }
    setLoading(false);
  }, [vaultAddress, publicKey, fetchVault, connection]);

  useEffect(() => {
    if (vaultAddress && publicKey) {
      loadVaultData();
    }
  }, [vaultAddress, publicKey, loadVaultData]);

  // Handle initialize vault
  const handleInitialize = async () => {
    if (!initDepositTokenMint || !initEpochDuration || !publicKey) return;

    setActionLoading('init');
    try {
      const depositMint = new PublicKey(initDepositTokenMint);
      const tx = await initialize(depositMint, parseInt(initEpochDuration));
      
      if (tx) {
        // Get the new vault address
        const [newVaultPDA] = getVaultPDA(publicKey, depositMint);
        setVaultAddress(newVaultPDA.toBase58());
        await loadVaultData();
      }
    } catch (error) {
      console.error('Initialize error:', error);
    }
    setActionLoading(null);
  };

  // Handle increase rate
  const handleIncreaseRate = async () => {
    if (!vault || !rewardAmount) return;

    setActionLoading('rate');
    const vaultPubkey = new PublicKey(vaultAddress);
    await increaseRate(vaultPubkey, parseFloat(rewardAmount), CONFIG.TOKEN_DECIMALS);
    await loadVaultData();
    setRewardAmount('');
    setActionLoading(null);
  };

  // Handle force advance epoch
  const handleForceAdvanceEpoch = async () => {
    if (!vault) return;

    setActionLoading('epoch');
    const vaultPubkey = new PublicKey(vaultAddress);
    await forceAdvanceEpoch(vaultPubkey);
    await loadVaultData();
    setActionLoading(null);
  };

  // Check if user is vault authority
  const isAuthority = vault && publicKey && vault.authority.equals(publicKey);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 animate-float">
          <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          Admin Access Required
        </h2>
        <p className="text-dark-400 max-w-md">
          Connect your wallet to access admin functions. 
          Only the vault authority can perform these actions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Admin Panel
        </h1>
        <p className="text-dark-400">
          Manage vault settings and simulate rewards
        </p>
      </div>

      {/* Config Warning */}
      {!isConfigured() && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-400">Configuration Required</h4>
              <p className="text-sm text-amber-400/70">
                Please update <code className="bg-dark-800 px-1 rounded">src/config.ts</code> with your vault address after deployment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initialize New Vault */}
      <Card
        title="Initialize New Vault"
        subtitle="Create a new vault with your wallet as authority"
        icon={
          <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        }
        className="animate-fade-in stagger-1"
      >
        <div className="space-y-4">
          <Input
            label="Deposit Token Mint"
            placeholder="Enter SPL token mint address"
            value={initDepositTokenMint}
            onChange={(e) => setInitDepositTokenMint(e.target.value)}
          />
          <Input
            label="Epoch Duration (seconds)"
            type="number"
            placeholder="60"
            value={initEpochDuration}
            onChange={(e) => setInitEpochDuration(e.target.value)}
            suffix="seconds"
          />
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm">
            <p className="text-green-400">
              <strong>Note:</strong> This will create a new vault with you as the authority. 
              The vault will automatically create an IOU token mint for shares.
            </p>
          </div>
          <Button
            onClick={handleInitialize}
            loading={actionLoading === 'init'}
            disabled={!initDepositTokenMint || !initEpochDuration}
            className="w-full"
          >
            Initialize Vault
          </Button>
        </div>
      </Card>

      {/* Vault Address Input */}
      <Card className="animate-fade-in stagger-2">
        <div className="space-y-4">
          <Input
            label="Vault Address"
            placeholder="Enter vault address to manage"
            value={vaultAddress}
            onChange={(e) => setVaultAddress(e.target.value)}
          />
          <Button
            onClick={loadVaultData}
            loading={loading}
            disabled={!vaultAddress}
          >
            Load Vault
          </Button>
        </div>
      </Card>

      {vault && (
        <>
          {/* Authority Check */}
          {!isAuthority && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-red-400">Not Authorized</h4>
                  <p className="text-sm text-red-400/70">
                    You are not the authority for this vault. Only {vault.authority.toBase58().slice(0, 8)}... can perform admin actions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Vault Stats */}
          <VaultStats
            totalDeposits={vault.totalDeposits}
            totalShares={vault.totalShares}
            rate={vault.rate}
            currentEpoch={vault.currentEpoch}
            decimals={CONFIG.TOKEN_DECIMALS}
          />

          {/* Admin Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Increase Rate */}
            <Card
              title="Increase Rate"
              subtitle="Add rewards to increase IOU value"
              icon={
                <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              className="animate-fade-in stagger-2"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Your token balance:</span>
                  <span className="font-mono text-white">
                    {authorityBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  suffix="tokens"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Current rate:</span>
                  <span className="font-mono text-dark-300">
                    {formatRate(vault.rate)} tokens/share
                  </span>
                </div>
                {rewardAmount && vault.totalShares.toNumber() > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">New rate (est.):</span>
                    <span className="font-mono text-purple-400">
                      {(
                        (vault.totalDeposits.toNumber() + parseFloat(rewardAmount) * Math.pow(10, CONFIG.TOKEN_DECIMALS)) /
                        vault.totalShares.toNumber()
                      ).toFixed(6)} tokens/share
                    </span>
                  </div>
                )}
                <Button
                  onClick={handleIncreaseRate}
                  loading={actionLoading === 'rate'}
                  disabled={!isAuthority || !rewardAmount || parseFloat(rewardAmount) <= 0}
                  className="w-full"
                >
                  Add Rewards
                </Button>
              </div>
            </Card>

            {/* Force Advance Epoch */}
            <Card
              title="Force Advance Epoch"
              subtitle="Manually advance to the next epoch"
              icon={
                <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              }
              className="animate-fade-in stagger-3"
            >
              <div className="space-y-4">
                <div className="bg-dark-800/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Current Epoch:</span>
                    <span className="font-mono text-white">
                      {vault.currentEpoch.toString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Epoch Duration:</span>
                    <span className="font-mono text-white">
                      {vault.epochDuration.toString()}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Last Epoch Time:</span>
                    <span className="font-mono text-white">
                      {new Date(vault.lastEpochTimestamp.toNumber() * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
                  <p className="text-amber-400">
                    <strong>Note:</strong> This will immediately advance to epoch {vault.currentEpoch.toNumber() + 1}, 
                    allowing pending withdrawals to be claimed.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleForceAdvanceEpoch}
                  loading={actionLoading === 'epoch'}
                  disabled={!isAuthority}
                  className="w-full"
                >
                  Advance to Epoch {vault.currentEpoch.toNumber() + 1}
                </Button>
              </div>
            </Card>
          </div>

          {/* Vault Details */}
          <Card className="animate-fade-in stagger-4">
            <h3 className="font-display font-semibold text-lg text-white mb-4">Vault Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-400">Vault Address:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vaultAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline truncate max-w-[200px]"
                  >
                    {vaultAddress.slice(0, 8)}...{vaultAddress.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Authority:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vault.authority.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline truncate max-w-[200px]"
                  >
                    {vault.authority.toBase58().slice(0, 8)}...{vault.authority.toBase58().slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Deposit Token:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vault.depositTokenMint.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline truncate max-w-[200px]"
                  >
                    {vault.depositTokenMint.toBase58().slice(0, 8)}...{vault.depositTokenMint.toBase58().slice(-8)}
                  </a>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-400">IOU Token:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vault.iouTokenMint.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline truncate max-w-[200px]"
                  >
                    {vault.iouTokenMint.toBase58().slice(0, 8)}...{vault.iouTokenMint.toBase58().slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Vault Token Account:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vault.vaultTokenAccount.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline truncate max-w-[200px]"
                  >
                    {vault.vaultTokenAccount.toBase58().slice(0, 8)}...{vault.vaultTokenAccount.toBase58().slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Bump Seeds:</span>
                  <span className="font-mono text-dark-300">
                    vault: {vault.bump}, iou: {vault.iouMintBump}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
