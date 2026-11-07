import { definePlugin, registerPluginBehavior } from '@switch-console/core/agents/plugins';
import { icon } from './icon';

export const DROID_INSTALL_UNIX = 'curl -fsSL https://app.factory.ai/cli | sh';
/**
 * Written without `$` or `%`: the install runner's shell may be PowerShell or
 * cmd.exe, and each would expand one of them before `powershell -c` ran.
 */
export const DROID_INSTALL_WINDOWS =
  'powershell -ExecutionPolicy ByPass -c "irm https://app.factory.ai/cli/windows | iex"';

export const plugin = definePlugin(
  {
    id: 'droid',
    name: 'Factory Droid',
    description:
      "Factory's Droid agent over ACP, with its own sign-in, approvals and persistent conversations.",
    websiteUrl: 'https://docs.factory.ai/droid-exec/overview',
    cliLabel: 'Factory Droid CLI',
  },
  {
    autoApprove: {
      kind: 'supported',
    },
    effort: {
      kind: 'none',
    },
    hostDependency: {
      id: 'droid',
      binaryNames: ['droid'],
      installDocs: 'https://docs.factory.ai/cli/getting-started/quickstart',
      installCommands: {
        macos: [{ method: 'curl', command: DROID_INSTALL_UNIX, recommended: true }],
        linux: [{ method: 'curl', command: DROID_INSTALL_UNIX, recommended: true }],
        windows: [{ method: 'powershell', command: DROID_INSTALL_WINDOWS, recommended: true }],
      },
      updates: {
        kind: 'supported',
        releaseSource: {
          kind: 'none',
        },
        update: {
          kind: 'cli',
          args: ['update'],
        },
      },
    },
    mcp: {
      kind: 'none',
    },
    models: {
      kind: 'none',
    },
    plugins: {
      kind: 'none',
    },
    prompt: {
      kind: 'none',
    },
    sessions: {
      kind: 'resumable',
    },
    repoAgents: { kind: 'none' },
  },
  { icon }
);

export const provider = registerPluginBehavior(plugin, {
  prompt: {
    buildCommand: () => {
      throw new Error('Factory Droid runs through the ACP session host.');
    },
  },
});
