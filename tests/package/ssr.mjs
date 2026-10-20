import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { SKYLINE_DEFAULTS } from 'github-contribution-skyline';
import { GitHubSkyline } from 'github-contribution-skyline/react';
import { defineGitHubSkyline } from 'github-contribution-skyline/element';
import { fetchGitHubContributions } from 'github-contribution-skyline/server';
assert.equal(typeof fetchGitHubContributions, 'function');
assert.equal(typeof window, 'undefined');
defineGitHubSkyline(); // Optional entry point imports safely without a DOM.
assert.equal(SKYLINE_DEFAULTS.heightScale, 1.4);
assert.equal(SKYLINE_DEFAULTS.forwardMs, 650);
assert.equal(renderToString(createElement(GitHubSkyline, { contributions: [] })), '<div></div>');
assert.match(readFileSync('node_modules/github-contribution-skyline/dist/react.js', 'utf8'), /^["']use client["'];/);
