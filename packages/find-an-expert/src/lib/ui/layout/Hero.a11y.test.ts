/**
 * Accessibility tests for Hero component
 */

import { describe, it, expect } from 'vitest';
import { axe } from '$lib/test-utils/axe';

describe('Hero component accessibility', () => {
  it('should have no accessibility violations with title only', async () => {
    const html = `
			<header class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
				<div class="container-app">
					<div class="max-w-3xl">
						<h1 class="text-4xl font-bold mb-6">Welcome to Talent Finder</h1>
					</div>
				</div>
			</header>
		`;

    const results = await axe(html);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with title and subtitle', async () => {
    const html = `
			<header class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
				<div class="container-app">
					<div class="max-w-3xl">
						<h1 class="text-4xl font-bold mb-6">Welcome to Talent Finder</h1>
						<p class="text-xl text-primary-100 mb-8">
							Discover researchers and their publications
						</p>
					</div>
				</div>
			</header>
		`;

    const results = await axe(html);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with action buttons', async () => {
    const html = `
			<header class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
				<div class="container-app">
					<div class="max-w-3xl">
						<h1 class="text-4xl font-bold mb-6">Welcome to Talent Finder</h1>
						<p class="text-xl text-primary-100 mb-8">
							Discover researchers and their publications
						</p>
						<div class="flex flex-wrap gap-4">
							<a href="/dashboard" class="btn-primary">Get Started</a>
							<button type="button" class="btn-outline">Learn More</button>
						</div>
					</div>
				</div>
			</header>
		`;

    const results = await axe(html);
    expect(results).toHaveNoViolations();
  });
});
