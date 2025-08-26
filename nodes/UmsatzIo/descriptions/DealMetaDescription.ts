import { INodeProperties } from 'n8n-workflow';

export const dealMetaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['dealMeta'] } },
		options: [
			{ name: 'Cards (Fields Meta)', value: 'cards', action: 'Get deal cards fields meta' },
			{ name: 'Drawer (Fields Meta)', value: 'drawer', action: 'Get deal drawer fields meta' },
			{ name: 'Table (Columns Meta)', value: 'table', action: 'Get deal table columns meta' },
		],
		default: 'cards',
	},
];

export const dealMetaFields: INodeProperties[] = [];
