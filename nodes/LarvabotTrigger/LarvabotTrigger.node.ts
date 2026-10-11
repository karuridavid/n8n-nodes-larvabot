import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { getProjects, larvabotRequest } from '../Larvabot/GenericFunctions';

// Each event: which endpoint to poll, and the date that orders its items (newest first).
const EVENTS: Record<string, { path: string; qs: IDataObject; dateField: string }> = {
	newLead: { path: '/leads', qs: { event: 'found' }, dateField: 'found_at' },
	leadContacted: { path: '/leads', qs: { event: 'contacted' }, dateField: 'contacted_at' },
	leadReplied: { path: '/leads', qs: { event: 'replied' }, dateField: 'replied_at' },
	newConversation: { path: '/conversations', qs: {}, dateField: 'found_at' },
};

export class LarvabotTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Larvabot Trigger',
		name: 'larvabotTrigger',
		icon: { light: 'file:larvabot.svg', dark: 'file:larvabot.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when Larvabot finds a lead, emails one, gets a reply or finds a conversation',
		defaults: { name: 'Larvabot Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'larvabotApi', required: true }],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				options: [
					{ name: 'Lead Contacted', value: 'leadContacted', description: 'The first email to a lead is sent' },
					{ name: 'Lead Replied', value: 'leadReplied', description: 'A lead replies to your email' },
					{ name: 'New Conversation', value: 'newConversation', description: 'Someone posts asking for what you sell (relevance 50+)' },
					{ name: 'New Lead', value: 'newLead', description: 'A business worth contacting is scored as a fit' },
				],
				default: 'newLead',
			},
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
	};

	methods = { loadOptions: { getProjects } };

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const project = this.getNodeParameter('project', '') as string;
		const { path, qs, dateField } = EVENTS[event];

		const items = ((await larvabotRequest.call(this, path, { ...qs, project, limit: 100 })) as IDataObject[]).filter(
			(item) => typeof item[dateField] === 'string',
		);

		// "Fetch test event": show the newest item so fields can be mapped.
		if (this.getMode() === 'manual') return items.length ? [this.helpers.returnJsonArray(items.slice(0, 1))] : null;

		// Remember the newest date seen per event and project; only later items fire.
		const state = this.getWorkflowStaticData('node');
		const key = `${event}:${project}`;
		const since = state[key] as string | undefined;
		const fresh = since ? items.filter((item) => (item[dateField] as string) > since) : [];
		if (items.length) state[key] = items[0][dateField] as string;
		else if (!since) state[key] = new Date().toISOString();

		// The first activation only records where to start, so old items don't flood the workflow.
		if (!fresh.length) return null;
		return [this.helpers.returnJsonArray(fresh.reverse())];
	}
}
