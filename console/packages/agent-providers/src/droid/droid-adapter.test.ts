import type * as fs from 'node:fs/promises';
import { beforeEach, expect, it, vi } from 'vitest';
import { FakeAppServer } from '../codex/fake-app-server';
import type { ProviderRuntimeEvent } from '../events';

vi.mock('node:fs/promises', async (original) => ({
  ...(await original<typeof fs>()),
  realpath: async (path: string) => path,
}));
const servers: FakeAppServer[] = [];
const spawned: Array<{ command: string; args: string[] }> = [];
vi.mock('node:child_process', () => ({
  spawn: (command: string, args: string[]) => {
    spawned.push({ command, args });
    const server = new FakeAppServer();
    server.replyAlways('initialize', () => ({
      agentCapabilities: { loadSession: true, mcpCapabilities: { http: true } },
    }));
    server.replyAlways('session/new', () => ({
      sessionId: 'native',
      modes: {
        availableModes: [{ id: 'normal' }, { id: 'auto-low' }, { id: 'auto-high' }],
        currentModeId: 'normal',
      },
    }));
    server.replyAlways('session/load', () => ({}));
    server.replyAlways('session/set_mode', () => ({}));
    server.replyAlways('session/set_model', () => ({}));
    servers.push(server);
    return server;
  },
}));
const { createDroidAdapter, droidAcp, droidSessionMode, parseDroidDoctor } =
  await import('./droid-adapter');
beforeEach(() => {
  servers.length = 0;
  spawned.length = 0;
});

const modes = { availableModes: [{ id: 'normal' }, { id: 'auto-low' }, { id: 'auto-high' }] };

it('launches droid in its ACP mode with the environment it was given', async () => {
  expect(
    await droidAcp.launch({ binaryPath: '/bin/droid', cwd: '/work', env: { A: 'b' } })
  ).toEqual({
    command: '/bin/droid',
    args: ['exec', '--output-format', 'acp'],
    env: { A: 'b' },
  });
});

it('passes the Factory API key through from the machine', () => {
  expect(droidAcp.inheritEnv).toContain('FACTORY_API_KEY');
});

it('reads the sign-in from the doctor without starting one', () => {
  const doctor = (status: string) =>
    JSON.stringify({
      results: [
        { id: 'auth.credentials', status: 'pass' },
        { id: 'auth.verify', status },
      ],
    });
  expect(parseDroidDoctor(doctor('pass')).status).toBe('authenticated');
  expect(parseDroidDoctor(doctor('warn')).status).toBe('unauthenticated');
  expect(parseDroidDoctor(doctor('fail')).status).toBe('unauthenticated');
  expect(parseDroidDoctor(doctor('warn')).message).toContain('droid');
  expect(parseDroidDoctor('{"results":[]}').status).toBe('unknown');
  expect(parseDroidDoctor('not json').status).toBe('unknown');
  expect(parseDroidDoctor('').status).toBe('unknown');
});

it('authenticates with the API key method only when a key is given', () => {
  expect(droidAcp.authMethodId?.({ FACTORY_API_KEY: 'fk-synthetic' }, 'droid')).toBe(
    'factory-api-key'
  );
  expect(droidAcp.authMethodId?.({}, 'droid')).toBeUndefined();
});

it('takes a Factory API key as signing the CLI in', async () => {
  const result = await droidAcp.checkSignIn!({
    binaryPath: '/does/not/exist',
    cwd: '/work',
    env: { FACTORY_API_KEY: 'fk-synthetic' },
    handshake: async () => {
      throw new Error('must not run');
    },
    request: async () => {
      throw new Error('must not run');
    },
  });
  expect(result.status).toBe('authenticated');
});

it('raises Droid to its highest autonomy only in full access, and only when it offers it', () => {
  expect(droidSessionMode('full-access', modes)).toBe('auto-high');
  for (const mode of ['approval-required', 'auto-accept-edits', 'auto'] as const)
    expect(droidSessionMode(mode, modes)).toBe('normal');
  expect(droidSessionMode('full-access', { availableModes: [{ id: 'default' }] })).toBeUndefined();
  expect(droidSessionMode('full-access', undefined)).toBeUndefined();
});

it('starts a session over ACP, resumes the native session and ignores replayed output', async () => {
  const adapter = createDroidAdapter({ binaryPath: 'droid' });
  const events: ProviderRuntimeEvent[] = [];
  adapter.subscribe((e) => events.push(e));
  const session = await adapter.startSession({
    sessionId: 's',
    cwd: '/work',
    runtimeMode: 'full-access',
    env: {},
    mcpServers: {},
    connectorMcpServers: [],
    resume: { nativeSessionId: 'native' },
  });
  const server = servers.at(-1)!;
  expect(spawned.at(-1)?.args).toEqual(['exec', '--output-format', 'acp']);
  expect(session.nativeSessionId).toBe('native');
  expect(server.received.some((m) => m.method === 'authenticate')).toBe(false);
  expect(server.received.find((m) => m.method === 'session/load')?.params).toMatchObject({
    sessionId: 'native',
  });
  server.notify('session/update', {
    sessionId: 'native',
    update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'replay' } },
  });
  expect(events.filter((e) => e.type === 'content.delta')).toEqual([]);
});
