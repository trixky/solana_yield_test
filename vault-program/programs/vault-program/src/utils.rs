use anchor_lang::prelude::*;

use crate::constants::RATE_PRECISION;
use crate::errors::VaultError;
use crate::state::Vault;

/// Calculate shares from deposit amount based on current rate
/// shares = (amount * RATE_PRECISION) / rate
pub fn calculate_shares_from_amount(amount: u64, rate: u64) -> Result<u64> {
    let shares = (amount as u128)
        .checked_mul(RATE_PRECISION as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(rate as u128)
        .ok_or(VaultError::MathOverflow)?;
    
    Ok(shares as u64)
}

/// Calculate token amount from shares based on current rate
/// amount = (shares * rate) / RATE_PRECISION
pub fn calculate_amount_from_shares(shares: u64, rate: u64) -> Result<u64> {
    let amount = (shares as u128)
        .checked_mul(rate as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(RATE_PRECISION as u128)
        .ok_or(VaultError::MathOverflow)?;
    
    Ok(amount as u64)
}

/// Calculate current epoch based on vault state
pub fn calculate_current_epoch(vault: &Vault) -> Result<u64> {
    Ok(vault.current_epoch)
}




