import { INodeProperties } from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['deal'] } },
		options: [
			{
				name: 'Change Pipeline/Stage',
				value: 'changeDealPipelineStage',
				description: 'Move deal to another stage',
				action: 'Change deal stage',
			},
			{
				name: 'Create Deal',
				value: 'createDeal',
				description: 'Create a new deal in the system',
				action: 'Create a deal',
			},
			{ name: 'Find Deal by ID', value: 'getById', description: 'Find a deal by ID', action: 'Find a deal by ID' },
			{
				name: 'Find Related Deals by Email',
				value: 'findDealsByEmail',
				description: 'Find all deals linked to the contact owning this email address',
				action: 'Find related deals by email',
			},
			{
				name: 'Get Deals by Filter Group',
				value: 'listByFilterGroup',
				description: 'Apply a saved filter group and list the resulting deals',
				action: 'List deals by filter group',
			},
			{
				name: 'Get Pipeline',
				value: 'getPipeline',
				description: 'Get details for a single pipeline including its stages',
				action: 'Get pipeline details',
			},
			{
				name: 'Get Pipelines',
				value: 'getPipelines',
				description: 'List all pipelines',
				action: 'List pipelines',
			},
			{
				name: 'List by Stage',
				value: 'listByStage',
				description: 'List all deals in a stage',
				action: 'List deals by stage',
			},
			{
				name: 'Update Deal (Per Deal-ID)',
				value: 'updateDeal',
				description: 'Update an existing deal',
				action: 'Update a deal',
			},
		],
		default: 'createDeal',
	},
];

export const dealFields: INodeProperties[] = [
	// ===== CREATE DEAL =====
	{
		displayName: 'Deal Name',
		name: 'name',
		type: 'string',
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
		required: true,
		default: '',
		description: 'Name of the Deal',
	},
	{
		displayName: 'Linked Contact Name or ID',
		name: 'contactId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
		required: true,
		default: '',
		description:
			'Associated contact ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
		required: true,
		default: '',
		description:
			'Pipeline to create the deal in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStagesByPipeline',
			loadOptionsDependsOn: ['pipelineId'],
			reloadOptions: true,
		},
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
		required: true,
		default: '',
		description:
			'Stage within the selected pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// CREATE – Mapper
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getDealResourceMapperFields',
				mode: 'add', // kein Matching-UI
				addAllFields: true, // bequem – wir filtern in der Action
				multiKeyMatch: false,
				supportAutoMap: false,
				fieldWords: { singular: 'field', plural: 'fields' },
			},
		},
		description: 'Additional deal fields to set on create',
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
		description: 'Whether server-unknown errors should be filtered out during creation',
	},

	// Initial Note (optional) bei CREATE
	{
		displayName: 'Also Create Initial Note?',
		name: 'createInitialNote',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['createDeal'],
			},
		},
		default: false,
		description: 'Whether if enabled, a note will be created right after the deal is created',
	},
	{
		displayName: 'Initial Note Text',
		name: 'initialNoteText',
		type: 'string',
		typeOptions: { rows: 4 },
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['createDeal'],
				createInitialNote: [true],
			},
		},
		default: '',
		description: 'Plain text; will be converted to Slate JSON automatically',
	},
	{
		displayName: 'Pin Note?',
		name: 'pinInitialNote',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['createDeal'],
				createInitialNote: [true],
			},
		},
		default: false,
	},
	{
		displayName: 'Bold Note Text?',
		name: 'makeBold',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['createDeal'],
				createInitialNote: [true],
			},
		},
		default: false,
	},

	// ===== UPDATE DEAL =====
	{
		displayName: 'Deal Name or ID',
		name: 'dealId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDeals',
			reloadOptions: true,
		},
		required: true,
		default: '',
		description:
			'Pick a deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['updateDeal', 'getById', 'changeDealPipelineStage'],
			},
		},
	},
	{
		displayName: 'Deal Name',
		name: 'name',
		type: 'string',
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
		default: '',
		description: 'Name of the Deal',
	},

	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		placeholder: 'contact@example.com',
		displayOptions: { show: { resource: ['deal'], operation: ['findDealsByEmail'] } },
		default: '',
		description: 'Email address of the contact whose related deals should be returned',
	},
	{
		displayName: 'Update Deal Pipeline/Stage?',
		name: 'updatePipelineStage',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['updateDeal'],
			},
		},
	},

	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'], updatePipelineStage: [true] } },
		default: '',
		description:
			'Pipeline to update the deal in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getStagesByPipeline',
			loadOptionsDependsOn: ['pipelineId'], // ⬅️
			reloadOptions: true,
		},
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'], updatePipelineStage: [true] } },

		description:
			'Stage within the selected pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// UPDATE – Mapper
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getDealResourceMapperFieldsForUpdate',
				mode: 'add', // blendet Match-UI aus
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
				fieldWords: { singular: 'field', plural: 'fields' },
			},
		},
		description: 'Fields to update. Leave fields empty to keep their current value.',
	},

	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
		default: true,
		description: 'Whether server-unknown errors should be filtered out during creation',
	},

	// Initial Note (optional) bei UPDATE
	{
		displayName: 'Also Create Initial Note?',
		name: 'createInitialNote',
		type: 'boolean',
		displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
		default: false,
		description: 'Whether if enabled, a note will be created right after the deal is updated',
	},
	{
		displayName: 'Initial Note Text',
		name: 'initialNoteText',
		type: 'string',
		typeOptions: { rows: 4 },
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['updateDeal'],
				createInitialNote: [true],
			},
		},
		default: '',
		description: 'Plain text (will be converted to Slate JSON)',
	},
	{
		displayName: 'Pin Note?',
		name: 'pinInitialNote',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['updateDeal'],
				createInitialNote: [true],
			},
		},
		default: false,
	},
	{
		displayName: 'Bold Note Text?',
		name: 'makeBold',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['updateDeal'],
				createInitialNote: [true],
			},
		},
		default: false,
	},

	// ===== PIPELINE DETAILS =====
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		displayOptions: { show: { resource: ['deal'], operation: ['getPipeline', 'listByStage'] } },
		default: '',
		description:
			'Pipeline ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// === LIST BY FILTER GROUP ===
	{
		displayName:
			'Filter groups are owned by the user and require user login. API keys cannot access user filter groups. Change the credentials for this process.',
		name: 'filterAuthInfo',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
	},

	{
		displayName: 'Filter Group Name or ID',
		name: 'filterGroupId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDealFilterGroups', reloadOptions: true },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
		description:
			'Saved filter group (requires Bearer token auth). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
		description:
			'Restrict to this pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getStagesByPipeline',
			loadOptionsDependsOn: ['pipelineId'],
			reloadOptions: true,
		},
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
		description:
			'Restrict to this stage (within the selected pipeline). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Search String',
		name: 'dealSearchString',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
	},
	{
		displayName: 'Page',
		name: 'dealPage',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0, numberPrecision: 0 },
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
	},
	{
		displayName: 'Limit',
		name: 'dealLimit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 100, numberPrecision: 0 },
		displayOptions: { show: { resource: ['deal'], operation: ['listByFilterGroup'] } },
		description: 'Max number of results (1–100)',
	},

	// ===== LIST BY STAGE =====
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStagesByPipeline',
			loadOptionsDependsOn: ['pipelineId'],
			reloadOptions: true,
		},
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
		required: true,
		default: '',
		description:
			'Stage ID to list deals from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Search String',
		name: 'dealSearchString',
		type: 'string',
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
		default: '',
		description: 'Optional search string to filter deals',
	},
	{
		displayName: 'Page',
		name: 'dealPage',
		type: 'number',
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
		default: 0,
		description: 'Page number (0-based)',
	},
	{
		displayName: 'Limit',
		name: 'dealLimit',
		type: 'number',
		displayOptions: { show: { resource: ['deal'], operation: ['listByStage'] } },
		default: 50,
		description: 'Max number of results',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
			numberPrecision: 0, // optional: nur ganze Zahlen
		},
	},

	// ===== CHANGE STAGE =====
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		displayOptions: { show: { resource: ['deal'], operation: ['changeDealPipelineStage'] } },
		required: true,
		default: '',
		description:
			'Target pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStagesByPipeline',
			loadOptionsDependsOn: ['pipelineId'],
			reloadOptions: true,
		},
		displayOptions: { show: { resource: ['deal'], operation: ['changeDealPipelineStage'] } },
		required: true,
		default: '',
		description:
			'Target stage. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
