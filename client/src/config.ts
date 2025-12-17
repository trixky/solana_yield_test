// Configuration du vault déployé sur Devnet
// Ces valeurs doivent être mises à jour après le déploiement du vault

export const CONFIG = {
  // Adresse du vault (à remplir après initialize)
  VAULT_ADDRESS: 'FHihEf49WmvseqA5rH4xsVmcf5tQc4bN8axk2NGmwrSE',
  
  // Adresse du token de dépôt (USDC Devnet ou autre)
  // USDC Devnet: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  DEPOSIT_TOKEN_MINT: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  
  // Adresse de l'autorité du vault (votre wallet)
  VAULT_AUTHORITY: 'B6eTFMeTZuoYAzfis1nmnFVepd9uYSiCz8EfhZnt94VM',
  
  // Decimals du token (USDC = 6, la plupart des tokens = 9)
  TOKEN_DECIMALS: 6,
  
  // Program ID
  PROGRAM_ID: 'D3ioGqnnBE4CkW7TN3Cb7Va2BG1sb4VE5vk5KKYoogwx',
};

// Helper pour vérifier si la config est complète
export const isConfigured = () => {
  return CONFIG.VAULT_ADDRESS !== '' && CONFIG.DEPOSIT_TOKEN_MINT !== '';
};