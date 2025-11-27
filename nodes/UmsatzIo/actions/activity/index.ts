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
			{
				name: 'Send Email',
				value: 'sendEmail',
				action: 'Send an email',
				description: 'Send an email and link it to a contact or deal',
			},
		],
		default: 'createNote',
	},
];

export const activityFields: INodeProperties[] = [
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
	// -------------------------
	// Activity: Send Email
	// -------------------------
	{
		displayName: 'Email Account Name or ID',
		name: 'emailAccountId',
		type: 'options',
		default: '',
		required: true,
		description:
			'Select the email account from which the email should be sent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getEmailAccounts',
		},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Parent Type',
		name: 'parentType',
		type: 'options',
		required: true,
		default: 'contact',
		options: [
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Deal',
				value: 'deal',
			},
		],
		description: 'Entity to which this email should be linked',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact or deal in Umsatz',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'fixedCollection',
		placeholder: 'Add Recipient',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Recipient',
				name: 'recipient',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						placeholder: 'recipient@example.com',
						description: 'Email address of the main recipient',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
		description: 'One or more primary recipients',
	},
	{
		displayName: 'CC',
		name: 'cc',
		type: 'fixedCollection',
		placeholder: 'Add CC Recipient',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Recipient',
				name: 'recipient',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						placeholder: 'cc@example.com',
						description: 'Email address of the CC recipient',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
		description: 'Optional CC recipients',
	},
	{
		displayName: 'BCC',
		name: 'bcc',
		type: 'fixedCollection',
		placeholder: 'Add BCC Recipient',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Recipient',
				name: 'recipient',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						placeholder: 'bcc@example.com',
						description: 'Email address of the BCC recipient',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
		description: 'Optional BCC recipients',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		description: 'Subject line of the email',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},

	{
		displayName: 'Message (JSON)',
		name: 'message',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
			rows: 15,
		},
		default: '',
		description: 'Rich text content as JSON (Slate format) – you can pass the JSON string you get from Umsatz',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName:
			'Email signatures are owned by the user and require user login. API keys cannot access the user email signature. Change the credentials for this process.',
		name: 'signatureAuthInfo',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Email Signature Name or ID',
		name: 'signatureId',
		type: 'options',
		default: '',
		description:
			'Optional email signature to append to the message body. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getEmailSignatures',
		},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Umsatz.io E-Mail-Branding',
		name: 'umsatzSignature',
		type: 'boolean',
		default: false,
		description: 'Whether you want umsatz.io branding to appear in your emails',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendEmail'],
			},
		},
	},
];
