import { fail } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// Mock the db import
vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			user: {
				findFirst: vi.fn()
			},
			route: {
				findFirst: vi.fn()
			}
		},
		update: vi.fn(),
		insert: vi.fn(),
		delete: vi.fn()
	}
}));

// Mock SvelteKit's fail function
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		fail: vi.fn((status, body) => ({ status, body }))
	};
});

// Import after mocking
import { db } from '$lib/server/db';
import { actions } from '../../routes/+page.server.js';

describe('updateRouteName server action', () => {
	const mockRequest = {
		formData: vi.fn()
	};

	const mockLocals = {
		auth: vi.fn()
	};

	// Helper to mock chainable update
	const mockUpdateChain = () => {
		const whereMock = vi.fn().mockResolvedValue({ success: true });
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		(db.update as any).mockReturnValue({ set: setMock });
		return { setMock, whereMock };
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('successful route name updates', () => {
		it('should successfully update route name with valid input', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'Updated Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			const mockUser = {
				id: 1,
				email: 'test@example.com',
				provider: '',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.user.findFirst as any).mockResolvedValue(mockUser);

			const mockRoute = {
				id: 1,
				userId: 1,
				name: 'Old Route Name',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.route.findFirst as any).mockResolvedValue(mockRoute);

			const { setMock, whereMock } = mockUpdateChain();

			// Act
			const result = await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(result).toEqual({ success: true });
			expect(db.update).toHaveBeenCalled();
			expect(setMock).toHaveBeenCalledWith({ name: 'Updated Route Name' });
			// We can't easily check the exact arguments of where() because it uses Drizzle operators
			// but we verify the chain was called
			expect(whereMock).toHaveBeenCalled();
		});

		it('should trim whitespace from route name', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', '  Trimmed Route Name  ']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			const mockUser = {
				id: 1,
				email: 'test@example.com',
				provider: '',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.user.findFirst as any).mockResolvedValue(mockUser);

			const mockRoute = {
				id: 1,
				userId: 1,
				name: 'Old Route Name',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.route.findFirst as any).mockResolvedValue(mockRoute);

			const { setMock, whereMock } = mockUpdateChain();

			// Act
			const result = await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(result).toEqual({ success: true });
			expect(setMock).toHaveBeenCalledWith({ name: 'Trimmed Route Name' });
		});
	});

	describe('authentication and authorization validation', () => {
		it('should fail when user is not authenticated', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);
			mockLocals.auth.mockResolvedValue(null);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(401, { error: 'Authentication required' });
		});

		it('should fail when session has no user email', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);
			mockLocals.auth.mockResolvedValue({ user: {} });

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(401, { error: 'Authentication required' });
		});

		it('should fail when user is not found in database', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);
			(db.query.user.findFirst as any).mockResolvedValue(null);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(401, { error: 'User not found' });
		});

		it('should fail when route is not found', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '999'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			const mockUser = {
				id: 1,
				email: 'test@example.com',
				provider: '',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.user.findFirst as any).mockResolvedValue(mockUser);
			(db.query.route.findFirst as any).mockResolvedValue(null);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(404, { error: 'Route not found' });
		});

		it('should fail when user does not own the route', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			const mockUser = {
				id: 1,
				email: 'test@example.com',
				provider: '',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.user.findFirst as any).mockResolvedValue(mockUser);

			// Route belongs to different user
			const mockRoute = {
				id: 1,
				userId: 2,
				name: 'Route Name',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.route.findFirst as any).mockResolvedValue(mockRoute);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(403, {
				error: 'You do not have permission to edit this route'
			});
		});
	});

	describe('input validation and sanitization', () => {
		it('should fail when routeId is missing', async () => {
			// Arrange
			const formData = new Map([['newName', 'New Route Name']]);
			mockRequest.formData.mockResolvedValue(formData);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(400, {
				error: 'Route ID and new name are required'
			});
		});

		it('should fail when newName is missing', async () => {
			// Arrange
			const formData = new Map([['routeId', '1']]);
			mockRequest.formData.mockResolvedValue(formData);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(400, {
				error: 'Route ID and new name are required'
			});
		});

		it('should fail when routeId is not a valid number', async () => {
			// Arrange
			const formData = new Map([
				['routeId', 'invalid'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(400, { error: 'Invalid route ID' });
		});

		it('should fail when newName is empty after trimming', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', '   ']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(400, {
				error: 'Route name cannot be empty'
			});
		});

		it('should fail when newName exceeds 100 characters', async () => {
			// Arrange
			const longName = 'a'.repeat(101);
			const formData = new Map([
				['routeId', '1'],
				['newName', longName]
			]);
			mockRequest.formData.mockResolvedValue(formData);

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(400, {
				error: 'Route name cannot exceed 100 characters'
			});
		});
	});

	describe('error handling for various failure scenarios', () => {
		it('should handle database errors gracefully', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			const mockUser = {
				id: 1,
				email: 'test@example.com',
				provider: '',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.user.findFirst as any).mockResolvedValue(mockUser);

			const mockRoute = {
				id: 1,
				userId: 1,
				name: 'Old Route Name',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.route.findFirst as any).mockResolvedValue(mockRoute);

			// Simulate database error
			const setMock = vi.fn().mockReturnValue({
				where: vi.fn().mockRejectedValue(new Error('Database connection failed'))
			});
			(db.update as any).mockReturnValue({ set: setMock });

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(500, {
				error: 'An unexpected error occurred'
			});
		});

		it('should handle auth service errors gracefully', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			// Simulate auth service error
			mockLocals.auth.mockRejectedValue(new Error('Auth service unavailable'));

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(500, {
				error: 'An unexpected error occurred'
			});
		});

		it('should handle form data parsing errors gracefully', async () => {
			// Arrange
			mockRequest.formData.mockRejectedValue(new Error('Invalid form data'));

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(500, {
				error: 'An unexpected error occurred'
			});
		});

		it('should handle user lookup database errors gracefully', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			// Simulate database error during user lookup
			(db.query.user.findFirst as any).mockRejectedValue(new Error('User lookup failed'));

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(500, {
				error: 'An unexpected error occurred'
			});
		});

		it('should handle route lookup database errors gracefully', async () => {
			// Arrange
			const formData = new Map([
				['routeId', '1'],
				['newName', 'New Route Name']
			]);
			mockRequest.formData.mockResolvedValue(formData);

			const mockSession = { user: { email: 'test@example.com' } };
			mockLocals.auth.mockResolvedValue(mockSession);

			const mockUser = {
				id: 1,
				email: 'test@example.com',
				provider: '',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			(db.query.user.findFirst as any).mockResolvedValue(mockUser);

			// Simulate database error during route lookup
			(db.query.route.findFirst as any).mockRejectedValue(new Error('Route lookup failed'));

			// Act
			await actions.updateRouteName({
				request: mockRequest as unknown as Request,
				locals: mockLocals as unknown as App.Locals
			});

			// Assert
			expect(fail).toHaveBeenCalledWith(500, {
				error: 'An unexpected error occurred'
			});
		});
	});
});
