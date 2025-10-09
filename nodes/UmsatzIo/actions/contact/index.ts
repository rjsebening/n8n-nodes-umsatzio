import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
		options: [
			{
				name: 'Create Contact',
				value: 'createContact',
				description: 'Create a new contact (no upsert)',
				action: 'Create a contact',
			},
			{
				name: 'Find Contact by Email',
				value: 'getByEmail',
				description: 'Find a contact by email address',
				action: 'Find contact by email',
			},
			{
				name: 'Get Contacts by Filter Group',
				value: 'listByFilterGroup',
				description: 'Apply a saved filter group and list the resulting contacts',
				action: 'List contacts by filter group',
			},
			{
				name: 'Search Contacts',
				value: 'searchContacts',
				description: 'Search contacts by text',
				action: 'Search contacts',
			},
			{
				name: 'Update Contact (by ID)',
				value: 'updateContact',
				description: 'Update a contact by ID',
				action: 'Update a contact by ID',
			},
			{
				name: 'Upsert Contact (by Email)',
				value: 'upsertContact',
				description: 'Find by email, update if found, otherwise create',
				action: 'Upsert a contact',
			},
		],
		default: 'upsertContact',
	},
];

export const contactFields: INodeProperties[] = [
	/**
	 * ==============
	 * CREATE (add)
	 * ==============
	 */
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getContactResourceMapperFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: true,
				multiKeyMatch: true,
				supportAutoMap: false,
			},
		},
		description: 'All available contact fields from your account',
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
		description: 'Whether server-unknown errors should be filtered out during creation',
	},
	// Optional initial note
	{
		displayName: 'Also Create Initial Note?',
		name: 'createInitialNote',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
	},
	{
		displayName: 'Initial Note Text',
		name: 'initialNoteText',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'], createInitialNote: [true] } },
	},
	{
		displayName: 'Pin Note?',
		name: 'pinInitialNote',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'], createInitialNote: [true] } },
	},
	{
		displayName: 'Bold Note Text?',
		name: 'makeBold',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['createContact'], createInitialNote: [true] } },
	},

	/**
	 * =====================
	 * UPDATE (by contactId)
	 * =====================
	 */
	{
		displayName: 'Search',
		name: 'contactSearch',
		type: 'string',
		default: '',
		placeholder: 'Name, email, …',
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
	},
	{
		displayName: 'Contact Name or ID',
		name: 'contactId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
		description:
			'Choose the contact to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Changing Email?',
		name: 'allowChangeEmail',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getContactResourceMapperFieldsForUpdate',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
		description: 'Whether server-unknown errors should be filtered out during creation',
	},
	// Optional note after update
	{
		displayName: 'Also Create Note?',
		name: 'createInitialNote',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
	},
	{
		displayName: 'Note Text',
		name: 'initialNoteText',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'], createInitialNote: [true] } },
	},
	{
		displayName: 'Pin Note?',
		name: 'pinInitialNote',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'], createInitialNote: [true] } },
	},
	{
		displayName: 'Bold Note Text?',
		name: 'makeBold',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['updateContact'], createInitialNote: [true] } },
	},

	/**
	 * ================
	 * UPSERT (by email)
	 * ================
	 */
	{
		displayName: 'Upsert always matches on global_contact_email.',
		name: 'upsertInfo',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['upsertContact'] } },
	},
	{
		displayName: 'Fields (for Create or Update)',
		name: 'fields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['upsertContact'] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getContactResourceMapperFields',
				mode: 'upsert',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},
	{
		displayName: 'Filter Unknown Fields',
		name: 'filterUnknownFields',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['contact'], operation: ['upsertContact'] } },
		description: 'Whether server-unknown errors should be filtered out during creation',
	},

	/**
	 * ===========
	 * OTHER OPS
	 * ===========
	 */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['getByEmail'] } },
	},
	{
		displayName: 'Search String',
		name: 'searchString',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
	},
	// --- LIST CONTACTS BY FILTER GROUP ---
	{
		displayName:
			'Filter groups are owned by the user and require user login. API keys cannot access user filter groups. Change the credentials for this process.',
		name: 'contactFilterAuthInfo',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['listByFilterGroup'] } },
	},

	{
		displayName: 'Filter Group Name or ID',
		name: 'filterGroupId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getContactFilterGroups', reloadOptions: true },
		displayOptions: { show: { resource: ['contact'], operation: ['listByFilterGroup'] } },
		description:
			'Saved filter group to apply before listing contacts. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Search String',
		name: 'searchString',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['listByFilterGroup'] } },
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0, numberPrecision: 0 },
		displayOptions: { show: { resource: ['contact'], operation: ['listByFilterGroup'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, numberPrecision: 0 },
		default: 50,
		displayOptions: { show: { resource: ['contact'], operation: ['listByFilterGroup'] } },
		description: 'Max number of results to return',
	},
];
