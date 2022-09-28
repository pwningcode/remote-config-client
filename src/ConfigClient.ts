import isEqual from 'lodash/isEqual';

import {
	CacheProvider,
	ConfigurationClient,
	ConfigurationClientOptions,
	ConfigurationEvent,
	EqualityProvider,
	FetchProvider,
	LoggingProvider,
	TransformProvider,
	ValidationProvider,
} from './types';

import { DefaultCacheProvider } from './DefaultCacheProvider';
import { defaultTransformer } from './defaultTransformer';
import { defaultValidator } from './defaultValidator';
import { defaultFetchProvider } from './defaultFetchProvider';
import { OptionsError } from './OptionsError';
import { ConfigurationUndefinedError } from './ConfigurationUndefinedError';
import { FetchError } from './FetchError';
import { ConfigurationFailedError } from './ConfigurationFailedError';

/**
 * @implements ConfigurationClient
 */
export class ConfigClient<T> implements ConfigurationClient<T> {
	private override?: T;
	private interval?: number;
	private timeoutId?: string | number | NodeJS.Timeout | undefined;
	private endpoints: string[];
	private cache: CacheProvider<T>;
	private fetch: FetchProvider<T>;
	private equality: EqualityProvider<T>;
	private log: LoggingProvider;
	private transformer: TransformProvider<T>;
	private validator: ValidationProvider;
	private callback: (event: ConfigurationEvent<T>) => Promise<T | undefined>;
	private onFetchError: (error: FetchError) => void;
	private onValidationError: (error: unknown, config: unknown) => void;
	private onUndefinedError: (error: ConfigurationUndefinedError) => void;
	private loaded: boolean;
	private paused: boolean;

	/**
	 * Instantiate the client
	 * @param options {@link ConfigurationClientOptions}
	 * @see
	 * {@link ConfigurationClient}
	 * @example
	 * const client = new ConfigClient<ConfigType>({
	 *   initialize: true,
	 *   interval: 3600, // in seconds
	 *   endpoints: ['https://endpoint/'],
	 *   callback: async (event) => {
	 *     if (event.status === 'error') {
	 *       // all endpoints failed
	 *       return defaultConfig;
	 *     }
	 *     // handle config changes
	 *     return event.configuration;
	 *   },
	 * });
	 */
	constructor(options: ConfigurationClientOptions<T>) {
		this.override = options.override;
		this.interval = options.interval || undefined;
		this.endpoints = options.endpoints || [];
		this.cache = options.cache || new DefaultCacheProvider<T>();
		this.fetch = options.fetch || defaultFetchProvider;
		this.equality = options.equality || isEqual;
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		this.log = options.log || (() => {});
		this.transformer = options.transformer || defaultTransformer;
		this.validator = options.validator || defaultValidator;
		this.callback = options.callback;
		this.onFetchError = options.onFetchError || this.log;
		this.onValidationError = options.onValidationError || this.log;
		this.onUndefinedError = options.onConfigurationUndefined || this.log;
		this.loaded = false;
		this.paused = false;

		if (!this.endpoints || this.endpoints.length === 0) {
			throw new OptionsError('Missing endpoints', options);
		}

		if (!this.callback) {
			throw new OptionsError('Missing callback method', options);
		}

		if (options.initialize === true) {
			this.refresh();
		}
	}

	/**
	 * Try each endpoint until one of them returns some configuration
	 * @returns {@link ConfigurationEvent}
	 */
	private async tryFetch() {
		const endpoints = [...this.endpoints];
		let cancel = false;
		let data: unknown = undefined;
		let ep: string | undefined;

		while (cancel !== true) {
			ep = endpoints.shift();
			if (ep) {
				try {
					data = await this.fetch(ep);
					if (data) {
						cancel = true;
					} else {
						const error = new ConfigurationUndefinedError(ep);
						this.onUndefinedError(error);
					}
				} catch (error) {
					const err = new FetchError(error, ep);
					this.onFetchError(err);
				}
			} else {
				cancel = true;
			}
		}

		return {
			endpoint: ep,
			configuration: data,
			error: data
				? undefined
				: new ConfigurationFailedError(this.endpoints),
		};
	}

	/**
	 * Use the configuration loaded upon instantiation and do not call the endpoints or use polling.
	 * @returns {@link ConfigurationEvent}
	 */
	private async getOverride() {
		const ev: ConfigurationEvent<T> = {
			configuration: this.override,
			status: 'cached',
		};
		const configuration = (await this.callback(ev)) || this.override;
		this.loaded = true;
		return {
			...ev,
			configuration,
		};
	}

	/**
	 * @inheritdoc
	 */
	public async getConfiguration() {
		if (this.override) {
			return this.getOverride();
		}

		const source = await this.cache.read();
		if (source) {
			const ev: ConfigurationEvent<T> = {
				configuration: source,
				status: 'cached',
			};
			return ev;
		}
		return this.refresh();
	}

	/**
	 * @inheritdoc
	 */
	public async refresh() {
		if (this.override) {
			return this.getOverride();
		}

		this.setPolling(false);
		const { error, configuration: data, endpoint } = await this.tryFetch();
		if (error) {
			const result: ConfigurationEvent<T> = {
				status: 'error',
				endpoint,
				configuration: undefined,
				error,
			};
			return result;
		}

		try {
			await this.validator(data);
		} catch (validationError) {
			this.onValidationError(validationError, data);
		}

		const source = await this.cache.read();
		const target = this.transformer(data);
		const hasChanged = !this.equality(source, target);

		const ev: ConfigurationEvent<T> = {
			endpoint,
			configuration: target,
			status: !this.loaded ? 'loaded' : hasChanged ? 'updated' : 'equal',
		};

		const configuration = (await this.callback(ev)) || target;

		this.cache.write(configuration);
		this.loaded = true;
		if (!this.paused) {
			this.setPolling(true);
		}
		return {
			...ev,
			configuration,
		};
	}

	/**
	 * Help manage the timer
	 * @param start true to start the timer, false to clear the timer
	 */
	private setPolling(start: boolean) {
		if (start === true && this.interval && this.interval > 0) {
			this.timeoutId = setTimeout(
				() => this.refresh(),
				this.interval * 1000
			);
		} else {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
			}
		}
	}

	/**
	 * @inheritdoc
	 */
	public pause() {
		this.paused = true;
		this.setPolling(false);
	}

	/**
	 * @inheritdoc
	 */
	public resume() {
		this.paused = false;
		this.setPolling(true);
	}
}
