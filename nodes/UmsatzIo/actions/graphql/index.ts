import { INodeProperties } from 'n8n-workflow';

export const graphQLOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['graphql'] } },
		options: [
			{
				name: 'Raw Query/Mutation',
				value: 'raw',
				action: 'Run raw graph ql',
				description: 'Run a raw GraphQL query or mutation',
			},
		],
		default: 'raw',
	},
	{
		displayName: 'Request Format',
		name: 'requestFormat',
		type: 'options',
		options: [
			{
				name: 'JSON (Recommended)',
				value: 'json',
				description: 'Standard GraphQL JSON payload with "query", "variables", and optional "operationName"',
			},
			{
				name: 'GraphQL (Raw)',
				value: 'graphql',
				description: 'Send raw GraphQL string as body. Not all servers support this format.',
			},
		],
		default: 'json',
		description: 'Format of the request payload sent to the GraphQL API',
		displayOptions: { show: { resource: ['graphql'] } },
	},
];

export const graphQLFields: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		typeOptions: { rows: 10 },
		required: true,
		default: '',
		description: 'GraphQL query or mutation string to execute',
		displayOptions: { show: { resource: ['graphql'], operation: ['raw'] } },
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'json',
		default: '',
		description: 'Query variables as JSON object',
		displayOptions: { show: { resource: ['graphql'], operation: ['raw'], requestFormat: ['json'] } },
	},

	{
		displayName: 'Operation Name',
		name: 'operationName',
		type: 'string',
		default: '',
		description: 'Optional operation name (only required if multiple operations are defined in one document)',
		displayOptions: { show: { resource: ['graphql'], operation: ['raw'] } },
	},
];
