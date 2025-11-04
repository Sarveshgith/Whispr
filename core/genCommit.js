import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseDiff } from "./diffExtractor.js";
import { config } from 'dotenv';
import { buildPrompt } from '../utils/genPrompts.js';
import { getGitStatus, hasStagedChanges } from '../subsidiary/gitCheck.js';
import { getApiKey } from '../utils/saveApiKey.js';

config();

// if (!process.env.GEMINI_API_KEY) {
//     throw new Error('GEMINI_API_KEY environment variable is required. Please set it in your .env file.');
// }
const api_key = getApiKey()

const genAI = new GoogleGenerativeAI(api_key || process.env.GEMINI_API_KEY);

/**
 * Generate a commit message using AI based on git diff.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} [options.verbose=false] - Enable verbose logging
 * @param {boolean} [options.staged=true] - Use staged changes (--cached)
 * @param {string[]} [options.diffArgs=[]] - Additional git diff arguments
 * @param {string} [options.cwd] - Working directory for git commands
 * @param {string} [options.model="gemini-2.5-flash-lite"] - Gemini model to use
 * @param {string} [options.additionalContext=''] - Additional context from user to guide commit message
 * @returns {Promise<string>} Generated commit message
 * @throws {Error} If not in git repo, no changes, or AI fails
 */
export async function generateCommitMessage(options = {}) {
    const {
        verbose = false,
        staged = true,
        diffArgs = [],
        cwd,
        model: modelName = "gemini-2.5-flash-lite",
        additionalContext = ''
    } = options;

    try {
        const gitStatus = getGitStatus(cwd);

        if (!gitStatus.isRepo) {
            throw new Error('Not a git repository. Please run this command inside a git repository.');
        }

        if (verbose) {
            console.debug('Git status:', gitStatus);
        }

        if (staged && !gitStatus.hasStaged) {
            throw new Error('No staged changes found. Please stage your changes with "git add" first.');
        }

        if (!staged && !gitStatus.hasUnstaged) {
            throw new Error('No unstaged changes found. Please make some changes or use --staged for staged changes.');
        }

        if (!gitStatus.hasChanges) {
            throw new Error('No changes to analyze. Working tree is clean.');
        }

        const diffText = await parseDiff({
            staged,
            args: diffArgs,
            cwd,
            verbose
        });

        if (!diffText?.trim()) {
            throw new Error('Git diff returned empty. No changes to analyze.');
        }

        if (verbose) {
            console.debug(`Analyzing ${staged ? 'staged' : 'unstaged'} changes...`);
        }
        const model = genAI.getGenerativeModel({ model: modelName });

        let diffWithContext = diffText;
        if (additionalContext && additionalContext.trim()) {
            diffWithContext += `\n\nAdditional context from developer: ${additionalContext}`;
        }

        const promptText = buildPrompt(diffWithContext);

        const result = await model.generateContent(promptText);

        if (!result?.response) {
            throw new Error('Failed to generate commit message: No response from AI');
        }

        const response = result.response.text();

        if (verbose) {
            console.debug('Generated commit message:', response);
        }

        return response;
    } catch (error) {
        const wrappedError = new Error(
            `Failed to generate commit message: ${error.message}`,
            { cause: error }
        );
        wrappedError.originalError = error;
        throw wrappedError;
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    generateCommitMessage({ verbose: true })
        .then(message => {
            console.log('\nGenerated Commit Message:');
            console.log('─'.repeat(50));
            console.log(message);
            console.log('─'.repeat(50));
        })
        .catch(error => {
            console.error('Error:', error.message);
            process.exit(1);
        });
}