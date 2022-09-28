/**
 * The default transformer; which just returns it's input
 * @param config The configuration to transform
 * @returns The transformed configuration
 */
export const defaultTransformer = <T>(config: unknown) => {
	return config ? (config as T) : undefined;
};
