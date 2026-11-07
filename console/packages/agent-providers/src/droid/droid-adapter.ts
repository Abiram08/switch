import { createAcpAdapter, type AcpAdapter } from '../acp/acp-adapter';
import type { AcpAdapterOptions, AcpProviderHooks } from '../acp/hooks';
import type { AcpSessionModes } from '../acp/protocol';
import type { RuntimeMode } from '../adapter';
import { execProvider } from '../provider-process';
import { commandOutput, readiness, signInWith, type ProviderReadiness } from '../readiness';

export const DROID_LOGIN = 'droid';
const AUTH_CHECK = 'auth.verify';

interface DoctorCheck {
  id?: string;
  status?: string;
}

/** Reads `droid doctor --checks auth --json`, which reports sign-in without starting one. */
export function parseDroidDoctor(output: string): ProviderReadiness {
  let checks: DoctorCheck[] = [];
  try {
    const parsed = JSON.parse(output) as { results?: DoctorCheck[] };
    if (Array.isArray(parsed.results)) checks = parsed.results;
  } catch {
    checks = [];
  }
  const status = checks.find((check) => check.id === AUTH_CHECK)?.status;
  if (status === 'pass') return readiness('authenticated', 'Signed in.');
  if (status === 'warn' || status === 'fail')
    return readiness('unauthenticated', signInWith(DROID_LOGIN));
  return readiness(
    'unknown',
    'Could not verify authentication. Check provider setup and try again.'
  );
}

/**
 * Droid's ACP modes are autonomy levels. Only full access raises it, so the CLI
 * stops asking; every other mode stays at the asking level and the adapter
 * enforces the runtime mode on the requests that reach it.
 */
const MODE_PREFERENCES: Record<RuntimeMode, readonly string[]> = {
  'full-access': ['auto-high'],
  'auto-accept-edits': ['normal'],
  auto: ['normal'],
  'approval-required': ['normal'],
};

/** The mode for `runtimeMode` if the session advertises it; otherwise none is set. */
export function droidSessionMode(
  runtimeMode: RuntimeMode,
  modes: AcpSessionModes | undefined
): string | undefined {
  return MODE_PREFERENCES[runtimeMode].find((id) =>
    modes?.availableModes.some((mode) => mode.id === id)
  );
}

/** Factory's `droid exec --output-format acp`. */
export const droidAcp: AcpProviderHooks = {
  provider: 'droid',
  label: 'Factory Droid',
  defaultBinary: 'droid',
  capabilities: {
    modelSwitchInSession: true,
    steering: false,
    resume: true,
    approvals: true,
    userInput: false,
  },
  launch: ({ binaryPath, env }) => ({
    command: binaryPath,
    args: ['exec', '--output-format', 'acp'],
    env,
  }),
  loginCommand: DROID_LOGIN,
  inheritEnv: ['FACTORY_API_KEY'],
  authMethodId: (env) => (env.FACTORY_API_KEY?.trim() ? 'factory-api-key' : undefined),
  checkSignIn: async ({ binaryPath, cwd, env }) => {
    // The doctor passes a key without using it, so a key is taken as given and
    // a bad one fails the first turn.
    if (env.FACTORY_API_KEY?.trim())
      return readiness('authenticated', 'Signs in with the Factory API key it was given.');
    let output: string;
    try {
      output = (
        await execProvider(binaryPath, ['doctor', '--checks', 'auth', '--json'], {
          cwd,
          env,
          timeout: 15000,
          maxBuffer: 1024 * 1024,
        })
      ).stdout;
    } catch (error) {
      output = commandOutput(error);
    }
    return parseDroidDoctor(output);
  },
  sessionMode: droidSessionMode,
};

export function createDroidAdapter(options: AcpAdapterOptions = {}): AcpAdapter {
  return createAcpAdapter(droidAcp, options);
}
