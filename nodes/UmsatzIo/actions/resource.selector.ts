import type { INodeProperties } from 'n8n-workflow';

export const resourceSelector: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
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
			name: 'Webhook',
			value: 'webhook',
			description: 'Manage webhooks in Umsatz.io to receive real-time notifications about changes and events',
		},
	],
	default: 'contact',
};
