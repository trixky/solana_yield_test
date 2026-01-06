use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::Vault;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The token that users will deposit
    pub deposit_token_mint: Account<'info, Mint>,

    /// Vault state account (PDA)
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", authority.key().as_ref(), deposit_token_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// IOU/Share token mint (PDA, authority is the mint itself for self-signing)
    #[account(
        init,
        payer = authority,
        mint::decimals = deposit_token_mint.decimals,
        mint::authority = iou_token_mint,
        seeds = [b"vault", vault.key().as_ref()],
        bump
    )]
    pub iou_token_mint: Account<'info, Mint>,

    /// Vault's token account to hold deposited tokens
    #[account(
        init,
        payer = authority,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}






