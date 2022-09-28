import 'isomorphic-fetch';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';

import {
	ConfigClient,
	ConfigurationUndefinedError,
	FetchError,
	OptionsError,
	ConfigurationEvent,
	ConfigurationFailedError,
	ConfigurationClientOptions,
	CacheProvider,
} from '../src';

enableFetchMocks();

const testConfig = { flag: true };
type ConfigType = typeof testConfig;

let client: ConfigClient<ConfigType>;
let onConfigurationUndefinedFn: (error: ConfigurationUndefinedError) => void;
let onFetchErrorFn: (error: FetchError) => void;
let onValidationErrorFn: (error: unknown, config: unknown) => void;

let callbackFn: (
	event: ConfigurationEvent<ConfigType>
) => Promise<ConfigType | undefined>;

let cache: CacheProvider<ConfigType>;

const endpoints = [
	'https://endpoint.com/abcd/1.0.0-beta.json',
	'https://endpoint.com/abcd/default.json',
	'https://endpoint.com/default.json',
];

describe('ConfigClient without polling', () => {
	beforeEach(() => {
		fetchMock.resetMocks();

		cache = {
			read: jest.fn(),
			write: jest.fn(),
		};

		onValidationErrorFn = jest.fn();
		onConfigurationUndefinedFn = jest.fn();
		onFetchErrorFn = jest.fn();
		callbackFn = jest
			.fn()
			.mockImplementation(e => Promise.resolve(e.configuration));

		client = new ConfigClient<ConfigType>({
			endpoints,
			callback: callbackFn,
			onConfigurationUndefined: onConfigurationUndefinedFn,
			onFetchError: onFetchErrorFn,
			onValidationError: onValidationErrorFn,
			cache,
		});
	});

	test('should be an instance of ConfigClient', () => {
		expect(client).toBeInstanceOf(ConfigClient);
	});

	test('should return configuration from the first endpoint', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(testConfig);
		expect(status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		expect(callbackFn).toHaveBeenCalledTimes(1);
		expect(callbackFn).toHaveBeenCalledWith(resultEvent);

		expect(cache.read).toHaveBeenCalledTimes(2);
		expect(cache.write).toHaveBeenCalledTimes(1);
		expect(cache.write).toHaveBeenCalledWith(testConfig);
	});

	test('should return configuration from the second endpoint', async () => {
		fetchMock.mockResponse(req => {
			if (req.url === endpoints[1]) {
				return Promise.resolve(JSON.stringify(testConfig));
			}
			return Promise.reject(new Error('Not Found'));
		});

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(testConfig);
		expect(status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(2);

		expect(onFetchErrorFn).toHaveBeenCalledTimes(1);
		expect(cache.read).toHaveBeenCalledTimes(2);
		expect(cache.write).toHaveBeenCalledTimes(1);
		expect(cache.write).toHaveBeenCalledWith(testConfig);
	});

	test('should return configuration from the third endpoint', async () => {
		fetchMock.mockResponse(req => {
			if (req.url === endpoints[2]) {
				return Promise.resolve(JSON.stringify(testConfig));
			}
			return Promise.reject(new Error('Not Found'));
		});

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(testConfig);
		expect(status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(onFetchErrorFn).toHaveBeenCalledTimes(2);
		expect(cache.read).toHaveBeenCalledTimes(2);
		expect(cache.write).toHaveBeenCalledTimes(1);
		expect(cache.write).toHaveBeenCalledWith(testConfig);
	});

	test('should throw the ConfigurationUndefined error', async () => {
		client = new ConfigClient<ConfigType>({
			endpoints,
			callback: e => Promise.resolve(e.configuration),
			onConfigurationUndefined: onConfigurationUndefinedFn,
			onFetchError: onFetchErrorFn,
			fetch: async () => {
				return Promise.resolve(('' as unknown) as ConfigType);
			},
		});

		await client.getConfiguration();

		expect(onConfigurationUndefinedFn).toHaveBeenCalled();
		expect(onConfigurationUndefinedFn).toHaveBeenCalledWith(
			expect.any(ConfigurationUndefinedError)
		);
		expect(onFetchErrorFn).not.toHaveBeenCalled();
	});

	test('should return an error when all endpoints fail', async () => {
		fetchMock.mockResponse(() => {
			return Promise.reject(new Error('Not Found'));
		});

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeInstanceOf(ConfigurationFailedError);
		expect(configuration).toBeUndefined();
		expect(status).toBe('error');
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(onFetchErrorFn).toHaveBeenCalledTimes(3);
		expect(cache.read).toHaveBeenCalledTimes(1);
		expect(cache.write).toHaveBeenCalledTimes(0);
	});

	test('should provide the cached config if unchanged', async () => {
		fetchMock.mockResponse(JSON.stringify(testConfig));

		const event1 = await client.getConfiguration();

		expect(event1.error).toBeUndefined();
		expect(event1.configuration).toEqual(testConfig);
		expect(event1.status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		cache.read = jest
			.fn()
			.mockImplementation(() => Promise.resolve(testConfig));

		const event2 = await client.getConfiguration();

		expect(event2.error).toBeUndefined();
		expect(event2.configuration).toEqual(testConfig);
		expect(event2.status).toBe('cached');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('should provide an updated config if changed', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		const event1 = await client.getConfiguration();
		expect(event1.error).toBeUndefined();
		expect(event1.configuration).toEqual(testConfig);
		expect(event1.status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const updatedConfig = { flag: false };
		fetchMock.mockResponseOnce(JSON.stringify(updatedConfig));
		cache.read = jest
			.fn()
			.mockImplementation(() => Promise.resolve(testConfig));

		const event2 = await client.refresh();
		expect(event2.error).toBeUndefined();
		expect(event2.configuration).toEqual(updatedConfig);
		expect(event2.status).toBe('updated');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('should require endpoints', async () => {
		const badOptions = {
			endpoints: [],
			callback: async e => e.configuration,
		} as ConfigurationClientOptions<ConfigType>;
		expect(() => new ConfigClient<ConfigType>(badOptions)).toThrow(
			expect.any(OptionsError)
		);
	});

	test('should require a callback', async () => {
		const badOptions = {
			endpoints,
		} as ConfigurationClientOptions<ConfigType>;
		expect(() => new ConfigClient<ConfigType>(badOptions)).toThrow(
			expect.any(OptionsError)
		);
	});

	test('should throw validation error', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		const validator = jest.fn().mockImplementation(() => {
			throw new Error('Validation Error');
		});

		client = new ConfigClient<ConfigType>({
			endpoints,
			callback: e => Promise.resolve(e.configuration),
			onValidationError: onValidationErrorFn,
			onFetchError: onFetchErrorFn,
			validator,
		});

		await client.refresh();

		expect(validator).toHaveBeenCalledTimes(1);

		expect(onValidationErrorFn).toHaveBeenCalledTimes(1);
		expect(onValidationErrorFn).toHaveBeenCalledWith(
			expect.any(Error),
			testConfig
		);
	});

	test('should not allow the developer to return undefined from the callback', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		callbackFn = jest
			.fn()
			.mockImplementation(() => Promise.resolve(undefined));

		client = new ConfigClient<ConfigType>({
			endpoints,
			callback: callbackFn,
			onConfigurationUndefined: onConfigurationUndefinedFn,
			onFetchError: onFetchErrorFn,
			cache,
		});

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(testConfig);
		expect(status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		expect(callbackFn).toHaveBeenCalledTimes(1);
		expect(callbackFn).toHaveBeenCalledWith(resultEvent);

		expect(cache.write).toHaveBeenCalledWith(testConfig);
	});

	test('should allow the developer to alter the configuration in the callback', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		const alteredConfig = { flag: false };
		callbackFn = jest
			.fn()
			.mockImplementation(() => Promise.resolve(alteredConfig));

		client = new ConfigClient<ConfigType>({
			endpoints,
			callback: callbackFn,
			onConfigurationUndefined: onConfigurationUndefinedFn,
			onFetchError: onFetchErrorFn,
			cache,
		});

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(alteredConfig);
		expect(status).toBe('loaded');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		expect(callbackFn).toHaveBeenCalledTimes(1);

		expect(cache.write).toHaveBeenCalledWith(alteredConfig);
	});

	test('should allow the developer to override the configuration - getConfiguration', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		jest.useFakeTimers();
		jest.spyOn(global, 'setTimeout');

		const developerConfig = { flag: false };
		callbackFn = jest
			.fn()
			.mockImplementation(() => Promise.resolve(undefined));

		client = new ConfigClient<ConfigType>({
			override: developerConfig,
			endpoints,
			callback: callbackFn,
			onConfigurationUndefined: onConfigurationUndefinedFn,
			onFetchError: onFetchErrorFn,
			cache,
		});

		const resultEvent = await client.getConfiguration();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(developerConfig);
		expect(status).toBe('cached');
		expect(fetchMock).toHaveBeenCalledTimes(0);
		expect(callbackFn).toHaveBeenCalledTimes(1);
		expect(cache.read).toHaveBeenCalledTimes(0);
		expect(cache.write).toHaveBeenCalledTimes(0);
		expect(setTimeout).toHaveBeenCalledTimes(0);
	});

	test('should allow the developer to override the configuration - refresh', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		jest.useFakeTimers();
		jest.spyOn(global, 'setTimeout');

		const developerConfig = { flag: false };
		callbackFn = jest
			.fn()
			.mockImplementation(() => Promise.resolve(undefined));

		client = new ConfigClient<ConfigType>({
			override: developerConfig,
			endpoints,
			callback: callbackFn,
			onConfigurationUndefined: onConfigurationUndefinedFn,
			onFetchError: onFetchErrorFn,
			cache,
		});

		const resultEvent = await client.refresh();
		const { error, configuration, status } = resultEvent;

		expect(error).toBeUndefined();
		expect(configuration).toEqual(developerConfig);
		expect(status).toBe('cached');
		expect(fetchMock).toHaveBeenCalledTimes(0);
		expect(callbackFn).toHaveBeenCalledTimes(1);
		expect(cache.read).toHaveBeenCalledTimes(0);
		expect(cache.write).toHaveBeenCalledTimes(0);
		expect(setTimeout).toHaveBeenCalledTimes(0);
	});
});

describe('ConfigClient with polling', () => {
	beforeEach(() => {
		fetchMock.resetMocks();

		jest.useFakeTimers();
		jest.spyOn(global, 'setTimeout');
		jest.spyOn(global, 'clearTimeout');

		cache = {
			read: jest.fn(),
			write: jest.fn(),
		};

		callbackFn = jest
			.fn()
			.mockImplementation(e => Promise.resolve(e.configuration));

		client = new ConfigClient<ConfigType>({
			endpoints,
			callback: callbackFn,
			cache,
			interval: 5,
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('should initialize automatically', async () => {
		fetchMock.mockResponseOnce(JSON.stringify(testConfig));

		new ConfigClient<ConfigType>({
			endpoints,
			callback: callbackFn,
			cache,
			interval: 5,
			initialize: true,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('should set a timeout to refresh', async () => {
		fetchMock.mockResponse(JSON.stringify(testConfig));
		await client.getConfiguration();

		expect(clearTimeout).toHaveBeenCalledTimes(0);
		expect(setTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 5000);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersToNextTimer();
		expect(clearTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 5000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('should be able to pause polling', async () => {
		fetchMock.mockResponse(JSON.stringify(testConfig));
		await client.getConfiguration();

		expect(setTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 5000);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		client.pause();

		expect(clearTimeout).toHaveBeenCalledTimes(1);

		jest.advanceTimersToNextTimer();

		expect(setTimeout).toHaveBeenCalledTimes(1);
	});

	test('should be able to resume pooling', async () => {
		fetchMock.mockResponse(JSON.stringify(testConfig));
		await client.getConfiguration();

		expect(setTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 5000);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		client.pause();

		expect(clearTimeout).toHaveBeenCalledTimes(1);

		jest.advanceTimersToNextTimer();

		expect(setTimeout).toHaveBeenCalledTimes(1);

		client.resume();
		jest.advanceTimersToNextTimer();
		expect(setTimeout).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
