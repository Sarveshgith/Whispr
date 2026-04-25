#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommitSuggestion } from '../core/genCommit.js';
import { getGitStatus } from '../subsidiary/gitCheck.js';
import { runWhisprFlow } from '../core/whispr.js';
import { commitChanges } from '../core/whispr.js';
import chalk from 'chalk';
import { checkApiKey, saveApiKey, getApiKey } from '../utils/saveApiKey.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
    .option('--no-interactive', 'Skip interactive prompts and auto-commit')
    .option('--model <model>', 'AI model to use', 'gemini-2.5-flash-lite')
    .option('--context <text>', 'Additional context for the commit message')
    .option('--dry-run', 'Generate message without committing')
    .action(async (options) => {
        showBanner();

        checkApiKey();

        try {
            if (options.interactive === false) {
                if (options.verbose) {
                    console.log(chalk.dim('Running in non-interactive mode...'));
                }

                const gitStatus = getGitStatus();

                if (!gitStatus.isRepo) {
                    console.error(chalk.red('✗ Not a git repository'));
                    console.error(chalk.dim('Initialize a git repository with: git init'));
                    process.exit(1);
                }

                if (!gitStatus.hasStaged) {
                    console.error(chalk.red('✗ No staged changes found'));
                    console.error(chalk.dim('Stage your changes with: git add <files>'));
                    process.exit(1);
                }

                if (options.verbose) {
                    console.log(chalk.green('✓ Git repository detected'));
                    console.log(chalk.green('✓ Staged changes found'));
                    console.log(chalk.dim(`Using model: ${options.model}`));
                }

                console.log(chalk.cyan('\n🤖 Generating commit message...\n'));

                const suggestion = await generateCommitSuggestion({
                    staged: true,
                    verbose: options.verbose,
                    model: options.model,
                    additionalContext: options.context || ''
                });
                const message = suggestion.title;
                const description = suggestion.description;

                console.log(chalk.bold.cyan('Generated Commit Message:'));
                console.log(chalk.dim('─'.repeat(50)));
                console.log(chalk.white(message));
                console.log(chalk.dim('\nDescription (reference only):'));
                console.log(chalk.dim(description));
                console.log(chalk.dim('─'.repeat(50)) + '\n');

                if (options.dryRun) {
                    console.log(chalk.yellow('🔍 Dry run - no commit made'));
                    console.log(chalk.dim('Remove --dry-run flag to commit changes'));
                } else {
                    console.log(chalk.cyan('📝 Committing changes...'));
                    const result = commitChanges(message);
                    if (!result.success) {
                        process.exit(1);
                    }
                    console.log(chalk.green('✓ Changes committed successfully!'));
                    console.log(chalk.dim(`   Commit hash: ${chalk.cyan(result.hash)}\n`));
                }

            } else {
                await runWhisprFlow(options);
            }
        } catch (error) {
            console.error(chalk.red(`\n✗ Error: ${error.message}`));
            if (options.verbose && error.stack) {
                console.error(chalk.dim(error.stack));
            }
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
    .command('config')
    .description('Show configuration file location and status')
    .action(() => {
        const configDir = path.join(os.homedir(), '.whispr');
        const configFile = path.join(configDir, 'config.json');

        console.log(chalk.bold('\n📁 Configuration:'));
        console.log(chalk.cyan('─'.repeat(50)));
        console.log(`Config directory: ${chalk.green(configDir)}`);
        console.log(`Config file: ${chalk.green(configFile)}`);
        console.log(`File exists: ${fs.existsSync(configFile) ? chalk.green('✓ Yes') : chalk.yellow('✗ No')}`);

        if (fs.existsSync(configFile)) {
            const apiKey = getApiKey();
            console.log(`API key set: ${apiKey ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);
            if (apiKey) {
                console.log(`API key: ${chalk.dim(apiKey.substring(0, 10) + '...')}`);
            }
        }
        console.log(chalk.cyan('─'.repeat(50)) + '\n');
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
    });

program.parse();
