import simpleGit from 'simple-git';

/** 
 * @param {Object} [opts]
 * @param {boolean} [opts.staged=true] - Use staged diff (--cached) when true; otherwise use working tree args.
 * @param {string[]} [opts.args=[]] - Additional diff args to pass to git.diff
 * @param {string} [opts.cwd] - Working directory / repository path for simple-git
 * @param {boolean} [opts.verbose=false] - If true, print the diff to debug output
 * @returns {Promise<string>} The diff text
 */

export async function parseDiff(opts = {}) {
    const { staged = true, args = [], cwd, verbose = false } = opts;

    const git = simpleGit(cwd);

    try {
        const diffArgs = staged ? ["--cached", ...args] : args;
        const diff = await git.diff(diffArgs);

        if (verbose) console.debug(diff);

        return diff;
    } catch (err) {
        throw err;
    }
}