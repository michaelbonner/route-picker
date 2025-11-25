import { fail } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the db import
vi.mock('$lib/server/db', () => ({
	db: {
		insert: vi.fn()
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

describe('createGroup server action', () => {
	const mockRequest = {
		formData: vi.fn()
	};

	const mockLocals = {
		session: null as any
	};

    // Helper to mock chainable insert
	const mockInsertChain = () => {
		const valuesMock = vi.fn().mockResolvedValue({ success: true });
		(db.insert as any).mockReturnValue({ values: valuesMock });
		return { valuesMock };
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

    it('should successfully create group with valid input', async () => {
        const formData = new Map([['name', 'New Group']]);
        mockRequest.formData.mockResolvedValue(formData);
        mockLocals.session = { userId: 1 };

        const { valuesMock } = mockInsertChain();

        const result = await actions.createGroup({
            request: mockRequest as unknown as Request,
            locals: mockLocals as unknown as App.Locals
        });

        expect(result).toEqual({ success: true });
        expect(valuesMock).toHaveBeenCalledWith({
            userId: 1,
            name: 'New Group'
        });
    });

    it('should trim whitespace from group name', async () => {
        const formData = new Map([['name', '  Trimmed Group  ']]);
        mockRequest.formData.mockResolvedValue(formData);
        mockLocals.session = { userId: 1 };

        const { valuesMock } = mockInsertChain();

        const result = await actions.createGroup({
            request: mockRequest as unknown as Request,
            locals: mockLocals as unknown as App.Locals
        });

        expect(result).toEqual({ success: true });
        expect(valuesMock).toHaveBeenCalledWith({
            userId: 1,
            name: 'Trimmed Group'
        });
    });

    it('should fail when name is empty', async () => {
        const formData = new Map([['name', '   ']]);
        mockRequest.formData.mockResolvedValue(formData);
        mockLocals.session = { userId: 1 };

        await actions.createGroup({
            request: mockRequest as unknown as Request,
            locals: mockLocals as unknown as App.Locals
        });

        expect(fail).toHaveBeenCalledWith(400, { error: 'Name is required' });
    });

    it('should fail when name is too long', async () => {
        const longName = 'a'.repeat(101);
        const formData = new Map([['name', longName]]);
        mockRequest.formData.mockResolvedValue(formData);
        mockLocals.session = { userId: 1 };

        await actions.createGroup({
            request: mockRequest as unknown as Request,
            locals: mockLocals as unknown as App.Locals
        });

        expect(fail).toHaveBeenCalledWith(400, { error: 'Name too long' });
    });

    it('should fail when unauthorized', async () => {
        const formData = new Map([['name', 'New Group']]);
        mockRequest.formData.mockResolvedValue(formData);
        mockLocals.session = null;

        await actions.createGroup({
            request: mockRequest as unknown as Request,
            locals: mockLocals as unknown as App.Locals
        });

        expect(fail).toHaveBeenCalledWith(401, { error: 'Unauthorized' });
    });
});
