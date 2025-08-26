import { INodeProperties } from 'n8n-workflow';

export const pipelineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['pipeline'] } },
		options: [
			{
				name: 'List Pipelines',
				value: 'list',
				action: 'List pipelines',
				description: 'Fetch pipelines',
			},
			{
				name: 'Get Pipeline (with Stages)',
				value: 'get',
				action: 'Get pipeline',
				description: 'Fetch a pipeline with stages',
			},
		],
		default: 'list',
	},
];

export const pipelineFields: INodeProperties[] = [
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		required: true,
		description:
			'Wähle eine Pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['pipeline'], operation: ['get'] } },
	},
];
