import type {
	IDataObject,
	IExecuteFunctions,
	JsonObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { getProjects, larvabotRequest } from './GenericFunctions';

// Programmatic style (not declarative) so this node and the trigger share one request helper,
// the Project dropdown and the same error handling.

// The API returns at most 500 items per request, newest first; Return All pages back with `offset`.
const MAX = 500;

export class Larvabot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Larvabot',
		name: 'larvabot',
		icon: { light: 'file:larvabot.svg', dark: 'file:larvabot.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get leads, replies and conversations found by Larvabot',
		defaults: { name: 'Larvabot' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'larvabotApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Project', value: 'project' },
				],
				default: 'lead',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['lead'] } },
				options: [{ name: 'Get Many', value: 'getAll', description: 'Get many leads', action: 'Get many leads' }],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['conversation'] } },
				options: [
					{ name: 'Get Many', value: 'getAll', description: 'Get many conversations', action: 'Get many conversations' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['project'] } },
				options: [{ name: 'Get Many', value: 'getAll', description: 'Get many projects', action: 'Get many projects' }],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [{ name: 'Get', value: 'get', description: 'Get the connected account', action: 'Get the connected account' }],
				default: 'get',
			},
			{
				displayName: 'Lead Status',
				name: 'event',
				type: 'options',
				displayOptions: { show: { resource: ['lead'], operation: ['getAll'] } },
				required: true,
				options: [
					{ name: 'Found', value: 'found', description: 'Scored as a fit, newest found first' },
					{ name: 'Contacted', value: 'contacted', description: 'The first email was sent, newest first' },
					{ name: 'Replied', value: 'replied', description: 'Replied to your email, newest reply first' },
				],
				default: 'found',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: { show: { resource: ['lead', 'conversation'], operation: ['getAll'] } },
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { resource: ['lead', 'conversation'], operation: ['getAll'], returnAll: [false] } },
				typeOptions: { minValue: 1, maxValue: MAX },
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['lead', 'conversation'], operation: ['getAll'] } },
				default: {},
				options: [
					{
						displayName: 'Project Name or ID',
						name: 'project',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getProjects' },
						default: '',
						description:
							'Only items from this project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},
		],
	};

	methods = { loadOptions: { getProjects } };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				let response: unknown;

				if (resource === 'account') {
					response = await larvabotRequest.call(this, '/me');
				} else if (resource === 'project') {
					response = await larvabotRequest.call(this, '/projects');
				} else {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
					const path = resource === 'lead' ? '/leads' : '/conversations';
					const qs: IDataObject = { project: filters.project ?? '' };
					if (resource === 'lead') qs.event = this.getNodeParameter('event', i) as string;

					if (returnAll) {
						// Page back 500 at a time until a short page. Items found while paging shift the
						// offsets, so the same item can come back twice; keep the first copy.
						const seen = new Set<unknown>();
						const all: IDataObject[] = [];
						for (let offset = 0; ; offset += MAX) {
							const page = (await larvabotRequest.call(this, path, { ...qs, limit: MAX, offset })) as IDataObject[];
							for (const row of page) {
								if (seen.has(row.id)) continue;
								seen.add(row.id);
								all.push(row);
							}
							if (page.length < MAX) break;
						}
						response = all;
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						response = await larvabotRequest.call(this, path, qs);
					}
				}

				const rows = (Array.isArray(response) ? response : [response]) as IDataObject[];
				returnData.push(...rows.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
