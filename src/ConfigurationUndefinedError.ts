/**
 * Thrown if an endpoint does not throw an error but returns no content.  Possibly if the file is empty.
 */
export class ConfigurationUndefinedError extends Error {
	/**
	 * The endpoint that was called
	 */
	public endpoint: string;

	/**
	 * Constructor
	 * @param endpoint The endpoint that was called
	 */
	constructor(endpoint: string) {
		super('Configuration Undefined');
		this.name = 'ConfigurationUndefinedError';
		this.endpoint = endpoint;
	}
}
