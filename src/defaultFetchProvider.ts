/**
 * The default fetch implementation for fetching json data.
 * @param url The endpoint to call
 * @returns The result of the endpoint as json.
 */
export const defaultFetchProvider = async <T>(url: string) => {
	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});
	return (response.json() as unknown) as T;
};
