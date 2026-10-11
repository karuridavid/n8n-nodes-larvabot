import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BASE_URL = 'https://app.larvabot.com/api/v1';

type Context = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

// Every Larvabot endpoint is a GET that returns JSON. Errors carry a human-readable `error` field.
export async function larvabotRequest(this: Context, path: string, qs: IDataObject = {}): Promise<unknown> {
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${BASE_URL}${path}`,
		qs: Object.fromEntries(Object.entries(qs).filter(([, v]) => v !== '' && v !== undefined)),
		json: true,
	};
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'larvabotApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// The member's projects, for the Project dropdowns.
export async function getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const projects = (await larvabotRequest.call(this, '/projects')) as Array<{ id: string; name: string; domain: string }>;
	return [
		{ name: 'All Projects', value: '' },
		...projects.map((p) => ({ name: p.name, value: p.id, description: p.domain })),
	];
}
