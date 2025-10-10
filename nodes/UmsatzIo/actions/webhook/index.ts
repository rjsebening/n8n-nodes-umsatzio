import { INodeProperties } from 'n8n-workflow';

export const webhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['webhook'] } },
		options: [
			{ name: 'List Webhooks', value: 'listWebhooks', action: 'List webhooks' },
			{ name: 'Create Webhook', value: 'createWebhook', action: 'Create a webhook' },
			{ name: 'Update Webhook', value: 'updateWebhook', action: 'Update a webhook' },
			{ name: 'Delete Webhook', value: 'deleteWebhook', action: 'Delete a webhook' },
		],
		default: 'listWebhooks',
	},
];

export const webhookFields: INodeProperties[] = [
	/** List */
	{
		displayName: 'Nothing to configure',
		name: 'noop',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['webhook'], operation: ['listWebhooks'] } },
	},

	/** Create */
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://n8n.example.com/webhook/12345',
		displayOptions: { show: { resource: ['webhook'], operation: ['createWebhook'] } },
	},
	{
		displayName: 'Trigger Name or ID',
		name: 'triggers',
		type: 'options',
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getWebhookTriggers' },
		displayOptions: { show: { resource: ['webhook'], operation: ['createWebhook'] } },
	},

	/** Properties for changeContactProperty / changeDealProperty */
	{
		displayName: 'Property Names or IDs',
		name: 'properties',
		type: 'multiOptions',
		default: [],
		required: true,
		description:
			'For changeContactProperty/changeDealProperty: select the fields to watch. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWebhookProperties', reloadOptions: true },
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['createWebhook'],
				triggers: ['changeContactProperty', 'changeDealProperty'],
			},
		},
	},

	/** Pipeline / Stage for updateDealStage */
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		description:
			'Select the pipeline (required when trigger includes updateDealStage). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['updateDealStage'] },
		},
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStagesByPipeline', loadOptionsDependsOn: ['pipelineId'] },
		default: '',
		description:
			'Select the stage (required when trigger includes updateDealStage). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['updateDealStage'] },
		},
	},

	/** Form IDs for submitForm */
	{
		displayName: 'Form Name(s) or ID(s)',
		name: 'formIds',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getFormsAsOptions' },
		default: [],
		placeholder: 'Select forms',
		description:
			'Required when trigger includes submitForm. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['submitForm'] },
		},
	},

	/** Update */
	{
		displayName: 'Webhook Name or ID',
		name: 'webhookId',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getWebhooksAsOptions' },
		default: '',
		displayOptions: { show: { resource: ['webhook'], operation: ['updateWebhook'] } },
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		placeholder: 'https://n8n.example.com/webhook/12345',
		displayOptions: { show: { resource: ['webhook'], operation: ['updateWebhook'] } },
	},
	{
		displayName: 'Trigger Name or ID',
		name: 'triggers',
		type: 'options',
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getWebhookTriggers' },
		displayOptions: { show: { resource: ['webhook'], operation: ['updateWebhook'] } },
	},

	/** Properties for changeContactProperty / changeDealProperty (update) */
	{
		displayName: 'Property Names or IDs',
		name: 'properties',
		type: 'multiOptions',
		default: [],
		description:
			'For changeContactProperty/changeDealProperty: select the fields to watch. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWebhookProperties' },
		displayOptions: {
			show: {
				resource: ['webhook'],
				operation: ['updateWebhook'],
				triggers: ['changeContactProperty', 'changeDealProperty'],
			},
		},
	},

	/** Pipeline / Stage for updateDealStage (update) */
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		description:
			'Set when trigger includes updateDealStage. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['updateDealStage'] },
		},
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStagesByPipeline' },
		default: '',
		description:
			'Set when trigger includes updateDealStage. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['updateDealStage'] },
		},
	},

	/** Form IDs for submitForm (update) */
	{
		displayName: 'Form Name(s) or ID(s)',
		name: 'formIds',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getFormsAsOptions' },
		default: [],
		placeholder: 'Select forms',
		description:
			'Set when trigger includes submitForm. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['submitForm'] },
		},
	},
	/** Delete */
	{
		displayName: 'Webhook Name or ID',
		name: 'webhookId',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getWebhooksAsOptions' },
		default: '',
		displayOptions: { show: { resource: ['webhook'], operation: ['deleteWebhook'] } },
	},
];
