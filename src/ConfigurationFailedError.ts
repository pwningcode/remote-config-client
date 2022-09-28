/**
 * Thrown if all endpoints fail and no configuration could be loaded.
 */
export class ConfigurationFailedError extends Error {
	/**
	 * All of the endpoints that were attempted.
	 */
	public endpoints: string[];

	/**
	 * Constructor
	 * @param endpoints All of the endpoints that were attempted.
	 */
	constructor(endpoints: string[]) {
		super('All configuration endpoints failed');
		this.name = 'ConfigurationFailedError';
		this.endpoints = endpoints;
	}
}
