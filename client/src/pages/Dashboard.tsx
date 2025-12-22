import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import VaultStats from '../components/VaultStats';
import { useVaultProgram, VaultData, WithdrawalRequestData } from '../hooks/useVaultProgram';
import { CONFIG, isConfigured } from '../config';

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const {
    fetchVault,
    fetchWithdrawalRequest,
    deposit,
    requestWithdrawal,
    claimWithdrawal,
    advanceEpoch,
    formatRate,
    RATE_PRECISION,
  } = useVaultProgram();

  const [vaultAddress, setVaultAddress] = useState(CONFIG.VAULT_ADDRESS);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [withdrawalRequest, setWithdrawalRequest] = useState<WithdrawalRequestData | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
  const [userShareBalance, setUserShareBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Load vault data
  const loadVaultData = useCallback(async () => {
    if (!vaultAddress || !publicKey) return;

    setLoading(true);
    try {
      const vaultPubkey = new PublicKey(vaultAddress);
      const vaultData = await fetchVault(vaultPubkey);
      setVault(vaultData);

      if (vaultData) {
        // Fetch user balances
        try {
          const userTokenAta = await getAssociatedTokenAddress(
            vaultData.depositTokenMint,
            publicKey
          );
          const tokenAccountInfo = await connection.getTokenAccountBalance(userTokenAta);
          setUserTokenBalance(Number(tokenAccountInfo.value.uiAmount || 0));
        } catch {
          setUserTokenBalance(0);
        }

        try {
          const userShareAta = await getAssociatedTokenAddress(
            vaultData.iouTokenMint,
            publicKey
          );
          const shareAccountInfo = await connection.getTokenAccountBalance(userShareAta);
          setUserShareBalance(Number(shareAccountInfo.value.uiAmount || 0));
        } catch {
          setUserShareBalance(0);
        }

        // Fetch withdrawal request
        const request = await fetchWithdrawalRequest(vaultPubkey, publicKey);
        setWithdrawalRequest(request);
      }
    } catch (error) {
      console.error('Error loading vault:', error);
    }
    setLoading(false);
  }, [vaultAddress, publicKey, fetchVault, fetchWithdrawalRequest, connection]);

  useEffect(() => {
    if (vaultAddress && publicKey) {
      loadVaultData();
    }
  }, [vaultAddress, publicKey, loadVaultData]);

  // Auto-load if config is set
  useEffect(() => {
    if (isConfigured() && publicKey && !vault) {
      loadVaultData();
    }
  }, [publicKey, vault, loadVaultData]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!vault || !depositAmount) return;
    
    setActionLoading('deposit');
    const vaultPubkey = new PublicKey(vaultAddress);
    await deposit(vaultPubkey, parseFloat(depositAmount), CONFIG.TOKEN_DECIMALS);
    await loadVaultData();
    setDepositAmount('');
    setActionLoading(null);
  };

  // Handle request withdrawal
  const handleRequestWithdrawal = async () => {
    if (!vault || !withdrawAmount) return;
    
    setActionLoading('withdraw');
    const vaultPubkey = new PublicKey(vaultAddress);
    await requestWithdrawal(vaultPubkey, parseFloat(withdrawAmount), CONFIG.TOKEN_DECIMALS);
    await loadVaultData();
    setWithdrawAmount('');
    setActionLoading(null);
  };

  // Handle claim withdrawal
  const handleClaimWithdrawal = async () => {
    if (!vault || !withdrawalRequest) return;
    
    setActionLoading('claim');
    const vaultPubkey = new PublicKey(vaultAddress);
    await claimWithdrawal(vaultPubkey);
    await loadVaultData();
    setActionLoading(null);
  };

  // Handle advance epoch (anyone can call if time elapsed)
  const handleAdvanceEpoch = async () => {
    if (!vault) return;
    
    setActionLoading('advance');
    const vaultPubkey = new PublicKey(vaultAddress);
    await advanceEpoch(vaultPubkey);
    await loadVaultData();
    setActionLoading(null);
  };

  // Calculate estimated shares for deposit
  const estimatedShares = depositAmount && vault
    ? (parseFloat(depositAmount) * RATE_PRECISION) / vault.rate.toNumber()
    : 0;

  // Calculate estimated tokens for withdrawal
  const estimatedTokens = withdrawAmount && vault
    ? (parseFloat(withdrawAmount) * vault.rate.toNumber()) / RATE_PRECISION
    : 0;

  // Check if withdrawal can be claimed
  const canClaim = withdrawalRequest && 
    !withdrawalRequest.claimed && 
    vault &&
    withdrawalRequest.claimableEpoch.lte(vault.currentEpoch);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-vault-500/20 flex items-center justify-center mb-6 animate-float">
          <svg className="w-10 h-10 text-vault-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="15" rx="2" />
            <circle cx="12" cy="13" r="3" />
            <path d="M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-dark-400 max-w-md">
          Connect your Solana wallet to interact with the Kyros Vault. 
          Deposit tokens, earn yield, and manage your withdrawals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-dark-400">
          Manage your vault deposits and withdrawals
        </p>
      </div>

      {/* Devnet USDC Info Card */}
      <Card className="animate-fade-in stagger-1">
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
          <h4 className="font-semibold text-cyan-400 mb-2">💰 USDC Devnet</h4>
          <p className="text-sm text-dark-300 mb-3">
            This vault uses <span className="text-cyan-400 font-medium">USDC-Dev</span> tokens on Solana Devnet.
          </p>
          <p className="text-sm text-dark-400 mb-2">
            Mint address: <code className="bg-dark-800 px-2 py-0.5 rounded text-cyan-400">Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr</code>
          </p>
          <p className="text-sm text-dark-300">
            Get free tokens here:{' '}
            <a
              href="https://spl-token-faucet.com/?token-name=USDC-Dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              spl-token-faucet.com/?token-name=USDC-Dev
            </a>
          </p>
        </div>
      </Card>

      {/* Config Warning */}
      {!isConfigured() && (
        <Card className="animate-fade-in stagger-1">
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-amber-400">Vault Not Configured</h4>
                  <p className="text-sm text-amber-400/70">
                    Enter a vault address below or update <code className="bg-dark-800 px-1 rounded">src/config.ts</code>
                  </p>
                </div>
              </div>
            </div>
            <Input
              label="Vault Address"
              placeholder="Enter vault address"
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
      )}

      {vault && (
        <>
          {/* Vault Stats */}
          <VaultStats
            totalDeposits={vault.totalDeposits}
            totalShares={vault.totalShares}
            rate={vault.rate}
            currentEpoch={vault.currentEpoch}
            decimals={CONFIG.TOKEN_DECIMALS}
          />

          {/* User Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <Card className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Your Token Balance</p>
                  <p className="font-mono text-xl font-semibold text-white">
                    {userTokenBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-vault-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-vault-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v12M6 12h12" />
                  </svg>
                </div>
              </div>
            </Card>
            <Card className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Your Share Balance (IOU)</p>
                  <p className="font-mono text-xl font-semibold text-blue-400">
                    {userShareBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deposit */}
            <Card
              title="Deposit"
              subtitle="Deposit tokens to receive IOU shares"
              icon={
                <svg className="w-6 h-6 text-vault-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              }
              className="animate-fade-in stagger-2"
            >
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  suffix="tokens"
                />
                {depositAmount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">You will receive:</span>
                    <span className="font-mono text-vault-400">
                      ~{estimatedShares.toFixed(4)} shares
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Current rate:</span>
                  <span className="font-mono text-dark-300">
                    1 share = {formatRate(vault.rate)} tokens
                  </span>
                </div>
                <Button
                  onClick={handleDeposit}
                  loading={actionLoading === 'deposit'}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                  className="w-full"
                >
                  Deposit
                </Button>
              </div>
            </Card>

            {/* Withdraw */}
            <Card
              title="Withdraw"
              subtitle="Request a withdrawal (2-step process)"
              icon={
                <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              }
              className="animate-fade-in stagger-3"
            >
              <div className="space-y-4">
                {/* Step 1: Request */}
                <div className="space-y-4">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    suffix="shares"
                  />
                  {withdrawAmount && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">You will receive:</span>
                      <span className="font-mono text-amber-400">
                        ~{estimatedTokens.toFixed(4)} tokens
                      </span>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handleRequestWithdrawal}
                    loading={actionLoading === 'withdraw'}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > userShareBalance}
                    className="w-full"
                  >
                    Step 1: Request Withdrawal
                  </Button>
                </div>

                {/* Pending Withdrawal */}
                {withdrawalRequest && !withdrawalRequest.claimed && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                      <h4 className="font-semibold text-amber-400 mb-2">Pending Withdrawal</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-400">Shares:</span>
                          <span className="font-mono text-white">
                            {(withdrawalRequest.sharesAmount.toNumber() / Math.pow(10, CONFIG.TOKEN_DECIMALS)).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Tokens to receive:</span>
                          <span className="font-mono text-white">
                            {(withdrawalRequest.tokensToReceive.toNumber() / Math.pow(10, CONFIG.TOKEN_DECIMALS)).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Claimable at epoch:</span>
                          <span className="font-mono text-white">
                            {withdrawalRequest.claimableEpoch.toString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Current epoch:</span>
                          <span className="font-mono text-white">
                            {vault.currentEpoch.toString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleClaimWithdrawal}
                      loading={actionLoading === 'claim'}
                      disabled={!canClaim}
                      className="w-full"
                    >
                      {canClaim ? 'Step 2: Claim Withdrawal' : `Wait for epoch ${withdrawalRequest.claimableEpoch.toString()}`}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Advance Epoch */}
          <Card
            title="Advance Epoch"
            subtitle="Advance to next epoch when time has elapsed"
            icon={
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            }
            className="animate-fade-in stagger-4"
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

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm">
                <p className="text-blue-400">
                  <strong>Note:</strong> Anyone can advance the epoch once the epoch duration has elapsed. 
                  This enables pending withdrawals to be claimed.
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={handleAdvanceEpoch}
                loading={actionLoading === 'advance'}
                className="w-full"
              >
                Advance to Epoch {vault.currentEpoch.toNumber() + 1}
              </Button>
            </div>
          </Card>

          {/* Vault Info */}
          <Card className="animate-fade-in stagger-5">
            <h3 className="font-display font-semibold text-lg text-white mb-4">Vault Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-400">Vault Address:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vaultAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline"
                  >
                    {vaultAddress.slice(0, 8)}...{vaultAddress.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Authority:</span>
                  <span className="font-mono text-dark-300">
                    {vault.authority.toBase58().slice(0, 8)}...{vault.authority.toBase58().slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Deposit Token:</span>
                  <a
                    href={`https://explorer.solana.com/address/${vault.depositTokenMint.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-vault-400 hover:underline"
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
                    className="font-mono text-vault-400 hover:underline"
                  >
                    {vault.iouTokenMint.toBase58().slice(0, 8)}...{vault.iouTokenMint.toBase58().slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Epoch Duration:</span>
                  <span className="font-mono text-dark-300">
                    {vault.epochDuration.toString()}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Last Epoch:</span>
                  <span className="font-mono text-dark-300">
                    {new Date(vault.lastEpochTimestamp.toNumber() * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Refresh Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={loadVaultData}
              loading={loading}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh Data
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
