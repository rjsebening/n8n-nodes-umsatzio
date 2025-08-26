import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	IExecuteFunctions,
	IDataObject,
	NodeConnectionType,
	ApplicationError,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** ---------- Header-Mapping ---------- */
function buildHeadersFromCredentials(credentials: IDataObject): { authHeader: string; tenantKey: string } {
	let token = (credentials as any).token as string | undefined;
	if (!token || !token.trim()) throw new ApplicationError('Missing credential "token" for Umsatz.io');
	token = token.trim();

	// Authorization wie in deinen Credentials
	const authHeader = token.toLowerCase().startsWith('basic ') ? token : `Basic ${token}`;

	// Tenant-Key = exakt der gleiche Token (kein Decoding)
	const tenantKey = token;

	return { authHeader, tenantKey };
}

/** ---------- HTTP/GQL helper ---------- */
async function gqlCall(
	ctx: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	body: { operationName?: string; query: string; variables?: IDataObject },
) {
	const credentials = await ctx.getCredentials('umsatzIoApi');
	const endpoint = ((credentials.endpoint as string) || 'https://app.umsatz.io/api/graphql').trim();

	const { authHeader, tenantKey } = buildHeadersFromCredentials(credentials);

	const headers: Record<string, string> = {
		Authorization: authHeader,
		'Content-Type': 'application/json',
		Accept: 'application/json',
		'x-tenant-api-key': tenantKey,
	};

	const opts: any = {
		method: 'POST',
		uri: endpoint,
		headers,
		body,
		json: true,
		timeout: 20000,
		simple: false, // 4xx/5xx nicht automatisch werfen
		resolveWithFullResponse: true, // vollen Body behalten
		jar: true,
	};

	const resp: any = await (ctx as any).helpers.request(opts);
	const statusCode = resp?.statusCode ?? resp?.status ?? 0;
	const rawBody = resp?.body ?? resp;
	const bodyObj = typeof rawBody === 'string' ? safeJson(rawBody) : rawBody;

	if (statusCode >= 400) {
		const msg = bodyObj?.errors?.[0]?.message || (typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
		throw new ApplicationError(`HTTP ${statusCode}: ${msg}`);
	}
	if (bodyObj?.errors?.length) {
		throw new ApplicationError(
			(bodyObj.errors[0]?.message ?? 'GraphQL error') + ' :: ' + JSON.stringify(bodyObj.errors),
		);
	}
	return bodyObj?.data !== undefined ? bodyObj.data : bodyObj;
}

function safeJson(s: string) {
	try {
		return JSON.parse(s);
	} catch {
		return undefined;
	}
}

/** ---------- loadOptions helpers ---------- */
async function loadContactProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
		query ContactsTable {
			table(serviceType: "contact") {
				id
				data { label name columnLabel visible }
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const rows: any[] = res?.table?.data ?? [];
	return rows
		.filter((r) => r?.name)
		.map((r) => ({
			name: r.columnLabel || r.label || r.name,
			value: r.name,
			description: r.visible === false ? 'hidden' : undefined,
		}));
}

async function loadDealProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
		query DealsTable {
			table(serviceType: "deal") {
				id
				data { label name columnLabel visible }
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const rows: any[] = res?.table?.data ?? [];
	return rows
		.filter((r) => r?.name)
		.map((r) => ({
			name: r.columnLabel || r.label || r.name,
			value: r.name,
			description: r.visible === false ? 'hidden' : undefined,
		}));
}

async function loadPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `query Pipelines { pipelines { id name dealsTotal } }`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const list: any[] = res?.pipelines ?? [];
	return list.map((p) => ({ name: p.name, value: p.id, description: `Deals: ${p.dealsTotal}` }));
}

async function loadStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getNodeParameter('pipelineId', 0) as string;
	if (!pipelineId) return [];
	const query = `
		query Pipeline($pipelineId: String!) {
			pipeline(pipelineId: $pipelineId) {
				id name
				stages { id name color }
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: { pipelineId } });
	const stages: any[] = res?.pipeline?.stages ?? [];
	return stages.map((s) => ({ name: s.name, value: s.id, description: s.color ? `#${s.color}` : undefined }));
}

/** ---------- Remote-Check helpers ---------- */
async function tryFetchWebhookById(ctx: IHookFunctions, id: string) {
	const attempts = [
		{ q: `query($id:ID!){ webhook(id:$id){ id url triggers properties } }`, pluck: (r: any) => r?.webhook },
		{ q: `query($id:ID!){ getWebhook(id:$id){ id url triggers properties } }`, pluck: (r: any) => r?.getWebhook },
	];
	for (const a of attempts) {
		try {
			const r = await gqlCall(ctx, { query: a.q, variables: { id } });
			const w = a.pluck(r);
			if (w?.id) return w;
		} catch {}
	}
	return undefined;
}

async function tryFindWebhookByUrl(ctx: IHookFunctions, url: string) {
	const attempts = [
		{ q: `query{ webhooks{ id url triggers properties } }`, pluck: (r: any) => r?.webhooks },
		{ q: `query{ allWebhooks{ id url triggers properties } }`, pluck: (r: any) => r?.allWebhooks },
		{ q: `query{ tenantWebhooks{ id url triggers properties } }`, pluck: (r: any) => r?.tenantWebhooks },
	];
	for (const a of attempts) {
		try {
			const r = await gqlCall(ctx, { query: a.q, variables: {} });
			const list = a.pluck(r);
			if (Array.isArray(list)) {
				const hit = list.find((w: any) => w?.url === url);
				if (hit) return hit;
			}
		} catch {}
	}
	return undefined;
}

/** ---------- Node ---------- */
export class UmsatzIoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'umsatz.io Trigger',
		name: 'umsatzIoTrigger',
		icon: 'fa:table',
		group: ['trigger'],
		version: 1,
		description: 'Empfängt umsatz.io Events (GraphQL-registrierter Webhook)',
		subtitle: '={{$parameter["events"]}}',
		defaults: {
			name: 'umsatz.io Trigger',
			// @ts-expect-error required by n8n linter (freie Beschreibung)
			description: 'umsatz.io Trigger node',
		},
		credentials: [{ name: 'umsatzIoApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				isFullPath: true, // nackte URL, kein Pfad
				path: '',
			},
		],
		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: [
			/** Trigger-Auswahl (finale Liste) */
			{
				displayName: 'Triggers',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{ name: 'changeContactProperty – Kontakt-Eigenschaft Geändert', value: 'changeContactProperty' },
					{ name: 'changeDealProperty – Deal-Eigenschaft Geändert', value: 'changeDealProperty' },
					{ name: 'newActivity – Neue Aktivität Erstellt', value: 'newActivity' },
					{ name: 'newContact – Neuer Kontakt Erstellt', value: 'newContact' },
					{ name: 'newDeal – Neuer Deal Erstellt', value: 'newDeal' },
					{ name: 'submitForm – Formular Abgesendet', value: 'submitForm' },
					{ name: 'updateDealStage – Deal-Phase Geändert', value: 'updateDealStage' },
				],
				description: 'Welche Ereignisse sollen den Webhook auslösen?',
			},

			/** Dynamische Properties je Trigger */
			{
				displayName: 'Kontakt-Felder Names or IDs',
				name: 'contactProperties',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getContactProperties' },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { events: ['changeContactProperty'] } },
				required: true,
			},
			{
				displayName: 'Deal-Felder Names or IDs',
				name: 'dealProperties',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getDealProperties' },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { events: ['changeDealProperty'] } },
				required: true,
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { events: ['updateDealStage'] } },
				required: true,
			},
			{
				displayName: 'Stage(s) Names or IDs',
				name: 'stageIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getStages' },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { events: ['updateDealStage'] } },
				required: true,
			},
			{
				displayName: 'Form ID(s)',
				name: 'formIds',
				type: 'string',
				typeOptions: { multipleValues: true },
				default: [],
				placeholder: 'z. B. a3b2c1-…',
				description: 'Mindestens eine Formular-ID, wenn „submitForm“ aktiviert ist',
				displayOptions: { show: { events: ['submitForm'] } },
				required: true,
			},
			{
				displayName: 'Aktivitäts-Typen',
				name: 'activityTypes',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Call', value: 'call' },
					{ name: 'Email', value: 'email' },
					{ name: 'Meeting', value: 'meeting' },
					{ name: 'Note', value: 'note' },
					{ name: 'Task', value: 'task' },
				],
				description: 'Mindestens einen Typ wählen, wenn „newActivity“ aktiviert ist',
				displayOptions: { show: { events: ['newActivity'] } },
				required: true,
			},
			{
				displayName: 'Zusätzliche Properties (Optional)',
				name: 'propertiesExtra',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							{ displayName: 'Value', name: 'value', type: 'string', default: '', placeholder: 'z.B. source=n8n' },
						],
					},
				],
				description: 'Freie Strings; werden zusätzlich gesendet',
			},
			{
				displayName: 'Send Test Ping on Activate',
				name: 'sendTestPing',
				type: 'boolean',
				default: false,
				description: 'Whether Nach Registrierung Ping versuchen (nur falls API das unterstützt)',
			},
		],
	};

	/** methods MUSS außerhalb von description stehen */
	methods = {
		loadOptions: {
			getContactProperties: loadContactProperties,
			getDealProperties: loadDealProperties,
			getPipelines: loadPipelines,
			getStages: loadStages,
		},
	};

	webhookMethods = {
		default: {
			/** Remote check: existiert der Webhook wirklich? */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				const id = data.subscriptionId as string | undefined;
				const url = this.getNodeWebhookUrl('default');

				// Per ID prüfen
				if (id) {
					try {
						const w = await tryFetchWebhookById(this, id);
						if (w?.id) return true;
					} catch {}
				}

				// Nur wenn URL vorhanden ist: per URL prüfen
				if (!url) return false;
				try {
					const w2 = await tryFindWebhookByUrl(this, url);
					if (w2?.id) {
						data.subscriptionId = w2.id;
						return true;
					}
				} catch {}

				return false;
			},

			/** Create mit properties = reine Strings */
			async create(this: IHookFunctions): Promise<boolean> {
				const events = this.getNodeParameter('events', 0) as string[];
				if (!events?.length) {
					throw new NodeOperationError(this.getNode(), 'Bitte mindestens einen Trigger wählen.');
				}

				const sendTestPing = this.getNodeParameter('sendTestPing', 0) as boolean;
				const targetUrl = this.getNodeWebhookUrl('default');

				/** Build properties as PLAIN strings (no key= prefix!) */
				const properties: string[] = [];
				const missing: string[] = [];

				if (events.includes('changeContactProperty')) {
					const props = (this.getNodeParameter('contactProperties', 0) as string[]) ?? [];
					if (!props.length) missing.push('changeContactProperty → mindestens 1 Kontakt-Feld');
					properties.push(...props);
				}
				if (events.includes('changeDealProperty')) {
					const props = (this.getNodeParameter('dealProperties', 0) as string[]) ?? [];
					if (!props.length) missing.push('changeDealProperty → mindestens 1 Deal-Feld');
					properties.push(...props);
				}
				if (events.includes('updateDealStage')) {
					const pipelineId = this.getNodeParameter('pipelineId', 0) as string;
					const stageIds = (this.getNodeParameter('stageIds', 0) as string[]) ?? [];
					if (!pipelineId) missing.push('updateDealStage → Pipeline wählen');
					if (!stageIds.length) missing.push('updateDealStage → mindestens 1 Stage');
					properties.push(...stageIds);
				}
				if (events.includes('submitForm')) {
					const formIds = (this.getNodeParameter('formIds', 0) as string[]) ?? [];
					if (!formIds.length) missing.push('submitForm → mindestens 1 Form-ID');
					properties.push(...formIds);
				}
				if (events.includes('newActivity')) {
					const types = (this.getNodeParameter('activityTypes', 0) as string[]) ?? [];
					if (!types.length) missing.push('newActivity → mindestens 1 Aktivitäts-Typ');
					properties.push(...types);
				}

				// extra props
				const extra = (this.getNodeParameter('propertiesExtra', 0, {}) as IDataObject) || {};
				const extraItems = (extra.property as IDataObject[]) || [];
				for (const i of extraItems) {
					const v = String(i?.value ?? '').trim();
					if (v) properties.push(v);
				}

				if (missing.length) {
					throw new NodeOperationError(
						this.getNode(),
						'Es fehlen verpflichtende Properties für die gewählten Trigger.',
						{
							description: missing.join('\n'),
						},
					);
				}

				const mutation = `
  mutation CreateWebhook($input: CreateWebhookInput!) {
    createWebhook(input: $input) {
      id
    }
  }
`;
				const variables: any = { input: { url: targetUrl, triggers: events } };
				if (properties.length) variables.input.properties = properties;

				const res = await gqlCall(this, { operationName: 'CreateWebhook', query: mutation, variables });

				// Response sicher auslesen
				const created = res?.createWebhook ?? res?.data?.createWebhook ?? res;
				const subscriptionId = created?.id;
				if (!subscriptionId) {
					throw new NodeOperationError(
						this.getNode(),
						'umsatz.io: Konnte subscriptionId aus CreateWebhook nicht lesen.',
						{
							description: JSON.stringify(res || {}),
						},
					);
				}

				this.logger?.debug?.('umsatz.io created webhook', created);

				const data = this.getWorkflowStaticData('node');
				data.subscriptionId = subscriptionId;
				data.targetUrl = targetUrl;
				data.events = events;

				// optional ping (best effort)
				if (sendTestPing) {
					const candidates = [
						{ name: 'pingWebhook', q: `mutation($id:ID!){ pingWebhook(id:$id){ id status } }` },
						{ name: 'webhookPing', q: `mutation($id:ID!){ webhookPing(id:$id){ id status } }` },
					];
					for (const c of candidates) {
						try {
							await gqlCall(this, { operationName: c.name, query: c.q, variables: { id: subscriptionId } });
							break;
						} catch (e: any) {
							this.logger?.warn?.(`umsatz.io ${c.name} failed`, { error: e?.message });
						}
					}
				}

				return true;
			},

			/** Delete */
			// --- DELETE: erst skalare Variante, dann Fallback-Objekt ---
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				const subscriptionId = data.subscriptionId as string | undefined;
				if (!subscriptionId) return true;

				// 1) Skalar (Boolean) versuchen
				try {
					const q1 = `mutation($id:ID!){ deleteWebhook(id:$id) }`;
					await gqlCall(this, { operationName: 'DeleteWebhookScalar', query: q1, variables: { id: subscriptionId } });
				} catch {
					// 2) Fallback: Objekt mit { success }
					try {
						const q2 = `mutation($id:ID!){ deleteWebhook(id:$id){ success } }`;
						await gqlCall(this, { operationName: 'DeleteWebhookObject', query: q2, variables: { id: subscriptionId } });
					} catch (e: any) {
						this.logger?.warn?.('umsatz.io deleteWebhook fehlgeschlagen (ignoriere).', {
							error: e?.message,
							id: subscriptionId,
						});
					}
				}

				delete data.subscriptionId;
				delete data.targetUrl;
				delete data.events;

				return true;
			},
		},
	};

	/** Eingehender HTTP-Request */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = (req.body ?? {}) as IDataObject;

		const eventName = (body.event as string) ?? (body.type as string) ?? 'unknown';
		const eventId = (body.id as string) ?? (body.eventId as string);

		// NICHT res.status/json benutzen – n8n sendet die Antwort
		return {
			webhookResponse: {
				body: { ok: true },
				responseCode: 200,
			},
			workflowData: [
				[
					{
						json: {
							event: eventName,
							eventId,
							headers: req.headers,
							query: req.query,
							rawBody: body,
							...(typeof body.data === 'object' ? { data: body.data as IDataObject } : {}),
						},
					},
				],
			],
		};
	}
}
