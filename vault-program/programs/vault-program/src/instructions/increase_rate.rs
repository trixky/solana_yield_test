use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::VaultError;
use crate::state::Vault;

#[derive(Accounts)]
pub struct IncreaseRate<'info> {
    #[account(
        mut,
        constraint = authority.key() == vault.authority @ VaultError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref(), vault.deposit_token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// Authority's token account (source of rewards)
    #[account(
        mut,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = authority
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

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




