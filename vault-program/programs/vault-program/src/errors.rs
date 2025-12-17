use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount provided")]
    InvalidAmount,
    #[msg("Insufficient shares to withdraw")]
    InsufficientShares,
    #[msg("Math overflow error")]
    MathOverflow,
    #[msg("Epoch not yet reached for claim")]
    EpochNotReached,
    #[msg("Withdrawal already claimed")]
    AlreadyClaimed,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("A pending withdrawal request already exists. Claim it first.")]
    PendingWithdrawalExists,
}

