import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
		options: [
			{ name: 'Create Contact', value: 'createContact', action: 'Create a new contact' },
			{ name: 'Get by Email', value: 'getByEmail', action: 'Get contact by email' },
			{ name: 'Get Notes', value: 'getNotes', action: 'Get notes for a contact' },
			{ name: 'Get Phone Call Activities', value: 'getPhoneCallActivities', action: 'Get phone call activities' },
			{ name: 'Search Contacts', value: 'searchContacts', action: 'Search contacts' },
			{ name: 'Update Contact', value: 'updateContact', action: 'Update an existing contact' },
			{ name: 'Create Note (Contact)', value: 'createNote', action: 'Add a note to a contact' },
		],
		default: 'getByEmail',
	},
];

export const contactFields: INodeProperties[] = [
	/** -----------------------------
	 * getByEmail
	 * ----------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'name@example.com',
		description: 'Email address of the contact',
		displayOptions: { show: { resource: ['contact'], operation: ['getByEmail'] } },
	},

	/** -----------------------------
	 * searchContacts
	 * ----------------------------- */
	{
		displayName: 'Search String',
		name: 'searchString',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. industry, company name, person, etc.',
		description: 'Free-text search',
		displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Page number (0-based)',
		displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
	},

	/** -----------------------------
	 * createContact
	 * ----------------------------- */
	{
		displayName: 'Required Fields',
		name: 'requiredFields',
		type: 'fixedCollection',
		placeholder: 'Add Required Field',
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
						noDataExpression: true,
						typeOptions: { loadOptionsMethod: 'getRequiredContactFields' },
						required: true,
						default: '',
						description: 'Choose a required field from Umsatz.io.',
					},
					{
						displayName: 'Value Mode (Auto)',
						name: 'valueMode',
						type: 'options',
						noDataExpression: true,
						typeOptions: {
							loadOptionsMethod: 'getFieldValueMode',
							loadOptionsDependsOn: ['fieldId'],
						},
						default: 'text',
						description: 'Auto-detected value mode based on the selected field.',
					},
					{
						displayName: 'Value (Text/Number/Boolean)',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { show: { valueMode: ['text'] } },
						description: 'Enter text, number, or boolean (true/false).',
					},
					{
						displayName: 'Value (Option) Name or ID',
						name: 'valueOption',
						type: 'options',
						noDataExpression: true,
						typeOptions: {
							loadOptionsMethod: 'getOptionsForField',
							loadOptionsDependsOn: ['fieldId'],
						},
						default: '',
						displayOptions: { show: { valueMode: ['option'] } },
						description: 'Pick one of the allowed options (for dropdown/enum fields).',
					},
					{
						displayName: 'Value (Date/DateTime)',
						name: 'valueDate',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { valueMode: ['date'] } },
						description: 'Pick a date or date-time (for day/dayTime/date fields).',
					},
				],
			},
		],
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
	},
	{
		displayName: 'Optional Fields',
		name: 'optionalFields',
		type: 'fixedCollection',
		placeholder: 'Add Optional Field',
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
						noDataExpression: true,
						typeOptions: { loadOptionsMethod: 'getOptionalContactFields' },
						required: true,
						default: '',
						description: 'Choose an optional field from Umsatz.io.',
					},
					{
						displayName: 'Value Mode (Auto)',
						name: 'valueMode',
						type: 'options',
						noDataExpression: true,
						typeOptions: {
							loadOptionsMethod: 'getFieldValueMode',
							loadOptionsDependsOn: ['fieldId'],
						},
						default: 'text',
						description: 'Auto-detected value mode based on the selected field.',
					},
					{
						displayName: 'Value (Text/Number/Boolean)',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { show: { valueMode: ['text'] } },
						description: 'Enter text, number, or boolean (true/false).',
					},
					{
						displayName: 'Value (Option) Name or ID',
						name: 'valueOption',
						type: 'options',
						noDataExpression: true,
						typeOptions: {
							loadOptionsMethod: 'getOptionsForField',
							loadOptionsDependsOn: ['fieldId'],
						},
						default: '',
						displayOptions: { show: { valueMode: ['option'] } },
						description: 'Pick one of the allowed options (for dropdown/enum fields).',
					},
					{
						displayName: 'Value (Date/DateTime)',
						name: 'valueDate',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { valueMode: ['date'] } },
						description: 'Pick a date or date-time (for day/dayTime/date fields).',
					},
				],
			},
		],
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: false,
		description: 'Whether to ignore fields not defined in schema',
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
	},

	/** -----------------------------
	 * updateContact
	 * ----------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the contact to update',
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
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
						noDataExpression: true,
						typeOptions: { loadOptionsMethod: 'getContactFields' },
						required: true,
						default: '',
						description: 'Choose a field to update.',
					},
					{
						displayName: 'Value Mode (Auto)',
						name: 'valueMode',
						type: 'options',
						noDataExpression: true,
						typeOptions: {
							loadOptionsMethod: 'getFieldValueMode',
							loadOptionsDependsOn: ['fieldId'],
						},
						default: 'text',
						description: 'Auto-detected value mode based on the selected field.',
					},
					{
						displayName: 'Value (Text/Number/Boolean)',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { show: { valueMode: ['text'] } },
						description: 'Enter text, number, or boolean (true/false).',
					},
					{
						displayName: 'Value (Option) Name or ID',
						name: 'valueOption',
						type: 'options',
						noDataExpression: true,
						typeOptions: {
							loadOptionsMethod: 'getOptionsForField',
							loadOptionsDependsOn: ['fieldId'],
						},
						default: '',
						displayOptions: { show: { valueMode: ['option'] } },
						description: 'Pick one of the allowed options (for dropdown/enum fields).',
					},
					{
						displayName: 'Value (Date/DateTime)',
						name: 'valueDate',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { valueMode: ['date'] } },
						description: 'Pick a date or date-time (for day/dayTime/date fields).',
					},
				],
			},
		],
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: false,
		description: 'Whether to ignore fields not defined in schema',
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
	},

	/** -----------------------------
	 * getNotes
	 * ----------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the contact',
		displayOptions: { show: { resource: ['contact'], operation: ['getNotes'] } },
	},
	{
		displayName: 'Page',
		name: 'notesPage',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Page number (0-based)',
		displayOptions: { show: { resource: ['contact'], operation: ['getNotes'] } },
	},
	{
		displayName: 'Limit',
		name: 'notesLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
		description: 'Number of entries per page',
		displayOptions: { show: { resource: ['contact'], operation: ['getNotes'] } },
	},

	/** -----------------------------
	 * getPhoneCallActivities
	 * ----------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the contact',
		displayOptions: { show: { resource: ['contact'], operation: ['getPhoneCallActivities'] } },
	},
	{
		displayName: 'Page',
		name: 'callsPage',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Page number (0-based)',
		displayOptions: { show: { resource: ['contact'], operation: ['getPhoneCallActivities'] } },
	},
	{
		displayName: 'Limit',
		name: 'callsLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
		description: 'Number of entries per page',
		displayOptions: { show: { resource: ['contact'], operation: ['getPhoneCallActivities'] } },
	},

	/** -----------------------------
	 * createNote (contact)
	 * ----------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		description: 'Parent contact ID',
		displayOptions: { show: { resource: ['contact'], operation: ['createNote'] } },
	},
	{
		displayName: 'Description (JSON RichText)',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['createNote'] } },
	},
];
