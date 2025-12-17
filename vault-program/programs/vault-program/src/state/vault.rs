use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// Authority that can manage the vault
    pub authority: Pubkey,
    /// Mint of the token users deposit
    pub deposit_token_mint: Pubkey,
    /// Mint of the IOU/share token
    pub iou_token_mint: Pubkey,
    /// Vault's token account holding deposits
    pub vault_token_account: Pubkey,
    /// Total amount of tokens deposited
    pub total_deposits: u64,
    /// Total shares issued
    pub total_shares: u64,
    /// Current rate: tokens per share (scaled by RATE_PRECISION)
    pub rate: u64,
    /// Current epoch number
    pub current_epoch: u64,
    /// Duration of each epoch in seconds
    pub epoch_duration: i64,
    /// Timestamp of last epoch change
    pub last_epoch_timestamp: i64,
    /// Bump seed for PDA
    pub bump: u8,
    /// Bump seed for IOU mint PDA
    pub iou_mint_bump: u8,
}


