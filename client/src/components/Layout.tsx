import { Outlet, Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Layout() {
  const location = useLocation();
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-vault-500/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-vault-600/10 rounded-full blur-[100px] translate-y-1/2 pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vault-400 to-vault-600 flex items-center justify-center transform group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-dark-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="6" width="18" height="15" rx="2" />
                  <circle cx="12" cy="13" r="3" />
                  <path d="M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl text-white">
                Kyros <span className="gradient-text">Vault</span>
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  location.pathname === '/'
                    ? 'bg-vault-500/20 text-vault-400'
                    : 'text-dark-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-vault-500/20 text-vault-400'
                    : 'text-dark-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Admin
              </Link>
            </nav>

            {/* Wallet */}
            <div className="flex items-center gap-4">
              {publicKey && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-vault-400 animate-pulse" />
                  <span className="text-sm text-dark-300 font-mono">
                    {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                  </span>
                </div>
              )}
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-dark-500">
            <span>Built for Kyros Technical Test</span>
            <a
              href="https://devnet.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-vault-400 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-vault-500" />
              Devnet
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


