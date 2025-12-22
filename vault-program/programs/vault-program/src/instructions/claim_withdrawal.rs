use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::VaultError;
use crate::state::{Vault, WithdrawalRequest};

#[derive(Accounts)]
pub struct ClaimWithdrawal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref(), vault.deposit_token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// Withdrawal request account
    #[account(
        mut,
        seeds = [b"withdrawal", vault.key().as_ref(), user.key().as_ref()],
        bump = withdrawal_request.bump,
        constraint = withdrawal_request.user == user.key() @ VaultError::Unauthorized
    )]
    pub withdrawal_request: Account<'info, WithdrawalRequest>,

    /// User's token account (destination)
    #[account(
        mut,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Vault's token account
    #[account(
        mut,
        address = vault.vault_token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Deposit token mint
    #[account(address = vault.deposit_token_mint)]
    pub deposit_token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}





