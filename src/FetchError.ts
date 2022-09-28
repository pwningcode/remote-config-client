/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Thrown if an endpoint results in an error
 */
export class FetchError extends Error {
	/**
	 * The endpoint that was called
	 */
	public endpoint: string;
	/**
	 * The original error thrown
	 */
	public error: any;

	/**
	 * Constructor
	 * @param error The original error (from fetch)
	 * @param endpoint The endpoint that was called
	 */
	constructor(error: any, endpoint: string) {
		super('Failed to fetch');
		this.name = 'FetchError';
		this.endpoint = endpoint;
		this.error = error;
	}
}
