import { defaultValidator } from '../src/defaultValidator';

describe('Default Validator', () => {
	test('should support undefined', async () => {
		await expect(defaultValidator(undefined)).resolves.toEqual(undefined);
	});

	test('should support null', async () => {
		await expect(defaultValidator(null)).resolves.toEqual(undefined);
	});

	test('should support object', async () => {
		await expect(defaultValidator({})).resolves.toEqual({});
	});

	test('should support string', async () => {
		await expect(defaultValidator('test')).resolves.toEqual('test');
	});

	test('should support boolean', async () => {
		await expect(defaultValidator(true)).resolves.toEqual(true);
	});

	test('should support number', async () => {
		await expect(defaultValidator(42)).resolves.toEqual(42);
	});

	test('should support date', async () => {
		const dt = new Date();
		await expect(defaultValidator(dt)).resolves.toEqual(dt);
	});
});
