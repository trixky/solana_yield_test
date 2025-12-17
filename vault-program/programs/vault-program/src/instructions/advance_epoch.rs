use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::state::Vault;

#[derive(Accounts)]
pub struct AdvanceEpoch<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref(), vault.deposit_token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct ForceAdvanceEpoch<'info> {
    #[account(
        constraint = authority.key() == vault.authority @ VaultError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref(), vault.deposit_token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
}


