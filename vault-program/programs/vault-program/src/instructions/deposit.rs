use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::Vault;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref(), vault.deposit_token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// User's token account (source)
    #[account(
        mut,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// User's IOU token account (destination for shares)
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = iou_token_mint,
        associated_token::authority = user
    )]
    pub user_iou_account: Account<'info, TokenAccount>,

    /// Vault's token account
    #[account(
        mut,
        address = vault.vault_token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Deposit token mint
    #[account(address = vault.deposit_token_mint)]
    pub deposit_token_mint: Account<'info, Mint>,

    /// IOU token mint
    #[account(
        mut,
        seeds = [b"vault", vault.key().as_ref()],
        bump = vault.iou_mint_bump
    )]
    pub iou_token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}





