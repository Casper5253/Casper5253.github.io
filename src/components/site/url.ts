/** Prefixes a site-root path with the deployed base, so links work on a user page or a project page. */
export const href = (path: string): string => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
