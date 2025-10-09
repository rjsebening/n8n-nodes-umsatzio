import type { INodeProperties } from 'n8n-workflow';

export const instantProperties: INodeProperties[] = [
	{
		displayName: 'Event',
		name: 'events',
		type: 'options',
		default: 'newDeal',
		options: [
			{
				name: 'Modify a Contact Property',
				value: 'changeContactProperty',
				description: 'Triggers when a contact property is filled or edited',
			},
			{
				name: 'Modify a Deal Property',
				value: 'changeDealProperty',
				description: 'Triggers when a deal property is filled or edited',
			},
			{
				name: 'Modify the Stage of a Deal',
				value: 'updateDealStage',
				description: 'Triggers when the deal stage of a deal changes',
			},
			{
				name: 'New Contact',
				value: 'newContact',
				description: 'Triggers when a new contact is created in the system',
			},
			{ name: 'New Deal', value: 'newDeal', description: 'Triggers when a new deal is created in the system' },
			{
				name: 'New Form Submission',
				value: 'submitForm',
				description: 'Triggers when a new form is submitted in the system',
			},
			{
				name: 'New Phone Call Activity',
				value: 'newActivity',
				description: 'Triggers when a user tracks a new call in the app',
			},
		],
		description: 'Which event should trigger the webhook?',
	},

	/** ---------- Contact Property Trigger ---------- */
	{
		displayName: 'Contact Propertie Names or IDs',
		name: 'contactProperties',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getContactProperties' },
		default: [],
		required: true,
		placeholder: 'Select contact propertie',
		displayOptions: { show: { events: ['changeContactProperty'] } },
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},

	/** ---------- Deal Property Trigger ---------- */
	{
		displayName: 'Deal Propertie Names or IDs',
		name: 'dealProperties',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getDealProperties' },
		default: [],
		required: true,
		placeholder: 'Select deal propertie',
		displayOptions: { show: { events: ['changeDealProperty'] } },
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},

	/** ------- Deal Stage Trigger Scope ------- */
	{
		displayName: 'Trigger Scope',
		name: 'dealStageScope',
		type: 'options',
		default: 'all',
		options: [
			{ name: 'All Pipelines & Stages', value: 'all' },
			{ name: 'Specific Pipeline (Any Stage)', value: 'pipeline' },
			{ name: 'Specific Stage in Pipeline', value: 'specific' },
		],
		displayOptions: { show: { events: ['updateDealStage'] } },
		description: 'Control whether to trigger on all stage changes, a specific pipeline, or a specific stage',
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		displayOptions: {
			show: { events: ['updateDealStage'], dealStageScope: ['pipeline', 'specific'] },
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStages', loadOptionsDependsOn: ['pipelineId'] },
		default: '',
		displayOptions: {
			show: { events: ['updateDealStage'], dealStageScope: ['specific'] },
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},

	/** ---------- Form Trigger ---------- */
	{
		displayName: 'Form Names or Name or ID',
		name: 'formIds',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getForms' },
		default: '',
		required: true,
		placeholder: 'Select form',
		displayOptions: { show: { events: ['submitForm'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},

	// ——— NEW ACTIVITY ———
	// 1) Call Type Mode
	{
		displayName: 'Select Call Type',
		name: 'callTypeMode',
		type: 'options',
		default: 'any',
		options: [
			{ name: 'Any Call', value: 'any' },
			{ name: 'Specific Call', value: 'specific' },
		],
		displayOptions: { show: { events: ['newActivity'] } },
		description: 'Filter by call type or listen to any call',
	},
	// 2) Specific: choose Call Type
	{
		displayName: 'Select a Specific Call Type Name or ID',
		name: 'phoneCallActivityTypeId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPhoneCallActivityTypes' },
		default: '',
		displayOptions: { show: { events: ['newActivity'], callTypeMode: ['specific'] } },
		description:
			'Pick a phone call activity type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// 3) Call Result Mode
	{
		displayName: 'Select Call Result Type',
		name: 'callResultMode',
		type: 'options',
		default: 'any',
		options: [
			{ name: 'Any Call Result', value: 'any' },
			{ name: 'Specific Result', value: 'specific' },
		],
		displayOptions: { show: { events: ['newActivity'] } },
		description: 'Filter by result type or listen to any result',
	},
	// 4) Specific: choose Result Types (multi, abhängig vom Call Type Mode)
	{
		displayName: 'Select Specific Call Result Name or ID',
		name: 'callResultTypes',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCallResultTypes',
			loadOptionsDependsOn: ['callTypeMode', 'phoneCallActivityTypeId'],
		},
		default: '',
		displayOptions: { show: { events: ['newActivity'], callResultMode: ['specific'] } },
		description:
			'Pick a phone call result. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	/** ---------- Extras & housekeeping ---------- */
	{
		displayName: 'Additional Properties (Optional)',
		name: 'propertiesExtra',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		options: [
			{
				name: 'property',
				displayName: 'Property',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'e.g. source=n8n',
					},
				],
			},
		],
		description: 'Free strings; sent additionally to properties',
	},
];
