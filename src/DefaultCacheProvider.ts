import { CacheProvider } from './types';

/**
 * The default in-memory cache provider
 */
export class DefaultCacheProvider<T> implements CacheProvider<T> {
	private cache: T | undefined;

	/**
	 * Instantiates an in-memory cache
	 */
	constructor() {
		this.cache = undefined;
	}

	/**
	 * Reads the cache value
	 * @returns The value in cache as T or undefined
	 */
	public read() {
		return Promise.resolve(this.cache);
	}

	/**
	 * Writes a value to the cache
	 * @param value The value you want to write to the cache
	 * @returns A Promise.
	 */
	public write(value: T | undefined) {
		this.cache = value;
		return Promise.resolve();
	}
}
