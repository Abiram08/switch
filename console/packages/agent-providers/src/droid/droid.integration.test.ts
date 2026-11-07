import { spawnSync } from 'node:child_process';
import { describeConformance, echoMcpServerSpec } from '../testing/index';
import { createDroidAdapter } from './droid-adapter';

describeConformance('droid', {
  createAdapter: async () => createDroidAdapter(),
  unavailableReason: async () => {
    const probe = spawnSync('droid', ['--version'], { encoding: 'utf8' });
    return probe.error || probe.status !== 0 ? 'the droid binary is not on PATH' : null;
  },
  mcpServers: { echo: echoMcpServerSpec() },
  // The harness passes a minimal environment, so the key must be handed over.
  ...(process.env.FACTORY_API_KEY ? { env: { FACTORY_API_KEY: process.env.FACTORY_API_KEY } } : {}),
});
