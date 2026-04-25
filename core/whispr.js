import { generateCommitSuggestion } from '../core/genCommit.js';
import { getGitStatus } from '../subsidiary/gitCheck.js';
import { initGitRepo, stageAllFiles, stageInteractive, getDiffStats } from '../subsidiary/gitActions.js';
import { promptUser, promptChoice, promptInput } from '../utils/interactive.js';
import { parseDiff } from './diffExtractor.js';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { execSync } from 'child_process';

function displayCommitMessage(message, description = '', stats = null) {
    let content = chalk.bold.white(message);

    if (description && description.trim()) {
        content += '\n\n' + chalk.dim('Description (reference only):') + '\n';
        content += chalk.dim(description.trim());
    }

    if (stats && stats.total > 0) {
        content += '\n\n' + chalk.dim('─'.repeat(50)) + '\n';
        content += chalk.dim(`📊 ${stats.files} file(s) changed, `) +
            chalk.green(`+${stats.insertions}`) + chalk.dim(' insertions, ') +
            chalk.red(`-${stats.deletions}`) + chalk.dim(' deletions');
    }

    console.log('\n' + boxen(
        content,
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            title: chalk.cyan.bold('📝 Generated Commit Message'),
            titleAlignment: 'center'
        }
    ));
}

function commitChanges(message) {
    try {
        const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        execSync(`git commit -m "${escapedMessage}"`, {
            stdio: 'pipe',
            encoding: 'utf-8'
        });

        const commitHash = execSync('git rev-parse --short HEAD', {
            encoding: 'utf-8'
        }).trim();

        return { success: true, hash: commitHash };
    } catch (error) {
        console.error(chalk.red(`\nCommit failed: ${error.message}`));
        return { success: false, hash: null };
    }
}

/**
 * Main interactive flow for generating commit messages
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {string} [options.model] - AI model to use
 * @param {string} [options.context] - Additional context
 */
export async function runWhisprFlow(options = {}) {
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\n✋ Operation cancelled by user.'));
        process.exit(0);
    });

    console.log('\n' + chalk.bold.cyan('🔍 Pre-flight Checks'));
    console.log(chalk.dim('─'.repeat(50)));

    const gitStatus = getGitStatus();

    if (gitStatus.isRepo) {
        console.log(chalk.green('✓') + ' Git repository initialized');
    } else {
        console.log(chalk.red('✗') + ' Not a git repository');
    }

    if (gitStatus.hasStaged) {
        console.log(chalk.green('✓') + ' Staged files found');
    } else {
        console.log(chalk.yellow('⚠') + ' No staged files');
    }

    console.log(chalk.dim('─'.repeat(50)) + '\n');

    if (!gitStatus.isRepo) {
        console.log(chalk.red('✗ Not a git repository'));
        const shouldInit = await promptUser('Initialize git repository?', true);
        if (shouldInit) {
            const spinner = ora('Initializing git repository...').start();
            await initGitRepo();
            spinner.succeed(chalk.green('✓ Git repository initialized'));
            console.log(chalk.dim('\nRun whispr again after making and staging changes.'));
            return;
        } else {
            console.log(chalk.yellow('Cancelled.'));
            process.exit(0);
        }
    }

    if (!gitStatus.hasStaged) {
        console.log(chalk.yellow('\n⚠ No staged files found.'));
        const choice = await promptChoice(
            [
                'Stage all changes (git add .)',
                'Stage specific files (interactive)',
                'Cancel'
            ],
            'What would you like to do?'
        );

        if (choice === 0) {
            const spinner = ora('Staging all changes...').start();
            await stageAllFiles();
            spinner.succeed(chalk.green('✓ All changes staged'));
        } else if (choice === 1) {
            const staged = await stageInteractive();
            console.log(chalk.green(`✓ ${staged.length} file(s) staged`));
        } else {
            console.log(chalk.yellow('Cancelled.'));
            process.exit(0);
        }
    }

    console.log('\n' + chalk.bold.cyan('✅ Ready to Generate'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.green('✓') + ' Git repository: Active');
    console.log(chalk.green('✓') + ' Staged changes: Ready');

    const diffText = await parseDiff({ staged: true });
    const lineCount = diffText.split('\n').length;

    let diffStats = null;
    try {
        diffStats = getDiffStats();
        if (diffStats && diffStats.total > 0) {
            console.log(chalk.green('✓') + ` Changes detected: ${diffStats.files} file(s), ${diffStats.total} line(s)`);
        }
    } catch (error) {
    }

    console.log(chalk.dim('─'.repeat(50)) + '\n');

    if (lineCount > 500) {
        console.log(chalk.yellow(`\n⚠ Large changeset detected (${lineCount} lines).`));
        console.log(chalk.dim('Consider splitting into smaller commits for better history.'));
        const shouldContinue = await promptUser('Continue anyway?', false);
        if (!shouldContinue) {
            console.log(chalk.yellow('Cancelled.'));
            process.exit(0);
        }
    }

    let spinner = ora('🤖 Generating commit message...').start();
    let message;
    let description = '';
    let additionalContext = '';

    try {
        const suggestion = await generateCommitSuggestion({ staged: true, additionalContext });
        message = suggestion.title;
        description = suggestion.description;
        spinner.succeed(chalk.green('✓ Commit message generated'));
    } catch (error) {
        spinner.fail(chalk.red('✗ Failed to generate commit message'));
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
    }

    let confirmed = false;
    while (!confirmed) {
        displayCommitMessage(message, description, diffStats);

        console.log(chalk.dim('\nOptions:'));
        console.log(chalk.green('[y]') + ' Commit  ' +
            chalk.yellow('[r]') + ' Regenerate  ' +
            chalk.blue('[e]') + ' Edit context  ' +
            chalk.magenta('[p]') + ' Copy message  ' +
            chalk.red('[c]') + ' Cancel');

        let action;
        while (action === undefined) {
            const answer = await promptInput('Choose an option (y/r/e/p/c): ');
            action = ({
                'y': 0,
                'r': 1,
                'e': 2,
                'p': 3,
                'c': 4
            })[answer.toLowerCase()];

            if (action === undefined) {
                console.log(chalk.red('Invalid option. Please use y, r, e, p, or c.'));
            }
        }

        if (action === 0) {
            spinner = ora('Committing changes...').start();
            const result = commitChanges(message);

            if (result.success) {
                spinner.succeed(chalk.green('✓ Changes committed successfully!'));
                console.log(chalk.dim(`   Commit hash: ${chalk.cyan(result.hash)}`));
                confirmed = true;
            } else {
                spinner.fail(chalk.red('✗ Failed to commit changes'));
                process.exit(1);
            }

        } else if (action === 1) {
            spinner = ora('🔄 Regenerating commit message...').start();
            try {
                const suggestion = await generateCommitSuggestion({ staged: true, additionalContext });
                message = suggestion.title;
                description = suggestion.description;
                spinner.succeed(chalk.green('✓ Commit message regenerated'));
            } catch (error) {
                spinner.fail(chalk.red('✗ Failed to regenerate'));
                console.error(chalk.red(`Error: ${error.message}`));
            }

        } else if (action === 2) {
            additionalContext = await promptInput(
                'Briefly describe what you changed:',
                additionalContext
            );

            spinner = ora('🔄 Regenerating with context...').start();
            try {
                const suggestion = await generateCommitSuggestion({
                    staged: true,
                    additionalContext
                });
                message = suggestion.title;
                description = suggestion.description;
                spinner.succeed(chalk.green('✓ Commit message regenerated'));
            } catch (error) {
                spinner.fail(chalk.red('✗ Failed to regenerate'));
                console.error(chalk.red(`Error: ${error.message}`));
            }

        } else if (action === 3) {
            // Copy to clipboard
            try {
                // Extract just the commit message line (first line)
                const commitLine = message.split('\n')[0];

                // Use PowerShell on Windows to copy to clipboard
                if (process.platform === 'win32') {
                    execSync(`powershell -command "Set-Clipboard -Value '${commitLine.replace(/'/g, "''")}'"`);
                } else {
                    // For Unix-like systems, try different clipboard commands
                    try {
                        execSync(`echo "${commitLine}" | pbcopy`); // macOS
                    } catch {
                        try {
                            execSync(`echo "${commitLine}" | xclip -selection clipboard`); // Linux with xclip
                        } catch {
                            execSync(`echo "${commitLine}" | xsel --clipboard --input`); // Linux with xsel
                        }
                    }
                }
                console.log(chalk.green('✓ Commit message copied to clipboard!'));
            } catch (error) {
                console.log(chalk.yellow('⚠ Could not copy to clipboard. Message:'));
                console.log(chalk.cyan(message.split('\n')[0]));
            }

        } else {
            console.log(chalk.yellow('\nCancelled.'));
            process.exit(0);
        }
    }
}

export { displayCommitMessage, commitChanges };