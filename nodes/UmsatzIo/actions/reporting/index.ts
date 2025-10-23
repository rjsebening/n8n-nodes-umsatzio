// nodes/UmsatzIo/actions/reporting/index.ts
import type { INodeProperties } from 'n8n-workflow';

export const reportingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'callReports',
		options: [
			{
				name: 'Call Reports',
				value: 'callReports',
				action: 'Generate sales controlling report',
				description:
					'Generate detailed sales controlling & performance reports for call activities – analyze KPIs, reachability, and conversion metrics over a selected period',
			},
		],
		displayOptions: { show: { resource: ['reporting'] } },
	},
];

export const reportingFields: INodeProperties[] = [
	{
		displayName: 'Phone Call Activity Type Name or ID',
		name: 'phoneCallActivityTypeId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'loadPhoneCallActivityTypes' },

		displayOptions: { show: { resource: ['reporting'], operation: ['callReports'] } },
	},
	{
		displayName: 'Account Names or IDs',
		name: 'accountIds',
		type: 'multiOptions',
		default: [],
		typeOptions: { loadOptionsMethod: 'getAccountsForReporting' },
		displayOptions: { show: { resource: ['reporting'], operation: ['callReports'] } },
		description:
			'Optionally limited to specific accounts. Empty = all. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'From',
		name: 'fromDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['reporting'], operation: ['callReports'] } },
	},
	{
		displayName: 'To',
		name: 'toDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['reporting'], operation: ['callReports'] } },
	},
	{
		displayName: 'Return',
		name: 'returnMode',
		type: 'options',
		default: 'raw',
		options: [
			{ name: 'Raw (API Shape)', value: 'raw' },
			{ name: 'Flattened (Totals + per Account)', value: 'flattened' },
		],
		displayOptions: { show: { resource: ['reporting'], operation: ['callReports'] } },
	},
];
