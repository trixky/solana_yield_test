use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::{Vault, WithdrawalRequest};

#[derive(Accounts)]
pub struct RequestWithdrawal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref(), vault.deposit_token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// Withdrawal request account (PDA per user per vault)
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + WithdrawalRequest::INIT_SPACE,
        seeds = [b"withdrawal", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub withdrawal_request: Account<'info, WithdrawalRequest>,

    /// User's IOU token account
    #[account(
        mut,
        associated_token::mint = iou_token_mint,
        associated_token::authority = user
    )]
    pub user_iou_account: Account<'info, TokenAccount>,

    /// IOU token mint
    #[account(
        mut,
        seeds = [b"vault", vault.key().as_ref()],
        bump = vault.iou_mint_bump
    )]
    pub iou_token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}




