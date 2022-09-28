/**
 * The default validator; which just returns it's input
 * @param config The configuration to validate
 * @returns The validated configuration
 * @exception Any exceptions thrown will be passed to onValidationError
 */
export const defaultValidator = <T>(
	config: unknown
): Promise<T | undefined> => {
	return Promise.resolve(config ? (config as T) : undefined);
};
