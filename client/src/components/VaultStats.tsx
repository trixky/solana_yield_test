import { BN } from '@coral-xyz/anchor';

interface VaultStatsProps {
  totalDeposits: BN;
  totalShares: BN;
  rate: BN;
  currentEpoch: BN;
  decimals: number;
}

const RATE_PRECISION = 1_000_000_000;

export default function VaultStats({
  totalDeposits,
  totalShares,
  rate,
  currentEpoch,
  decimals,
}: VaultStatsProps) {
  const formatAmount = (amount: BN) => {
    const num = amount.toNumber() / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const formatRate = (rate: BN) => {
    const rateNum = rate.toNumber() / RATE_PRECISION;
    return rateNum.toFixed(4);
  };

  const stats = [
    {
      label: 'Total Deposits',
      value: formatAmount(totalDeposits),
      suffix: 'tokens',
      color: 'text-vault-400',
    },
    {
      label: 'Total Shares',
      value: formatAmount(totalShares),
      suffix: 'IOU',
      color: 'text-blue-400',
    },
    {
      label: 'Exchange Rate',
      value: formatRate(rate),
      suffix: 'tokens/share',
      color: 'text-purple-400',
    },
    {
      label: 'Current Epoch',
      value: currentEpoch.toString(),
      suffix: '',
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="glass rounded-xl p-4 animate-fade-in opacity-0"
          style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
        >
          <p className="text-dark-400 text-sm mb-1">{stat.label}</p>
          <p className={`font-mono text-xl font-semibold ${stat.color}`}>
            {stat.value}
            {stat.suffix && (
              <span className="text-dark-500 text-sm ml-1">{stat.suffix}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}


