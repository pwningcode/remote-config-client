import { ConfigurationFailedError } from './ConfigurationFailedError';
import { ConfigurationUndefinedError } from './ConfigurationUndefinedError';
import { FetchError } from './FetchError';

/**
 * Responsible for caching the configuration
 */
export interface CacheProvider<T> {
	/**
	 * Reads the cached value
	 * @returns The configuration from the cache
	 */
	read: () => Promise<T | undefined>;

	/**
	 * Writes a value to the cache
	 * @param value The configuration to write to the cache
	 * @returns a promise.
	 */
	write: (value: T | undefined) => Promise<void>;
}

/**
 * A fetch implementation for fetching data.
 * @param url The endpoint to fetch
 * @returns The result of the endpoint.
 * @exception {@link FetchError} - when an endpoint fails, the exception is passed to {@link ConfigurationClientOptions.onFetchError}
 */
export type FetchProvider<T> = (url: string) => Promise<T | undefined>;

/**
 * Responsible for testing if configuration has changed.
 * @param source The previous configuration
 * @param target The newest configuration
 * @returns true if the configuration changed; false otherwise
 */
export type EqualityProvider<T> = (
	source: T | undefined,
	target: T | undefined
) => boolean;

/**
 * Responsible for basic logging
 * Do not specify; to turn logging off.
 * @param data Matches the same signature as console.log
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoggingProvider = (...data: any[]) => void;

/**
 * Responsible for changing or mapping the result of an endpoint into the schema your application expects.
 * @param config The result of an endpoint to transform.
 * @returns The transformed value.
 */
export type TransformProvider<T> = (config: unknown) => T | undefined;

/**
 * @param config A configuration validator
 * @returns Promise<void>
 * @exception Error
 */
export type ValidationProvider = (config: unknown) => Promise<void>;

/**
 * Options to pass to the {@link ConfigurationClient}
 */
export interface ConfigurationClientOptions<T> {
	/**
	 * Required list of endpoints to call in order to find configuration
	 * @example
	 * endpoints: [
	 *   `https://yourendpoint/appconfig/appversion.json`,
	 *   `https://yourendpoint/appconfig/default.json`,
	 * ],
	 */
	endpoints: string[];

	/**
	 * Required callback that is called when configuration is loaded, updated, or all endpoints fail.
	 * @param event The {@link ConfigurationEvent} with information about the configuration
	 * @returns Optionally return a modified version of the configuration.
	 * @example
	 * callback: async (event) => {
	 *   return event.configuration;
	 * }
	 */
	callback: (event: ConfigurationEvent<T>) => Promise<T | undefined>;

	/**
	 * Optionally specify a configuration. If specified; will not call endpoints or run polling.
	 * All other options will be ignored except for {@link ConfigurationClientOptions.callback}
	 * */
	override?: T;

	/**
	 * Optionally provide an interval to poll for configuration changes in seconds.  If not specified; do not use polling.
	 */
	interval?: number;

	/**
	 * Optionally override the default {@link LoggingProvider}
	 * @param args - the same signature as console.log
	 * @returns void
	 * @example
	 * log: console.info,
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	log?: LoggingProvider;

	/**
	 * Optionally override the default {@link CacheProvider}
	 * @example
	 * cache: {
	 *  read: async () => {
	 *    return data;
	 *  },
	 *  write: async (config) => {
	 *    // write data
	 *  },
	 * }
	 */
	cache?: CacheProvider<T>;

	/**
	 * Optionally override the default {@link FetchProvider}
	 * @param url - the endpoint to fetch
	 * @returns data from an endpoint
	 * @exception {@link FetchError} - when an endpoint fails, the exception is passed to {@link ConfigurationClientOptions.onFetchError}
	 * @example
	 * fetch: async (url) => {
	 *   // This is the default implementation
	 *   const response = await fetch(url, {
	 *     method: 'GET',
	 *     headers: { 'Content-Type': 'application/json' },
	 *   });
	 *   return response.json();
	 * },
	 */
	fetch?: FetchProvider<T>;

	/**
	 * Optionally override the default {@link TransformProvider}
	 * @param config - the configuration to transform
	 * @returns the transformed configuration from the endpoint
	 * @example
	 * transformer: (config) => config as T,
	 */
	transformer?: TransformProvider<T>;

	/**
	 * Optionally override the default {@link EqualityProvider}
	 * @param source - the previous configuration
	 * @param target - the newest configuration
	 * @returns true if the configuration changed, false otherwise
	 * @example
	 * equality: (source, target) => isEqual(source, target),
	 */
	equality?: EqualityProvider<T>;

	/**
	 * Optional override the default {@link ValidationProvider} and validate configuration.
	 * Any errors thrown in this method will be caught and passed to {@link ConfigurationClientOptions.onValidationError}
	 * @param config - the configuration after it is fetched and before it is transformed
	 * @returns Promise<void>
	 * @example
	 * validator: async (config: unknown) => {
	 *   if (!config) {
	 *     throw new Error('The configuration is missing')
	 *   }
	 * },
	 */
	validator?: ValidationProvider;

	/**
	 * Optional callback to get notified if an endpoint does not throw an error but returns no content.  Possibly if the file is empty.
	 * @param error - {@link ConfigurationUndefinedError}
	 * @returns void
	 */
	onConfigurationUndefined?: (error: ConfigurationUndefinedError) => void;

	/**
	 * Optional callback to get notified when an endpoint fails.
	 * @param error - {@link FetchError}
	 * @returns void
	 */
	onFetchError?: (error: FetchError) => void;

	/**
	 * Optional callback to get notified of validation errors
	 * @param error - {@link ConfigurationClientOptions.validate}
	 * @param config - the configuration validated
	 * @returns void
	 */
	onValidationError?: (error: unknown, config: unknown) => void;

	/**
	 * If true, begins loading and polling the configuration without the need to call {@link ConfigurationClient.getConfiguration()} or {@link ConfigurationClient.refresh()}.
	 */
	initialize?: boolean;
}

/**
 * Fetches configuration from a list of endpoints and optionally polls for changes while notifying your application of configuration changes.
 */
export interface ConfigurationClient<T> {
	/**
	 * Return the cached configuration or load the configuration if needed
	 *
	 * If {@link ConfigurationClientOptions.interval} is specified; this will start polling after the initial load
	 *
	 * {@link ConfigurationClientOptions.callback} is still invoked
	 */
	getConfiguration: () => Promise<ConfigurationEvent<T>>;

	/**
	 * Forces a refresh of the configuration
	 *
	 * If {@link ConfigurationClientOptions.interval} is specified; this will start polling after the initial load
	 *
	 * {@link ConfigurationClientOptions.callback} is still invoked
	 */
	refresh: () => Promise<ConfigurationEvent<T>>;

	/**
	 * Pauses polling if {@link ConfigurationClientOptions.interval} was specified
	 */
	pause: () => void;

	/**
	 * Resumes or restarts polling if {@link ConfigurationClientOptions.interval} was specified
	 */
	resume: () => void;
}

/**
 * The status of the configuration fetch result or cache result.
 * Values can be:
 * @value error - fetching the configuration resulted in an error
 * @value loaded - the configuration was initially loaded
 * @value updated - the configuration changed since the last time it was fetched
 * @value equal - the newly fetched configuration is equal to the last time it was fetched
 * @value cached - the configuration was returned from the cache
 */
export type ConfigurationEventStatus =
	| 'error'
	| 'loaded'
	| 'updated'
	| 'equal'
	| 'cached';

/**
 * The information about the current fetch result.
 * @property {@link ConfigurationEventStatus} - the change status of the new configuration
 * @property endpoint - the endpoint fetched
 * @property configuration - the fetched configuration
 * @property error - {@link ConfigurationFailedError} if all endpoints failed
 */
export interface ConfigurationEvent<T> {
	/**
	 * The status of the fetch result
	 */
	status: ConfigurationEventStatus;
	/**
	 * The endpoint called
	 */
	endpoint?: string;
	/**
	 * The configuration returned
	 */
	configuration?: T;
	/**
	 * An error if all attempts failed.
	 */
	error?: ConfigurationFailedError;
}
