import { defaultTransformer } from '../src/defaultTransformer';

describe('Default Transformer', () => {
	test('should support undefined', () => {
		expect(defaultTransformer(undefined)).toEqual(undefined);
	});

	test('should support null', () => {
		expect(defaultTransformer(null)).toEqual(undefined);
	});

	test('should support object', () => {
		expect(defaultTransformer({})).toEqual({});
	});

	test('should support string', () => {
		expect(defaultTransformer('test')).toEqual('test');
	});

	test('should support boolean', () => {
		expect(defaultTransformer(true)).toEqual(true);
	});

	test('should support number', () => {
		expect(defaultTransformer(42)).toEqual(42);
	});

	test('should support date', () => {
		const dt = new Date();
		expect(defaultTransformer(dt)).toEqual(dt);
	});
});
