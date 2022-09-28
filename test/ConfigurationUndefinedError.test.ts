import { ConfigurationUndefinedError } from '../src';

describe('ConfigurationUndefinedError', () => {
	let error: ConfigurationUndefinedError;
	const endpoint = 'https://endpoint.com';

	beforeAll(() => {
		error = new ConfigurationUndefinedError(endpoint);
	});

	test('should be instance of ConfigurationUndefinedError', () => {
		expect(error).toBeInstanceOf(ConfigurationUndefinedError);
	});

	test('should contain the endpoint', () => {
		expect(error.endpoint).toEqual(endpoint);
	});
});
