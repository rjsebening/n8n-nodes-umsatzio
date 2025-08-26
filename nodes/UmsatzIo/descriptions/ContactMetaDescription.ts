import { INodeProperties } from 'n8n-workflow';

export const contactMetaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contactMeta'] } },
		options: [
			{ name: 'Cards (Fields Meta)', value: 'cards', action: 'Get contact cards fields meta' },
			{ name: 'Drawer (Fields Meta)', value: 'drawer', action: 'Get contact drawer fields meta' },
			{ name: 'Table (Columns Meta)', value: 'table', action: 'Get contact table columns meta' },
		],
		default: 'cards',
	},
];

export const contactMetaFields: INodeProperties[] = [];
