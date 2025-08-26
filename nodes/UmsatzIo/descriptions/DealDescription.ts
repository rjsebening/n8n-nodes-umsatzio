import { INodeProperties } from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['deal'] } },
		options: [
			{ name: 'Create Deal', value: 'createDeal', action: 'Create a new deal' },
			{ name: 'Get by ID', value: 'getById', action: 'Get a deal by ID' },
			{ name: 'Get Pipeline', value: 'getPipeline', action: 'Get a pipeline with its stages' },
			{ name: 'List by Stage', value: 'listByStage', action: 'List all deals in a stage' },
			{ name: 'Update Deal', value: 'updateDeal', action: 'Update an existing deal' },
			{
				name: 'Change Deal Pipeline/Stage',
				value: 'changeDealPipelineStage',
				action: 'Move a deal to another pipeline & stage',
			},
			{ name: 'Create Note (Deal)', value: 'createNote', action: 'Add a note to a deal' },
			{ name: 'Get Notes (Deal)', value: 'getNotes', action: 'Get notes for a deal' },
		],
		default: 'getById',
	},
];

export const dealFields: INodeProperties[] = [
	// -------------------------------
	// getById
	// -------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the deal',
		displayOptions: { show: { resource: ['deal'], operation: ['getById'] } },
	},

	// -------------------------------
	// listByStage
	// -------------------------------
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		description:
			'Choose from the list, or specify an ID using an expression',
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getStagesByPipeline', loadOptionsDependsOn: ['pipelineId'] },
		description:
			'Choose from the list, or specify an ID using an expression.',
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
	},
	{
		displayName: 'Search String',
		name: 'dealSearchString',
		type: 'string',
		default: '',
		description: 'Optional search string to filter deals',
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
	},
	{
		displayName: 'Page',
		name: 'dealPage',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
	},
	{
		displayName: 'Limit',
		name: 'dealLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
	},

	// -------------------------------
	// getPipeline
	// -------------------------------
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		description:
			'Choose from the list, or specify an ID using an expression.',
		displayOptions: { show: { resource: ['deal'], operation: ['getPipeline'] } },
	},

	// -------------------------------
	// createDeal
	// -------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		description:
			'Choose from the list, or specify an ID using an expression.',
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getStagesByPipeline', loadOptionsDependsOn: ['pipelineId'] },
		description:
			'Choose from the list, or specify an ID using an expression.',
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'fixedCollection',
		placeholder: 'Add Field',
		typeOptions: { multipleValues: true },
		default: {},
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						required: true,
						default: '',
						typeOptions: { loadOptionsMethod: 'getDealFields' },
						description:
							'Choose from the list, or specify an ID using an expression.',
					},
					{
						displayName: 'Field Type (Auto)',
						name: 'fieldTypeLabel',
						type: 'options',
						default: 'text',
						typeOptions: {
							loadOptionsMethod: 'getFieldTypeLabel',
							loadOptionsDependsOn: ['fieldId'],
						},
						description: 'Detected field type (informational)',
					},
					{
						displayName: 'Value Mode (Auto)',
						name: 'valueMode',
						type: 'options',
						default: 'text',
						typeOptions: {
							loadOptionsMethod: 'getFieldValueMode',
							loadOptionsDependsOn: ['fieldId'],
						},
						description: 'Internal helper that selects the proper input',
					},

					// ——— Value (TEXT/NUMBER/BOOLEAN etc.)
					{
						displayName: 'Value (Text/Number)',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { show: { valueMode: ['text'] } },
					},

					// ——— Value (OPTION)
					{
						displayName: 'Value (Option) Name or ID',
						name: 'valueOption',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getOptionsForField',
							loadOptionsDependsOn: ['fieldId'],
						},
						displayOptions: { show: { valueMode: ['option'] } },
					},

					// ——— Value (DATE / DATETIME)
					{
						displayName: 'Value (Date/DateTime)',
						name: 'valueDate',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { valueMode: ['date'] } },
					},
				],
			},
		],
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
	},

	// -------------------------------
	// updateDeal
	// -------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the deal to update',
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
	},
	{
		displayName: 'Fields to Update',
		name: 'updateFields',
		type: 'fixedCollection',
		placeholder: 'Add Field',
		typeOptions: { multipleValues: true },
		default: {},
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						required: true,
						default: '',
						typeOptions: { loadOptionsMethod: 'getDealFields' },
						description:
							'Choose from the list, or specify an ID using an expression.',
					},
					{
						displayName: 'Field Type (Auto)',
						name: 'fieldTypeLabel',
						type: 'options',
						default: 'text',
						typeOptions: {
							loadOptionsMethod: 'getFieldTypeLabel',
							loadOptionsDependsOn: ['fieldId'],
						},
						description: 'Detected field type (informational)',
					},
					{
						displayName: 'Value Mode (Auto)',
						name: 'valueMode',
						type: 'options',
						default: 'text',
						typeOptions: {
							loadOptionsMethod: 'getFieldValueMode',
							loadOptionsDependsOn: ['fieldId'],
						},
						description: 'Internal helper that selects the proper input',
					},

					// ——— Value (TEXT/NUMBER/BOOLEAN etc.)
					{
						displayName: 'Value (Text/Number)',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { show: { valueMode: ['text'] } },
					},

					// ——— Value (OPTION)
					{
						displayName: 'Value (Option) Name or ID',
						name: 'valueOption',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getOptionsForField',
							loadOptionsDependsOn: ['fieldId'],
						},
						displayOptions: { show: { valueMode: ['option'] } },
					},

					// ——— Value (DATE / DATETIME)
					{
						displayName: 'Value (Date/DateTime)',
						name: 'valueDate',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { valueMode: ['date'] } },
					},
				],
			},
		],
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: false,
		description: 'Whether to ignore fields not defined in schema',
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
	},

	// -------------------------------
	// changeDealPipelineStage
	// -------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['changeDealPipelineStage'] } },
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		description:
			'Choose from the list, or specify an ID using an expression.',
		displayOptions: { show: { resource: ['deal'], operation: ['changeDealPipelineStage'] } },
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getStagesByPipeline', loadOptionsDependsOn: ['pipelineId'] },
		description:
			'Choose from the list, or specify an ID using an expression.',
		displayOptions: { show: { resource: ['deal'], operation: ['changeDealPipelineStage'] } },
	},

	// -------------------------------
	// createNote / getNotes (deal)
	// -------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		default: '',
		required: true,
		description: 'Parent deal ID',
		displayOptions: { show: { resource: ['deal'], operation: ['createNote'] } },
	},
	{
		displayName: 'Description (JSON RichText)',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['deal'], operation: ['createNote'] } },
	},
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		default: '',
		required: true,
		description: 'Deal to read notes for',
		displayOptions: { show: { resource: ['deal'], operation: ['getNotes'] } },
	},
];
