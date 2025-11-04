import { execSync } from 'child_process';
import { promptMultiSelect } from '../utils/interactive.js';

export function initGitRepo(cwd) {
    try {
        execSync('git init', {
            cwd: cwd || process.cwd(),
            stdio: 'pipe'
        });
    } catch (error) {
        throw new Error(`Failed to initialize git repository: ${error.message}`);
    }
}

export function stageAllFiles(cwd) {
    try {
        execSync('git add .', {
            cwd: cwd || process.cwd(),
            stdio: 'pipe'
        });
    } catch (error) {
        throw new Error(`Failed to stage files: ${error.message}`);
    }
}

export async function stageInteractive(cwd) {
    try {
        const output = execSync('git ls-files --others --exclude-standard', {
            encoding: 'utf-8',
            cwd: cwd || process.cwd()
        });

        const files = output
            .split('\n')
            .filter(line => line.trim())
            .map(line => ({
                display: line,
                path: line
            }));

        if (files.length === 0) {
            throw new Error('No files available to stage');
        }

        const selected = await promptMultiSelect(
            'Select files to stage:',
            files.map(f => f.display)
        );

        const selectedFiles = selected.map(display => {
            const found = files.find(f => f.display === display);
            return found ? found.path : display;
        });

        selectedFiles.forEach(file => {
            execSync(`git add "${file}"`, {
                cwd: cwd || process.cwd(),
                stdio: 'pipe'
            });
        });

        return selectedFiles;
    } catch (error) {
        if (error.message.includes('No files available')) {
            throw error;
        }
        throw new Error(`Failed to stage files interactively: ${error.message}`);
    }
}

export function getDiffStats(cwd) {
    try {
        const output = execSync('git diff --cached --stat', {
            encoding: 'utf-8',
            cwd: cwd || process.cwd()
        });

        if (!output.trim()) {
            return { insertions: 0, deletions: 0, total: 0, files: 0 };
        }

        const lines = output.split('\n').filter(l => l.trim());
        if (lines.length === 0) {
            return { insertions: 0, deletions: 0, total: 0, files: 0 };
        }

        const lastLine = lines[lines.length - 1];

        const fileMatch = lastLine.match(/(\d+) files? changed/);
        const insertMatch = lastLine.match(/(\d+) insertion/);
        const deleteMatch = lastLine.match(/(\d+) deletion/);

        const files = fileMatch ? parseInt(fileMatch[1]) : 0;
        const insertions = insertMatch ? parseInt(insertMatch[1]) : 0;
        const deletions = deleteMatch ? parseInt(deleteMatch[1]) : 0;

        return {
            files,
            insertions,
            deletions,
            total: insertions + deletions
        };
    } catch (error) {
        throw new Error(`Failed to get diff stats: ${error.message}`);
    }
}