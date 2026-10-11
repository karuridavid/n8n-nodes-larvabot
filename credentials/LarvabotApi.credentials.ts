import type { IAuthenticateGeneric, Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class LarvabotApi implements ICredentialType {
	name = 'larvabotApi';

	displayName = 'Larvabot API';

	icon: Icon = { light: 'file:larvabot.svg', dark: 'file:larvabot.dark.svg' };

	documentationUrl = 'https://larvabot.com/docs/reference/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create one in Larvabot under Settings → Integrations → API keys. It starts with lb_.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.larvabot.com/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
