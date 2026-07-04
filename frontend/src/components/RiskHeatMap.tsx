import { Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

interface RiskHeatMapProps {
  grid: number[][]; // grid[likelihood-1][impact-1] = count
}

function cellColor(likelihood: number, impact: number): string {
  const score = likelihood * impact;
  if (score >= 15) return '#f5222d';
  if (score >= 9) return '#fa8c16';
  if (score >= 5) return '#faad14';
  return '#52c41a';
}

export function RiskHeatMap({ grid }: RiskHeatMapProps) {
  const { t } = useTranslation();
  const impacts = [1, 2, 3, 4, 5];
  const likelihoods = [5, 4, 3, 2, 1]; // render highest likelihood at top

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 24 }}>
        <Typography.Text
          type="secondary"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 12,
            textAlign: 'center',
            flex: 1,
          }}
        >
          {t('heatMap.likelihoodAxis')}
        </Typography.Text>
      </div>
      <div>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
          <tbody>
            {likelihoods.map((l) => (
              <tr key={l}>
                <td style={{ paddingRight: 8, fontSize: 12, color: '#888' }}>{l}</td>
                {impacts.map((i) => {
                  const count = grid[l - 1]?.[i - 1] ?? 0;
                  return (
                    <td key={i}>
                      <Tooltip
                        title={t('heatMap.tooltip', { likelihood: l, impact: i, score: l * i, count })}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 44,
                            borderRadius: 6,
                            background: cellColor(l, i),
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            opacity: count > 0 ? 1 : 0.35,
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td />
              {impacts.map((i) => (
                <td key={i} style={{ textAlign: 'center', fontSize: 12, color: '#888', paddingTop: 4 }}>
                  {i}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
          {t('heatMap.impactAxis')}
        </Typography.Text>
      </div>
    </div>
  );
}
