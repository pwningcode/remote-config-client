import { ConfigurationFailedError } from '../src';

describe('ConfigurationFailedError', () => {
	let error: ConfigurationFailedError;
	const endpoints = ['https://endpoint.com', 'https://endpoint2.com'];

	beforeAll(() => {
		error = new ConfigurationFailedError(endpoints);
	});

	test('should be instance of ConfigurationFailedError', () => {
		expect(error).toBeInstanceOf(ConfigurationFailedError);
	});

	test('should contain the endpoints', () => {
		expect(error.endpoints).toEqual(endpoints);
	});
});
