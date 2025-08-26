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
];

export const graphQLFields: INodeProperties[] = [
	{
		displayName: 'Operation Name',
		name: 'operationName',
		type: 'string',
		default: '',
		description: 'Optional operationName',
		displayOptions: { show: { resource: ['graphql'], operation: ['raw'] } },
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		typeOptions: { rows: 10 },
		required: true,
		default: 'query Me { __typename }',
		description: 'GraphQL query or mutation',
		displayOptions: { show: { resource: ['graphql'], operation: ['raw'] } },
	},
	{
		displayName: 'Variables (JSON)',
		name: 'variables',
		type: 'json',
		default: {},
		description: 'Optional variables in JSON',
		displayOptions: { show: { resource: ['graphql'], operation: ['raw'] } },
	},
];
