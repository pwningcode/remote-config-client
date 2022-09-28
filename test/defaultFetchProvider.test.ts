import 'isomorphic-fetch';
import { defaultFetchProvider } from '../src/defaultFetchProvider';

describe('defaultFetchProvider', () => {
	const provider = defaultFetchProvider;

	test.skip('should fetch some json', async () => {
		const data = await provider<object>('https://dummyjson.com/products/1');
		expect(data).toBeObject();
		expect(data).toContainEntry(['id', 1]);
	});

	test('should handle 404', async () => {
		expect.assertions(1);
		await expect(provider<object>('')).rejects.toThrow(Error);
	});
});
