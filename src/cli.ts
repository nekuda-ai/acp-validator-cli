#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { validateCommand } from './commands/validate.js';

yargs(hideBin(process.argv))
  .scriptName('acp-test')
  .version('0.1.0')
  .usage('$0 <command> [options]')

  // Init command
  .command({
    command: 'init',
    describe: 'Initialize ACP test configuration',
    handler: async () => {
      await initCommand();
    },
  })

  // Run command
  .command({
    command: 'run',
    describe: 'Run ACP tests',
    builder: (yargs) => {
      return yargs
        .option('checkout-url', {
          alias: 'u',
          type: 'string',
          description: 'Checkout API base URL',
        })
        .option('payment-url', {
          type: 'string',
          description: 'Payment API base URL (optional)',
        })
        .option('api-key', {
          alias: 'k',
          type: 'string',
          description: 'API key for authentication',
        })
        .option('type', {
          alias: 't',
          type: 'string',
          choices: ['simple', 'comprehensive'] as const,
          description: 'Test suite type',
        })
        .option('format', {
          alias: 'f',
          type: 'string',
          choices: ['json', 'yaml', 'html'] as const,
          description: 'Report output format',
        })
        .option('config', {
          alias: 'c',
          type: 'string',
          description: 'Path to config file',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output directory for reports',
        })
        .example('$0 run', 'Run tests (prompts for missing config)')
        .example('$0 run --checkout-url http://localhost:3004 --api-key test_key', 'Run with inline options');
    },
    handler: async (argv) => {
      await runCommand({
        checkoutUrl: argv['checkout-url'],
        paymentUrl: argv['payment-url'],
        apiKey: argv['api-key'],
        type: argv.type as 'simple' | 'comprehensive' | undefined,
        format: argv.format as 'json' | 'yaml' | 'html' | undefined,
        config: argv.config,
        output: argv.output,
      });
    },
  })

  // Validate command
  .command({
    command: 'validate',
    describe: 'Validate ACP implementation (read-only)',
    builder: (yargs) => {
      return yargs
        .option('url', {
          alias: 'u',
          type: 'string',
          description: 'API base URL to validate',
          demandOption: true,
        })
        .option('api-key', {
          alias: 'k',
          type: 'string',
          description: 'API key for authentication',
        })
        .example('$0 validate --url http://localhost:3004', 'Validate API endpoints');
    },
    handler: async (argv) => {
      await validateCommand({
        checkoutUrl: argv.url,
        apiKey: argv['api-key'],
      });
    },
  })

  .demandCommand(1, 'Please specify a command')
  .strict()
  .help('h')
  .alias('h', 'help')
  .epilog('For more information, visit https://github.com/nekuda/acp')
  .parse();
