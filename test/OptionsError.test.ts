import { OptionsError, ConfigurationClientOptions } from '../src';

describe('OptionsError', () => {
	let error: OptionsError<string>;
	const options: ConfigurationClientOptions<string> = {
		endpoints: [],
		callback: () => Promise.resolve('Test'),
	};

	beforeAll(() => {
		error = new OptionsError<string>('Options Test', options);
	});

	test('should be instance of OptionsError', () => {
		expect(error).toBeInstanceOf(OptionsError);
	});

	test('should contain options', () => {
		expect(error.options).toEqual(options);
	});
});
