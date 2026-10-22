// Remembers which route sections the user has collapsed, per browser.
const key = (sectionId: string) => `route-picker:collapsed:${sectionId}`;

export const isCollapsed = (sectionId: string) => {
	try {
		return localStorage.getItem(key(sectionId)) === '1';
	} catch {
		return false;
	}
};

export const setCollapsed = (sectionId: string, collapsed: boolean) => {
	try {
		if (collapsed) localStorage.setItem(key(sectionId), '1');
		else localStorage.removeItem(key(sectionId));
	} catch {
		// storage blocked; the section just won't remember its state
	}
};
