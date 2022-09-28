import { FetchError } from '../src';

describe('FetchError', () => {
	let error: FetchError;
	const endpoint = 'https://endpoint.com';

	beforeAll(() => {
		error = new FetchError(new Error('Testing'), endpoint);
	});

	test('should be instance of FetchError', () => {
		expect(error).toBeInstanceOf(FetchError);
	});

	test('should contain the endpoint', () => {
		expect(error.endpoint).toEqual(endpoint);
	});

	test('should contain the original error', () => {
		expect(error.error).toBeInstanceOf(Error);
	});
});
