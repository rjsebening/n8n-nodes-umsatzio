import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class UmsatzIoApi implements ICredentialType {
	name = 'umsatzIoApi';
	displayName = 'Umsatz.io API';
	documentationUrl = 'https://github.com/rjsebening/n8n-nodes-umsatzio';
	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'endpoint',
			type: 'string',
			default: 'https://app.umsatz.io/api/graphql',
			placeholder: 'https://app.umsatz.io/api/graphql',
			description: 'GraphQL endpoint',
		},
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Please enter the API key here.',
		},
	];

	test = {
		request: {
			method: 'POST' as const,
			url: '={{$credentials.endpoint}}',
			headers: {
				Authorization:
					'={{$credentials.token && $credentials.token.toLowerCase().startsWith("basic ") ? $credentials.token : "Basic " + $credentials.token}}',
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: {
				query: 'query __Ping { __typename }',
			},
			json: true,
		},
	};
}
