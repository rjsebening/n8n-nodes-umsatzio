import type { INodeProperties } from 'n8n-workflow';

export const resourceSelector: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Account',
			value: 'accounts',
			description:
				'Retrieve and manage user accounts in Umsatz.io – list all users or fetch detailed information for a specific account',
		},
		{
			name: 'Activity',
			value: 'activity',
			description:
				'Track and manage activities such as notes, phone calls, and emails – create, log, or list them to keep full context on contacts and deals',
		},
		{
			name: 'Contact',
			value: 'contact',
			description: 'Create, update, and manage contacts (e.g., prospects, customers, or leads)',
		},
		{
			name: 'Deal',
			value: 'deal',
			description: 'Work with sales opportunities and deals – from creation to updates and pipeline management',
		},
		{
			name: 'GraphQL',
			value: 'graphql',
			description:
				'Execute custom GraphQL queries or mutations directly against the Umsatz.io API for maximum flexibility',
		},
		{
			name: 'Reporting',
			value: 'reporting',
			description:
				'Sales controlling & performance reports for call activities – analyze call performance, KPIs and conversion rates of your sales activities',
		},
		{
			name: 'Webhook',
			value: 'webhook',
			description: 'Manage webhooks in Umsatz.io to receive real-time notifications about changes and events',
		},
	],
	default: 'contact',
};
