import { DefaultCacheProvider } from '../src/DefaultCacheProvider';

describe('DefaultCacheProvider', () => {
	let provider: DefaultCacheProvider<string>;

	beforeAll(() => {
		provider = new DefaultCacheProvider<string>();
	});

	test('should be instance of DefaultCacheProvider', () => {
		expect(provider).toBeInstanceOf(DefaultCacheProvider);
	});

	test('should be undefined initially', async () => {
		expect(await provider.read()).toBeUndefined();
	});

	test('should cache a value', async () => {
		await provider.write('Testing');
		expect(await provider.read()).toEqual('Testing');
	});

	test('should update a value', async () => {
		await provider.write('Testing');
		expect(await provider.read()).toEqual('Testing');

		await provider.write('Testing 2');
		expect(await provider.read()).toEqual('Testing 2');
	});
});
