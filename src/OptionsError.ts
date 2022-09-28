import { ConfigurationClientOptions } from './types';

/**
 * Thrown if options used to instantiate the {@link ConfigClient} class are invalid.
 */
export class OptionsError<T> extends Error {
	/**
	 * The options used to instantiate the {@link ConfigClient} class.
	 */
	public options: ConfigurationClientOptions<T>;

	/**
	 * Constructor
	 * @param message Describes the error
	 * @param options The options used to instantiate the {@link ConfigClient} class.
	 */
	constructor(message: string, options: ConfigurationClientOptions<T>) {
		super(message);
		this.name = 'OptionsError';
		this.options = options;
	}
}
