// nodes/UmsatzIo/properties/activity.properties.ts
import { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['activity'] } },
		options: [
			{
				name: 'Create Note',
				value: 'createNote',
				action: 'Create note on contact',
				description: 'Add an internal note to a contact to capture context, updates, or reminders',
			},
			{
				name: 'Get Phone Call by ID',
				value: 'getPhoneCallActivityById',
				action: 'Get a phone call by id',
				description: 'Fetch a single phone call activity by its ID',
			},
			{
				name: 'List Email Activities',
				value: 'listEmailActivities',
				action: 'List contact emails',
				description: 'Retrieve a history of emails exchanged with the selected contact',
			},
			{
				name: 'List Notes',
				value: 'listNotes',
				action: 'List contact notes',
				description: 'Fetch all notes that have been created for a specific contact',
			},
			{
				name: 'List Phone Call Activities',
				value: 'listPhoneCallActivities',
				action: 'List contact calls',
				description: 'Retrieve logged phone call activities related to the contact',
			},
			{
				name: 'Log Email',
				value: 'logEmail',
				action: 'Log email on contact',
				description: 'Manually log an email activity to a contact (e.g., external correspondence)',
			},
		],
		default: 'createNote',
	},
];

export const activityFields: INodeProperties[] = [
	// Contact picker (für alle Ops)
	// Contact picker NUR für Ops, die einen Kontakt brauchen
	{
		displayName: 'Search',
		name: 'contactSearch',
		type: 'string',
		default: '',
		placeholder: 'Name, email, …',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['createNote', 'logEmail', 'listEmailActivities', 'listNotes', 'listPhoneCallActivities'],
			},
		},
	},
	{
		displayName: 'Contact Name or ID',
		name: 'contactId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['createNote', 'logEmail', 'listEmailActivities', 'listNotes', 'listPhoneCallActivities'],
			},
		},
		description:
			'Choose the contact. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// Create Note
	{
		displayName: 'Note Text',
		name: 'noteText',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['createNote'] } },
		description: 'Plain text or Slate JSON string',
	},
	{
		displayName: 'Pin Note?',
		name: 'pinNote',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['activity'], operation: ['createNote'] } },
	},
	{
		displayName: 'Bold Text?',
		name: 'makeBold',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['activity'], operation: ['createNote'] } },
	},

	// Log Email
	{
		displayName: 'Info: Uses contact’s global_contact_email',
		name: 'info',
		type: 'notice',
		default: 'global_contact_email',
		displayOptions: { show: { resource: ['activity'], operation: ['logEmail'] } },
	},
	{
		displayName: 'Activity Time',
		name: 'activityTime',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['logEmail'] } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['logEmail'] } },
	},
	{
		displayName: 'Bold Text?',
		name: 'makeBold',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['activity'], operation: ['logEmail'] } },
	},

	// Pagination (gemeinsam)
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 0,
		displayOptions: {
			show: { resource: ['activity'], operation: ['listEmailActivities', 'listPhoneCallActivities', 'listNotes'] },
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 50,
		typeOptions: { minValue: 1, numberPrecision: 0 },
		displayOptions: {
			show: { resource: ['activity'], operation: ['listEmailActivities', 'listPhoneCallActivities', 'listNotes'] },
		},
	},
	{
		displayName: 'Phone Call Activity ID',
		name: 'phoneCallActivityId',
		type: 'string',
		default: '',
		placeholder: '58bb6680-84e6-480b-bb34-bfd351a822bc',
		description: 'The ID of the phone call activity to fetch',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getPhoneCallActivityById'],
			},
		},
	},
];
