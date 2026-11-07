import { describe, expect, it } from 'vitest';
import { DROID_INSTALL_UNIX, DROID_INSTALL_WINDOWS, plugin, provider } from './index';

const dependency = plugin.capabilities.hostDependency;

describe('Factory Droid plugin', () => {
  it('looks for the droid binary', () => {
    expect(dependency.binaryNames).toEqual(['droid']);
  });

  it.each([
    ['macos', DROID_INSTALL_UNIX],
    ['linux', DROID_INSTALL_UNIX],
    ['windows', DROID_INSTALL_WINDOWS],
  ] as const)('installs droid with the vendor installer on %s', (platform, command) => {
    const options = dependency.installCommands[platform] ?? [];
    expect((options.find((option) => option.recommended) ?? options[0])?.command).toBe(command);
  });

  it('runs the Windows installer through PowerShell from either shell', () => {
    expect(DROID_INSTALL_WINDOWS).not.toMatch(/[$%]/);
  });

  it('runs only through the ACP session host', () => {
    expect(provider.metadata.id).toBe('droid');
    expect(() => provider.behavior.prompt!.buildCommand({} as never)).toThrow(/ACP session host/);
  });
});
