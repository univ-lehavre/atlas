import pc from 'picocolors';

export const log = {
  info: (msg: string) => console.log(pc.blue('ℹ'), msg),
  success: (msg: string) => console.log(pc.green('✓'), msg),
  error: (msg: string) => console.log(pc.red('✗'), msg),
  warn: (msg: string) => console.log(pc.yellow('⚠'), msg),
  step: (name: string, status: 'ok' | 'error' | 'pending', latencyMs?: number) => {
    const icon =
      status === 'ok' ? pc.green('✓') : status === 'error' ? pc.red('✗') : pc.yellow('…');
    const latency = latencyMs !== undefined ? pc.dim(` (${latencyMs}ms)`) : '';
    console.log(`  ${icon} ${name}${latency}`);
  },
};

export const formatJson = (data: unknown): string => JSON.stringify(data, null, 2);
