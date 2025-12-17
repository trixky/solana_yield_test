use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, MintTo, Transfer};

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use constants::*;
use errors::*;
use instructions::*;
use utils::*;

declare_id!("D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx");

#[program]
pub mod vault_program {
    use super::*;

    /// Initialize the vault with a deposit token
    /// Creates the vault state and the IOU (share) token mint
    pub fn initialize(ctx: Context<Initialize>, epoch_duration: i64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        vault.authority = ctx.accounts.authority.key();
        vault.deposit_token_mint = ctx.accounts.deposit_token_mint.key();
        vault.iou_token_mint = ctx.accounts.iou_token_mint.key();
        vault.vault_token_account = ctx.accounts.vault_token_account.key();
        vault.total_deposits = 0;
        vault.total_shares = 0;
        vault.rate = INITIAL_RATE;
        vault.current_epoch = 0;
        vault.epoch_duration = epoch_duration;
        vault.last_epoch_timestamp = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;
        vault.iou_mint_bump = ctx.bumps.iou_token_mint;

        msg!("Vault initialized with epoch duration: {} seconds", epoch_duration);
        msg!("Deposit token: {}", vault.deposit_token_mint);
        msg!("IOU token: {}", vault.iou_token_mint);

        Ok(())
    }

    /// Deposit tokens into the vault and receive IOU shares
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;

        // Calculate shares to mint based on current rate
        let shares_to_mint = calculate_shares_from_amount(amount, vault.rate)?;
        require!(shares_to_mint > 0, VaultError::InsufficientShares);

        // Transfer tokens from user to vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Mint IOU shares to user
        let vault_key = vault.key();
        let seeds = &[
            b"vault".as_ref(),
            vault_key.as_ref(),
            &[vault.iou_mint_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.iou_token_mint.to_account_info(),
                to: ctx.accounts.user_iou_account.to_account_info(),
                authority: ctx.accounts.iou_token_mint.to_account_info(),
            },
            signer_seeds,
        );
        token::mint_to(mint_ctx, shares_to_mint)?;

        // Update vault state
        vault.total_deposits = vault.total_deposits.checked_add(amount).ok_or(VaultError::MathOverflow)?;
        vault.total_shares = vault.total_shares.checked_add(shares_to_mint).ok_or(VaultError::MathOverflow)?;

        msg!("Deposited {} tokens, minted {} shares", amount, shares_to_mint);
        msg!("Current rate: {}", vault.rate);

        Ok(())
    }

    /// Request a withdrawal - locks the shares for the next epoch
    pub fn request_withdrawal(ctx: Context<RequestWithdrawal>, shares_amount: u64) -> Result<()> {
        require!(shares_amount > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;
        let withdrawal_request = &mut ctx.accounts.withdrawal_request;
        
        // Check if there's already a pending withdrawal request
        require!(
            withdrawal_request.shares_amount == 0 || withdrawal_request.claimed,
            VaultError::PendingWithdrawalExists
        );

        // Calculate the epoch when withdrawal can be claimed
        let current_epoch = calculate_current_epoch(vault)?;
        let claimable_epoch = current_epoch.checked_add(1).ok_or(VaultError::MathOverflow)?;

        // Burn the IOU shares from user
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.iou_token_mint.to_account_info(),
                from: ctx.accounts.user_iou_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, shares_amount)?;

        // Calculate tokens to receive based on current rate
        let tokens_to_receive = calculate_amount_from_shares(shares_amount, vault.rate)?;

        // Update total_shares to reflect burned shares
        vault.total_shares = vault.total_shares.checked_sub(shares_amount).ok_or(VaultError::MathOverflow)?;

        // Create or update withdrawal request
        withdrawal_request.user = ctx.accounts.user.key();
        withdrawal_request.vault = vault.key();
        withdrawal_request.shares_amount = shares_amount;
        withdrawal_request.tokens_to_receive = tokens_to_receive;
        withdrawal_request.request_epoch = current_epoch;
        withdrawal_request.claimable_epoch = claimable_epoch;
        withdrawal_request.claimed = false;
        withdrawal_request.bump = ctx.bumps.withdrawal_request;

        msg!("Withdrawal requested: {} shares = {} tokens", shares_amount, tokens_to_receive);
        msg!("Current epoch: {}, Claimable at epoch: {}", current_epoch, claimable_epoch);

        Ok(())
    }

    /// Claim a pending withdrawal after the epoch has passed
    pub fn claim_withdrawal(ctx: Context<ClaimWithdrawal>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let withdrawal_request = &mut ctx.accounts.withdrawal_request;

        // Verify the request hasn't been claimed
        require!(!withdrawal_request.claimed, VaultError::AlreadyClaimed);

        // Verify we're in a valid epoch
        let current_epoch = calculate_current_epoch(vault)?;
        require!(
            current_epoch >= withdrawal_request.claimable_epoch,
            VaultError::EpochNotReached
        );

        let tokens_to_transfer = withdrawal_request.tokens_to_receive;

        // Transfer tokens from vault to user
        let authority_key = vault.authority;
        let seeds = &[
            b"vault".as_ref(),
            authority_key.as_ref(),
            vault.deposit_token_mint.as_ref(),
            &[vault.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, tokens_to_transfer)?;

        // Update vault state
        vault.total_deposits = vault.total_deposits.checked_sub(tokens_to_transfer).ok_or(VaultError::MathOverflow)?;

        // Mark as claimed
        withdrawal_request.claimed = true;

        msg!("Claimed {} tokens", tokens_to_transfer);

        Ok(())
    }

    /// Increase the rate to simulate vault rewards/yield (admin only)
    pub fn increase_rate(ctx: Context<IncreaseRate>, additional_tokens: u64) -> Result<()> {
        require!(additional_tokens > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;

        // Transfer additional tokens to vault (simulating rewards)
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.authority_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, additional_tokens)?;

        // Update total deposits
        vault.total_deposits = vault.total_deposits.checked_add(additional_tokens).ok_or(VaultError::MathOverflow)?;

        // Recalculate rate
        if vault.total_shares > 0 {
            vault.rate = vault.total_deposits
                .checked_mul(RATE_PRECISION)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(vault.total_shares)
                .ok_or(VaultError::MathOverflow)?;
        }

        msg!("Rate increased! Added {} tokens", additional_tokens);
        msg!("New rate: {} (1 share = {} tokens)", vault.rate, vault.rate as f64 / RATE_PRECISION as f64);
        msg!("Total deposits: {}, Total shares: {}", vault.total_deposits, vault.total_shares);

        Ok(())
    }

    /// Advance to the next epoch (time-based)
    pub fn advance_epoch(ctx: Context<AdvanceEpoch>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;
        
        let time_since_last_epoch = clock.unix_timestamp
            .checked_sub(vault.last_epoch_timestamp)
            .ok_or(VaultError::MathOverflow)?;

        require!(
            time_since_last_epoch >= vault.epoch_duration,
            VaultError::EpochNotReached
        );

        vault.current_epoch = vault.current_epoch.checked_add(1).ok_or(VaultError::MathOverflow)?;
        vault.last_epoch_timestamp = clock.unix_timestamp;

        msg!("Advanced to epoch {}", vault.current_epoch);

        Ok(())
    }

    /// Force advance epoch (admin only, for testing)
    pub fn force_advance_epoch(ctx: Context<ForceAdvanceEpoch>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        vault.current_epoch = vault.current_epoch.checked_add(1).ok_or(VaultError::MathOverflow)?;
        vault.last_epoch_timestamp = Clock::get()?.unix_timestamp;

        msg!("Force advanced to epoch {}", vault.current_epoch);

        Ok(())
    }
}
