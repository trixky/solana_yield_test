use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct WithdrawalRequest {
    /// User who requested the withdrawal
    pub user: Pubkey,
    /// Vault this request is for
    pub vault: Pubkey,
    /// Amount of shares being withdrawn
    pub shares_amount: u64,
    /// Amount of tokens to receive (calculated at request time)
    pub tokens_to_receive: u64,
    /// Epoch when request was made
    pub request_epoch: u64,
    /// Epoch when withdrawal can be claimed
    pub claimable_epoch: u64,
    /// Whether the withdrawal has been claimed
    pub claimed: bool,
    /// Bump seed for PDA
    pub bump: u8,
}





