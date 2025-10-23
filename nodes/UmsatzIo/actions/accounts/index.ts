import type { INodeProperties } from 'n8n-workflow';

export const accountsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAllUsers',
		options: [
			{
				name: 'Get All Users',
				value: 'getAllUsers',
				action: 'Get all accounts users',
				description: 'Fetch all paid user accounts',
			},
			{
				name: 'Get User by ID',
				value: 'getUserById',
				action: 'Get a single user by ID',
				description: 'Fetch one user account by its Account ID',
			},
		],
		displayOptions: {
			show: { resource: ['accounts'] },
		},
	},
];

export const accountsFields: INodeProperties[] = [
	{
		displayName: 'Account Name or ID',
		name: 'accountId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAccountsForReporting',
		},
		default: '',
		required: true,
		description:
			'Account to fetch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['accounts'], operation: ['getUserById'] },
		},
	},
];
