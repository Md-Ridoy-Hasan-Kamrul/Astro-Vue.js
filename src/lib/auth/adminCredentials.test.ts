import { describe, expect, it } from 'vitest';
import { ADMIN_EMAIL, ADMIN_PASSWORD, isAdminCredentials } from './adminCredentials';

describe('adminCredentials', () => {
	it('matches the permanent admin pair', () => {
		expect(isAdminCredentials(ADMIN_EMAIL, ADMIN_PASSWORD)).toBe(true);
		expect(isAdminCredentials('ADMIN@CREXTIO.COM', ADMIN_PASSWORD)).toBe(true);
	});

	it('rejects other credentials', () => {
		expect(isAdminCredentials(ADMIN_EMAIL, 'wrong')).toBe(false);
		expect(isAdminCredentials('user@example.com', ADMIN_PASSWORD)).toBe(false);
	});
});
