import { spawnSync } from 'node:child_process';

export interface CommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  inherit?: boolean;
}

export type CommandRunner = (command: string, args: string[], options: CommandOptions) => string;

export const runCommand: CommandRunner = (command, args, options) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args[0] ?? ''} failed (${result.status}): ${result.stderr?.trim() ?? ''}`);
  }

  return result.stdout?.trim() ?? '';
};
