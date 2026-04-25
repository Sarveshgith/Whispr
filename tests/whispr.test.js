import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPrompt } from '../utils/genPrompts.js';
import { extractCommitTitle, extractCommitSuggestion } from '../core/genCommit.js';

test('buildPrompt requests title plus description format', () => {
    const prompt = buildPrompt('diff --git a/a.js b/a.js');

    assert.match(prompt, /Generate exactly ONE commit title and ONE short description\./);
    assert.match(prompt, /Description:/i);
});

test('extractCommitTitle returns conventional commit line from mixed response', () => {
    const raw = `fix: handle empty config file gracefully\nDescription: Prevents crash when config is malformed.`;

    const title = extractCommitTitle(raw);

    assert.equal(title, 'fix: handle empty config file gracefully');
});

test('extractCommitSuggestion returns title and description', () => {
    const raw = `feat: add --context flag for guided commit generation\nDescription: Lets users guide commit tone.`;

    const suggestion = extractCommitSuggestion(raw);

    assert.equal(suggestion.title, 'feat: add --context flag for guided commit generation');
    assert.equal(suggestion.description, 'Lets users guide commit tone.');
});

test('extractCommitSuggestion falls back to default description when missing', () => {
    const raw = `chore: tidy internal imports`;

    const suggestion = extractCommitSuggestion(raw);

    assert.equal(suggestion.title, 'chore: tidy internal imports');
    assert.equal(suggestion.description, 'No additional description provided by AI.');
});

test('extractCommitTitle throws for empty responses', () => {
    assert.throws(() => extractCommitTitle('   '), /empty commit message/i);
});
