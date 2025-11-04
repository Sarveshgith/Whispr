#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommitMessage } from '../core/genCommit.js';
import { getGitStatus } from '../subsidiary/gitCheck.js';
import { runWhisprFlow } from '../core/whispr.js';
import chalk from 'chalk';
import { checkApiKey, saveApiKey } from '../utils/saveApiKey.js';

const showBanner = () => {
    const logo = `
    ██╗    ██╗██╗  ██╗██╗███████╗██████╗ ██████╗ 
    ██║    ██║██║  ██║██║██╔════╝██╔══██╗██╔══██╗
    ██║ █╗ ██║███████║██║███████╗██████╔╝██████╔╝
    ██║███╗██║██╔══██║██║╚════██║██╔═══╝ ██╔══██╗
    ╚███╔███╔╝██║  ██║██║███████║██║     ██║  ██║
     ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝
    `;

    console.log(chalk.cyan(logo));
    console.log(chalk.dim('    🤖 AI-Powered Commit Message Generator\n'));
};

const program = new Command();

program
    .name('whispr')
    .description('AI-powered commit message generator')
    .version('1.0.0');

program
    .command('generate', { isDefault: true })
    .description('Generate a commit message for staged changes (default)')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--no-interactive', 'Skip interactive prompts')
    .option('--model <model>', 'AI model to use', 'gemini-2.5-flash-lite')
    .option('--context <text>', 'Additional context for the commit message')
    .action(async (options) => {
        showBanner();

        checkApiKey();

        try {
            if (options.interactive === false) {
                const gitStatus = getGitStatus();

                if (!gitStatus.isRepo) {
                    console.error(chalk.red('✗ Not a git repository'));
                    process.exit(1);
                }

                if (!gitStatus.hasStaged) {
                    console.error(chalk.red('✗ No staged changes found'));
                    process.exit(1);
                }

                const message = await generateCommitMessage({
                    staged: true,
                    verbose: options.verbose,
                    model: options.model,
                    additionalContext: options.context || ''
                });

                console.log(message);
            } else {
                await runWhisprFlow(options);
            }
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('set')
    .description('Configure Whispr settings')
    .argument('<key>', 'Setting key (e.g., api-key)')
    .argument('<value>', 'Setting value')
    .action((key, value) => {
        if (key === 'api-key') {
            saveApiKey(value);
        } else {
            console.error(chalk.red(`✗ Unknown setting: ${key}`));
            console.log(chalk.dim('Available settings: api-key'));
            process.exit(1);
        }
    });

program
    .command('status')
    .description('Check git repository status')
    .action(() => {
        const status = getGitStatus();

        console.log('\n' + chalk.bold('📊 Git Repository Status:'));
        console.log(chalk.cyan('─'.repeat(40)));
        console.log(`Repository: ${status.isRepo ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);

        if (status.isRepo) {
            console.log(`Staged changes: ${status.hasStaged ? chalk.green('✓ Yes') : chalk.yellow('✗ No')}`);
            console.log(`Unstaged changes: ${status.hasUnstaged ? chalk.yellow('✓ Yes') : chalk.green('✗ No')}`);
            console.log(`Working tree clean: ${!status.hasChanges ? chalk.green('✓ Yes') : chalk.yellow('✗ No')}`);
        }
        console.log(chalk.cyan('─'.repeat(40)) + '\n');
        console.log(`Staged changes: ${status.hasStaged ? chalk.green('✓ Yes') : chalk.yellow('✗ No')}`);
        console.log(`Unstaged changes: ${status.hasUnstaged ? chalk.green('✓ Yes') : chalk.yellow('✗ No')}`);
        console.log(`Has any changes: ${status.hasChanges ? chalk.green('✓ Yes') : chalk.yellow('✗ No')}`);
        console.log(chalk.cyan('─'.repeat(40)) + '\n');
    });

program.parse();
