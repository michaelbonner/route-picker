import type { Route, Trip } from '@prisma/client';
import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouteCard from './RouteCard.svelte';

// Type assertion for Svelte 5 compatibility with testing library
const RouteCardComponent = RouteCard as unknown;

describe('RouteCard basic functionality', () => {
	const mockRoute: Route & { trips: Trip[] } = {
		id: 1,
		name: 'Test Route',
		userId: 1,
		trips: [],
		createdAt: new Date(),
		updatedAt: new Date()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn() as typeof fetch;
	});

	afterEach(() => {
		// Clean up DOM between tests
		document.body.innerHTML = '';
	});

	it('should render route name', () => {
		render(RouteCardComponent, { props: { route: mockRoute } });

		expect(screen.getByText('Test Route')).toBeInTheDocument();
	});

	it('should show edit button', () => {
		render(RouteCardComponent, { props: { route: mockRoute } });

		const editButton = screen.getByRole('button', { name: /edit route name/i });
		expect(editButton).toBeInTheDocument();
	});
});
