import { execSync } from 'child_process';

export const getGitStatus = (cwd) => {
    const isRepo = isGitRepository(cwd);

    if (!isRepo) {
        return {
            isRepo: false,
            hasStaged: false,
            hasUnstaged: false,
            hasChanges: false
        };
    }

    const hasStaged = hasStagedChanges(cwd);
    const hasUnstaged = hasUnstagedChanges(cwd);

    return {
        isRepo: true,
        hasStaged,
        hasUnstaged,
        hasChanges: hasStaged || hasUnstaged
    };
};

export const isGitRepository = (cwd) => {
    try {
        execSync('git rev-parse --is-inside-work-tree', {
            stdio: 'ignore',
            cwd: cwd || process.cwd()
        });
        return true;
    } catch {
        return false;
    }
};

export const hasStagedChanges = (cwd) => {
    if (!isGitRepository(cwd)) {
        throw new Error('Not a git repository');
    }

    try {
        execSync('git diff --cached --quiet', {
            stdio: 'ignore',
            cwd: cwd || process.cwd()
        });
        return false;
    } catch (error) {
        if (error.status === 1) {
            return true;
        }
        throw error;
    }
};

export const hasUnstagedChanges = (cwd) => {
    if (!isGitRepository(cwd)) {
        throw new Error('Not a git repository');
    }

    try {
        execSync('git diff --quiet', {
            stdio: 'ignore',
            cwd: cwd || process.cwd()
        });
        return false;
    } catch (error) {
        if (error.status === 1) {
            return true;
        }
        throw error;
    }
};
