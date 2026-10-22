import { deserialize } from '$app/forms';

/**
 * Calls a form action on the home page and reports whether it succeeded.
 * Actions here signal soft failures by returning `{ success: false }`.
 */
export const postAction = async (action: string, fields: Record<string, string | number>) => {
	const formData = new FormData();
	for (const [name, value] of Object.entries(fields)) formData.append(name, value.toString());

	try {
		const response = await fetch(`/?/${action}`, {
			method: 'POST',
			body: formData,
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());
		return result.type === 'success' && result.data?.success !== false;
	} catch (error) {
		console.error(`Action ${action} failed:`, error);
		return false;
	}
};
