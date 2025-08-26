import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeConnectionType,
	ApplicationError,
} from 'n8n-workflow';

import { contactOperations, contactFields } from './descriptions/ContactDescription';
import { contactMetaOperations, contactMetaFields } from './descriptions/ContactMetaDescription';
import { dealOperations, dealFields } from './descriptions/DealDescription';
import { dealMetaOperations, dealMetaFields } from './descriptions/DealMetaDescription';
import { graphQLOperations, graphQLFields } from './descriptions/GraphQLDescription';

/**
 * --------------------------------------------------
 * GraphQL Helper: setzt Authorization selbst + harte Fehler
 * --------------------------------------------------
 */
async function gqlCall(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	body: { operationName?: string; query: string; variables?: IDataObject },
) {
	const credentials = await ctx.getCredentials('umsatzIoApi');
	const endpoint = ((credentials.endpoint as string) || 'https://app.umsatz.io/api/graphql').trim();

	// Authorization-Header sicher aufbauen
	let token = (credentials as any).token as string | undefined;
	if (!token || !token.trim()) {
		throw new ApplicationError('Missing credential "token" for Umsatz.io');
	}
	token = token.trim();
	const authHeader = token.toLowerCase().startsWith('basic ') ? token : `Basic ${token}`;

	const opts: any = {
		method: 'POST',
		url: endpoint,
		headers: {
			Authorization: authHeader,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body,
		json: true,
		returnFullResponse: true,
		throwHttpErrors: false,
	};

	let resp: any;
	try {
		resp = await (ctx as any).helpers.httpRequest(opts);
	} catch (err) {
		const e = err as any;
		const status = e?.statusCode || e?.response?.statusCode;
		const bodyText =
			e?.response?.body && typeof e.response.body !== 'string'
				? JSON.stringify(e.response.body)
				: e?.response?.body || e?.message;
		throw new ApplicationError(`HTTP request failed${status ? ` (HTTP ${status})` : ''}: ${bodyText}`);
	}

	const statusCode = resp?.statusCode ?? resp?.status ?? 0;
	const rawBody = resp?.body ?? resp;

	if (statusCode >= 400) {
		let msg = '';
		if (typeof rawBody === 'string') msg = rawBody;
		else if (rawBody?.errors?.[0]?.message) msg = rawBody.errors[0].message;
		else msg = JSON.stringify(rawBody);
		throw new ApplicationError(`HTTP ${statusCode}: ${msg}`);
	}

	if (rawBody?.errors?.length) {
		const first = rawBody.errors[0];
		throw new ApplicationError(first?.message ?? 'GraphQL error');
	}

	if (rawBody?.data !== undefined) return rawBody.data;
	return rawBody;
}

async function getFieldMeta(
	ctx: IExecuteFunctions,
	fieldId: string,
): Promise<{ name: string; fieldType?: string; dataType?: string }> {
	const data = await gqlCall(ctx, {
		operationName: 'Field',
		query: 'query Field($fieldId: ID!) { field(fieldId: $fieldId) { id name fieldType dataType } }',
		variables: { fieldId },
	});
	return {
		name: data?.field?.name as string,
		fieldType: data?.field?.fieldType as string | undefined,
		dataType: data?.field?.dataType as string | undefined,
	};
}

async function buildDataFromEntries(
	ctx: IExecuteFunctions,
	entries: Array<{ fieldId: string; value?: any; valueOption?: any; valueDate?: string }> | undefined,
): Promise<IDataObject> {
	const out: IDataObject = {};
	if (!Array.isArray(entries)) return out;

	for (const e of entries) {
		if (!e?.fieldId) continue;
		const meta = await getFieldMeta(ctx, e.fieldId);
		const key = meta.name || e.fieldId;

		const ft = (meta.fieldType || '').toLowerCase();
		const dt = (meta.dataType || '').toLowerCase();

		let val: any;
		if (ft === 'dropdown' || dt === 'enum') {
			// bevorzugt Option
			if (e.valueOption !== undefined && e.valueOption !== '') val = e.valueOption;
			else if (e.value !== undefined && e.value !== '') val = e.value; // fallback
		} else if (ft === 'day' || dt === 'date') {
			if (e.valueDate) val = e.valueDate;
		} else if (ft === 'daytime') {
			if (e.valueDate) val = e.valueDate;
		} else if (ft === 'switch' || dt === 'boolean') {
			// string "true"/"false" → boolean
			if (typeof e.value === 'boolean') val = e.value;
			else if (typeof e.value === 'string') val = e.value.toLowerCase() === 'true';
		} else {
			// numeric/currency … als Text/Number erlauben
			if (e.value !== undefined && e.value !== '') val = e.value;
			else if (e.valueDate)
				val = e.valueDate; // falls Nutzer Datum doch hier ablegt
			else if (e.valueOption) val = e.valueOption; // und andersrum
		}

		if (val !== undefined) out[key] = val;
	}

	return out;
}

/**
 * --------------------------------------------------
 * Node
 * --------------------------------------------------
 */
export class UmsatzIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Umsatz.io',
		name: 'umsatzIo',
		icon: 'fa:table',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Interact with Umsatz.io GraphQL API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Umsatz.io',
			// @ts-expect-error required by n8n linter (freie Beschreibung)
			description: 'Umsatz.io integration node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'umsatzIoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },

					{ name: 'Deal', value: 'deal' },
					{ name: 'GraphQL', value: 'graphql' },
				],
				default: 'contact',
			},

			// Descriptions einbinden
			...contactOperations,
			...contactFields,

			...contactMetaOperations,
			...contactMetaFields,

			...dealOperations,
			...dealFields,

			...dealMetaOperations,
			...dealMetaFields,

			...graphQLOperations,
			...graphQLFields,
		],
	};

	/**
	 * --------------------------------------------------
	 * Load Options (Dropdowns etc.)
	 * --------------------------------------------------
	 */
	methods = {
		loadOptions: {
			// Pipelines
			async getPipelines(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'Pipelines',
					query: 'query Pipelines { pipelines { id name dealsTotal } }',
				});
				return (data?.pipelines ?? []).map((p: any) => ({ name: p.name, value: p.id }));
			},

			// Stages basierend auf Pipeline
			async getStagesByPipeline(this: ILoadOptionsFunctions) {
				const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
				if (!pipelineId) return [];
				const data = await gqlCall(this, {
					operationName: 'Pipeline',
					query:
						'query Pipeline($pipelineId: String!) { pipeline(pipelineId: $pipelineId) { stages { id name color } } }',
					variables: { pipelineId },
				});
				return (data?.pipeline?.stages ?? []).map((s: any) => ({ name: s.name, value: s.id }));
			},

			// Alle Contact-Felder (Label als Name, value = fieldId)
			async getRequiredContactFields(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'ContactCards',
					query: 'query ContactCards { cards(serviceType: contact) { fields { id label name required } } }',
				});
				const raw = (data?.cards ?? []).flatMap((c: any) => c.fields || []);
				const map = new Map<string, any>();
				for (const f of raw) if (f?.required) map.set(f.id, f);
				return Array.from(map.values()).map((f: any) => ({
					name: f.label || f.name,
					value: f.id,
				}));
			},

			async getOptionalContactFields(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'ContactCards',
					query: 'query ContactCards { cards(serviceType: contact) { fields { id label name required } } }',
				});
				const raw = (data?.cards ?? []).flatMap((c: any) => c.fields || []);
				const map = new Map<string, any>();
				for (const f of raw) if (!f?.required) map.set(f.id, f);
				return Array.from(map.values()).map((f: any) => ({
					name: f.label || f.name,
					value: f.id,
				}));
			},

			async getContactFields(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'ContactCards',
					query: 'query ContactCards { cards(serviceType: contact) { fields { id label name } } }',
				});
				const raw = (data?.cards ?? []).flatMap((c: any) => c.fields || []);
				const map = new Map<string, any>();
				for (const f of raw) map.set(f.id, f);
				return Array.from(map.values()).map((f: any) => ({ name: f.label || f.name, value: f.id }));
			},

			async getDealFields(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'DealCards',
					query: 'query DealCards { cards(serviceType: deal) { fields { id label name } } }',
				});
				const raw = (data?.cards ?? []).flatMap((c: any) => c.fields || []);
				const map = new Map<string, any>();
				for (const f of raw) map.set(f.id, f);
				return Array.from(map.values()).map((f: any) => ({ name: f.label || f.name, value: f.id }));
			},

			// Pflichtfelder (Deal)
			async getRequiredDealFieldDefinitions(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'DealCards',
					query: 'query DealCards { cards(serviceType: deal) { fields { id label name required } } }',
				});
				const fields = data?.cards?.flatMap((c: any) => c.fields) ?? [];
				return fields.filter((f: any) => f.required).map((f: any) => ({ name: f.label || f.name, value: f.id }));
			},

			// Optionale Felder (Deal)
			async getOptionalDealFields(this: ILoadOptionsFunctions) {
				const data = await gqlCall(this, {
					operationName: 'DealCards',
					query: 'query DealCards { cards(serviceType: deal) { fields { id label name required } } }',
				});
				const fields = data?.cards?.flatMap((c: any) => c.fields) ?? [];
				return fields.filter((f: any) => !f.required).map((f: any) => ({ name: f.label || f.name, value: f.id }));
			},

			async getFieldKind(this: ILoadOptionsFunctions) {
				const fieldId = this.getCurrentNodeParameter('fieldId') as string;
				if (!fieldId) {
					return [{ name: 'Text/Number', value: 'text' }];
				}
				const data = await gqlCall(this, {
					operationName: 'Field',
					query: 'query Field($fieldId: ID!) { field(fieldId: $fieldId) { id fieldType dataType } }',
					variables: { fieldId },
				});

				const ft = (data?.field?.fieldType ?? '').toString().toLowerCase();
				const dt = (data?.field?.dataType ?? '').toString().toLowerCase();

				// einfache Normalisierung
				if (ft.includes('select') || ft === 'dropdown' || dt === 'option') {
					return [{ name: 'Option', value: 'option' }];
				}
				if (dt === 'date' || ft === 'date') {
					return [{ name: 'Date', value: 'date' }];
				}
				if (dt === 'datetime' || ft === 'datetime') {
					return [{ name: 'DateTime', value: 'datetime' }];
				}
				if (dt === 'number' || ft === 'number') {
					return [{ name: 'Text/Number', value: 'number' }];
				}
				if (dt === 'email') {
					return [{ name: 'Text/Number', value: 'email' }];
				}
				if (dt === 'phone') {
					return [{ name: 'Text/Number', value: 'phone' }];
				}
				return [{ name: 'Text/Number', value: 'text' }];
			},
			// 1) Ermittelt den Value-Mode für ein ausgewähltes Feld (option | date | text)
			async getFieldValueMode(this: ILoadOptionsFunctions) {
				const fieldId = this.getCurrentNodeParameter('fieldId') as string;
				if (!fieldId) return [{ name: 'Text', value: 'text' }];

				const data = await gqlCall(this, {
					operationName: 'Field',
					query:
						'query Field($fieldId: ID!) { field(fieldId: $fieldId) { id fieldType dataType options { id value } } }',
					variables: { fieldId },
				});

				const f = data?.field;
				if (!f) return [{ name: 'Text', value: 'text' }];

				// Heuristik:
				// - Dropdown/enum => option
				// - day / dayTime / dataType==date => date
				// - alles andere => text
				let mode: 'option' | 'date' | 'text' = 'text';

				const isEnum = f?.fieldType === 'dropdown' || f?.dataType === 'enum' || Array.isArray(f?.options);
				const isDate = f?.fieldType === 'day' || f?.fieldType === 'dayTime' || f?.dataType === 'date';

				if (isEnum) mode = 'option';
				else if (isDate) mode = 'date';
				else mode = 'text';

				return [{ name: mode, value: mode }];
			},

			// 2) Options für Dropdown-Felder
			async getOptionsForField(this: ILoadOptionsFunctions) {
				const fieldId = this.getCurrentNodeParameter('fieldId') as string;
				if (!fieldId) return [];
				const data = await gqlCall(this, {
					operationName: 'Field',
					query: 'query Field($fieldId: ID!) { field(fieldId: $fieldId) { id options { id value } } }',
					variables: { fieldId },
				});
				const opts = data?.field?.options ?? [];
				return (opts as any[]).map((o) => ({ name: o.value, value: o.value }));
			},

			// 3) (Optional) ein lesbares Label des Feldtyps anzeigen (nur UI-Hilfe)
			async getFieldTypeLabel(this: ILoadOptionsFunctions) {
				const fieldId = this.getCurrentNodeParameter('fieldId') as string;
				if (!fieldId) return [{ name: 'Text', value: 'text' }];

				const data = await gqlCall(this, {
					operationName: 'Field',
					query: 'query Field($fieldId: ID!) { field(fieldId: $fieldId) { id fieldType dataType } }',
					variables: { fieldId },
				});

				const f = data?.field;
				if (!f) return [{ name: 'Text', value: 'text' }];
				const label = [f.fieldType, f.dataType].filter(Boolean).join(' • ') || 'text';
				return [{ name: label, value: label }];
			},

			// Entscheidet, welche Value-UI gezeigt wird (text | option | date)
async fieldIdKind(this: ILoadOptionsFunctions) {
  const fieldId = this.getCurrentNodeParameter('fieldId') as string;
  if (!fieldId) return [{ name: 'Text', value: 'text' }];

  const data = await gqlCall(this, {
    operationName: 'Field',
    query: 'query Field($fieldId: ID!) { field(fieldId: $fieldId) { id fieldType dataType options { id value } } }',
    variables: { fieldId },
  });

  const f = data?.field;
  if (!f) return [{ name: 'Text', value: 'text' }];

  const ft = String(f.fieldType || '').toLowerCase();
  const dt = String(f.dataType || '').toLowerCase();
  const isEnum = ft === 'dropdown' || dt === 'enum' || Array.isArray(f.options);
  const isDate = ft === 'day' || ft === 'daytime' || dt === 'date';

  const mode = isEnum ? 'option' : isDate ? 'date' : 'text';
  // WICHTIG: exakt die Namen zurückgeben, die in displayOptions.show oben referenziert werden
  return [{ name: mode, value: mode }];
}

		},
	};

	/**
	 * --------------------------------------------------
	 * Execute
	 * --------------------------------------------------
	 */
	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			// --------------- CONTACT ---------------
			if (resource === 'contact') {
				// Create Contact
				if (operation === 'createContact') {
					const req = this.getNodeParameter('requiredFields.field', i, []) as Array<{
						fieldId: string;
						value?: any;
						valueOption?: any;
						valueDate?: string;
					}>;
					const opt = this.getNodeParameter('optionalFields.field', i, []) as Array<{
						fieldId: string;
						value?: any;
						valueOption?: any;
						valueDate?: string;
					}>;
					const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, false) as boolean;

					const dataReq = await buildDataFromEntries(this, req);
					const dataOpt = await buildDataFromEntries(this, opt);
					const data = { ...dataReq, ...dataOpt } as IDataObject;

					const gqlPayload = {
						operationName: 'CreateContact',
						query: `mutation CreateContact($data: JSONObject, $filterUnknownFields: Boolean) {
							createContact(input: { data: $data }, filterUnknownFields: $filterUnknownFields) { id }
						}`,
						variables: { data, filterUnknownFields },
					};
					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.createContact ?? {});
					continue;
				}

				// Create Note (for Contact)
				if (operation === 'createNote') {
					const parentId = this.getNodeParameter('contactId', i) as string;
					const description = this.getNodeParameter('description', i) as string;

					const gqlPayload = {
						operationName: 'CreateNote',
						query: `mutation CreateNote($parentId: String!, $description: String!) {
							createNote(input: { parentId: $parentId, description: $description }) { id }
						}`,
						variables: { parentId, description },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.createNote ?? {});
					continue;
				}

				// Get Notes (for Contact)
				if (operation === 'getNotes') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					const page = this.getNodeParameter('notesPage', i, 0) as number;
					const limit = this.getNodeParameter('notesLimit', i, 50) as number;

					const gqlPayload = {
						operationName: 'ContactNotes',
						query: `query ContactNotes($contactId: ID!, $pagination: PaginationInput!) {
							contactNotes(contactId: $contactId, pagination: $pagination) {
								notes { data { id description createdAt updatedAt } }
								count
							}
						}`,
						variables: { contactId, pagination: { page, limit } },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push({ contactId, notes: result?.contactNotes ?? null });
					continue;
				}

				// Update Contact
				if (operation === 'updateContact') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					const upd = this.getNodeParameter('updateFields.field', i, []) as Array<{
						fieldId: string;
						value?: any;
						valueOption?: any;
						valueDate?: string;
					}>;
					const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, false) as boolean;

					const data = await buildDataFromEntries(this, upd);

					const gqlPayload = {
						operationName: 'UpdateContact',
						query: `mutation UpdateContact($contactId: String!, $data: JSONObject, $filterUnknownFields: Boolean) {
							updateContact(input: { id: $contactId, data: $data }, filterUnknownFields: $filterUnknownFields) { id }
						}`,
						variables: { contactId, data, filterUnknownFields },
					};
					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.updateContact ?? {});
					continue;
				}

				// Get by Email
				if (operation === 'getByEmail') {
					const email = this.getNodeParameter('email', i) as string;
					const data = await gqlCall(this, {
						operationName: 'ContactByEmail',
						query:
							'query ContactByEmail($email: String!) { contactByEmail(email: $email) { id isArchived createdAt updatedAt tenantId data } }',
						variables: { email },
					});
					returnData.push({ email, contact: data?.contactByEmail ?? null });
					continue;
				}

				// Search Contacts
				if (operation === 'searchContacts') {
					const searchString = this.getNodeParameter('searchString', i) as string;
					const page = this.getNodeParameter('page', i) as number;
					const limit = this.getNodeParameter('limit', i) as number;
					const qSearch = JSON.stringify(searchString);
					const data = await gqlCall(this, {
						operationName: 'Contacts',
						query: `query Contacts {
							contacts(searchString: ${qSearch}, pagination: { page: ${page}, limit: ${limit} }) {
								data {
									id tenantId authorId data isArchived lastContactAttempt lastContactPersonId createdAt updatedAt
									lastContactPerson { id role createdAt deletedAt }
									deals { id pipelineId stageId contactId name data isArchived authorId lastContactAttempt createdAt updatedAt }
								}
								pagination { page limit total }
							}
						}`,
					});
					returnData.push({
						searchString,
						pagination: data?.contacts?.pagination,
						contacts: data?.contacts?.data ?? [],
					});
					continue;
				}

				throw new ApplicationError(`Unsupported Contact operation: ${operation}`);
			}

			// --------------- DEAL ---------------
			if (resource === 'deal') {
				// Create Deal
				if (operation === 'createDeal') {
					const name = this.getNodeParameter('name', i) as string;
					const contactId = this.getNodeParameter('contactId', i) as string;
					const pipelineId = this.getNodeParameter('pipelineId', i) as string;
					const stageId = this.getNodeParameter('stageId', i) as string;
					const add = this.getNodeParameter('additionalFields.field', i, []) as Array<{
						fieldId: string;
						value?: any;
						valueOption?: any;
						valueDate?: string;
					}>;

					const dataExtra = await buildDataFromEntries(this, add);

					const gqlPayload = {
						operationName: 'CreateDeal',
						query: `mutation CreateDeal($name: String!, $contactId: String!, $pipelineId: String!, $stageId: String!, $data: JSONObject) {
							createDeal(input: { name: $name, contactId: $contactId, pipelineId: $pipelineId, stageId: $stageId, data: $data }) {
								id name contactId pipelineId stageId data
							}
						}`,
						variables: { name, contactId, pipelineId, stageId, data: dataExtra },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.createDeal ?? {});
					continue;
				}

				// Update Deal
				if (operation === 'updateDeal') {
					const dealId = this.getNodeParameter('dealId', i) as string;
					const upd = this.getNodeParameter('updateFields.field', i, []) as Array<{
						fieldId: string;
						value?: any;
						valueOption?: any;
						valueDate?: string;
					}>;
					const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, false) as boolean;

					const data = await buildDataFromEntries(this, upd);

					const gqlPayload = {
						operationName: 'UpdateDeal',
						query: `mutation UpdateDeal($dealId: String!, $data: JSONObject, $filterUnknownFields: Boolean) {
							updateDeal(input: { id: $dealId, data: $data }, filterUnknownFields: $filterUnknownFields) {
								id name contactId pipelineId stageId data
							}
						}`,
						variables: { dealId, data, filterUnknownFields },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.updateDeal ?? {});
					continue;
				}

				// Get Deal by ID
				if (operation === 'getById') {
					const dealId = this.getNodeParameter('dealId', i) as string;

					const gqlPayload = {
						operationName: 'Deal',
						query: `query Deal($dealId: String!) {
							deal(dealId: $dealId) {
								id name contactId pipelineId stageId data createdAt updatedAt
							}
						}`,
						variables: { dealId },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.deal ?? {});
					continue;
				}

				// List Deals by Stage
				if (operation === 'listByStage') {
					const stageId = this.getNodeParameter('stageId', i) as string;
					const searchString = this.getNodeParameter('dealSearchString', i, '') as string;
					const page = this.getNodeParameter('dealPage', i) as number;
					const limit = this.getNodeParameter('dealLimit', i) as number;

					const variables: IDataObject = {
						stageId,
						pagination: { page, limit },
					};
					if (searchString) variables.searchString = searchString;

					const gqlPayload = {
						operationName: 'Deals',
						query: `query Deals($stageId: String!, $pagination: PaginationInput!, $searchString: String) {
							deals(stageId: $stageId, pagination: $pagination, searchString: $searchString) {
								data { id name contactId pipelineId stageId data }
								pagination { page limit total }
							}
						}`,
						variables,
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push({
						stageId,
						pagination: result?.deals?.pagination,
						deals: result?.deals?.data ?? [],
					});
					continue;
				}

				// Get Pipeline (with Stages)
				if (operation === 'getPipeline') {
					const pipelineId = this.getNodeParameter('pipelineId', i) as string;

					const gqlPayload = {
						operationName: 'Pipeline',
						query: `query Pipeline($pipelineId: String!) {
							pipeline(pipelineId: $pipelineId) {
								id name dealsTotal stages { id name color }
							}
						}`,
						variables: { pipelineId },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.pipeline ?? {});
					continue;
				}

				// Create Note (for Deal)
				if (operation === 'createNote') {
					const dealId = this.getNodeParameter('dealId', i) as string; // <- statt parentId
					const description = this.getNodeParameter('description', i) as string;

					const gqlPayload = {
						operationName: 'CreateNote',
						query: `mutation CreateNote($parentId: String!, $description: String!) {
      createNote(input: { parentId: $parentId, description: $description }) { id }
    }`,
						variables: { parentId: dealId, description }, // <- parentId aus dealId
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.createNote ?? {});
					continue;
				}

				// Get Notes (for Deal)
				if (operation === 'getNotes') {
					const dealId = this.getNodeParameter('dealId', i) as string;

					const gqlPayload = {
						operationName: 'DealNotes',
						query: `query DealNotes($dealId: ID!) {
							dealNotes(dealId: $dealId, pagination: { page: 0, limit: 50 }) {
								notes { data { id description createdAt updatedAt } }
								count
							}
						}`,
						variables: { dealId },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push({ dealId, notes: result?.dealNotes ?? null });
					continue;
				}

				// Change Deal Pipeline/Stage
				if (operation === 'changeDealPipelineStage') {
					const dealId = this.getNodeParameter('dealId', i) as string;
					const pipelineId = this.getNodeParameter('pipelineId', i) as string;
					const stageId = this.getNodeParameter('stageId', i) as string;

					const gqlPayload = {
						operationName: 'ChangeDealPipeline',
						// Falls eure API einen anderen Namen nutzt, einfach hier anpassen
						query: `mutation ChangeDealPipeline($dealId: String!, $pipelineId: String!, $stageId: String!) {
      changeDealPipeline(input: { id: $dealId, pipelineId: $pipelineId, stageId: $stageId }) {
        id pipelineId stageId
      }
    }`,
						variables: { dealId, pipelineId, stageId },
					};

					const result = await gqlCall(this, gqlPayload);
					returnData.push(result?.changeDealPipeline ?? {});
					continue;
				}

				throw new ApplicationError(`Unsupported Deal operation: ${operation}`);
			}

			// --------------- RAW GRAPHQL ---------------
			if (resource === 'graphql') {
				const operationName = this.getNodeParameter('operationName', i, '') as string;
				const query = this.getNodeParameter('query', i) as string;
				const variables = this.getNodeParameter('variables', i, {}) as IDataObject;

				const payload: IDataObject = { query };
				if (operationName) (payload as any).operationName = operationName;
				if (variables && Object.keys(variables).length) (payload as any).variables = variables;

				const data = await gqlCall(this, payload as any);
				returnData.push(data as IDataObject);
				continue;
			}

			// Fallback Resource
			throw new ApplicationError(`Unsupported resource: ${resource}`);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
