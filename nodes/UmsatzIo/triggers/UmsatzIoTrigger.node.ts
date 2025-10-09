import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

// properties
import { instantProperties } from './trigger.instant.properties';
// helpers
import { gqlCall } from '../helpers/gql';
import { listWebhooks, findWebhookByExactUrl, deleteWebhookByIdWithRetry } from '../helpers/triggerHelper';
// methods - loadOptions
import { loadPhoneCallActivityTypes, loadCallResultTypes } from '../methods/loadOptions/callactivity.loadOptions';
import {
	loadContactProperties,
	loadDealProperties,
	loadPipelines,
	loadStages,
	loadForms,
} from '../methods/loadOptions/trigger.loadOptions';

/** ---------- Node ---------- */
export class UmsatzIoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'umsatz.io Trigger',
		name: 'umsatzIoTrigger',
		icon: {
			light: 'file:../light-icon.svg',
			dark: 'file:../dark-icon.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Interact with Umsatz.io API (powered by agentur-systeme.de)',
		subtitle: '={{$parameter["events"]}}',
		defaults: {
			name: 'Umsatz.io Trigger',
			// @ts-expect-error free-form description
			description: 'Interact with Umsatz.io API (powered by agentur-systeme.de)',
		},
		credentials: [{ name: 'umsatzIoApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				isFullPath: true,
				path: '',
			},
		],
		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: instantProperties,
	};

	methods = {
		loadOptions: {
			getContactProperties: loadContactProperties,
			getDealProperties: loadDealProperties,
			getPipelines: loadPipelines,
			getStages: loadStages,
			getForms: loadForms,
			getPhoneCallActivityTypes: loadPhoneCallActivityTypes,
			getCallResultTypes: loadCallResultTypes,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node') as any;
				const mode = this.getMode?.() as 'manual' | 'trigger' | string;
				if (mode === 'manual') {
					return false;
				}
				const currentUrlRaw = this.getNodeWebhookUrl('default');
				if (!currentUrlRaw) throw new NodeOperationError(this.getNode(), 'Webhook URL could not be determined.');
				const currentUrl = currentUrlRaw;

				const idKey = mode === 'manual' ? 'subscriptionIdTest' : 'subscriptionIdProd';
				const id = data[idKey] as string | undefined;
				if (id) {
					const list = await listWebhooks(this);
					const hit = list.find((w) => w?.id === id && w?.url === currentUrl);
					if (hit) return true;
				}

				const hit = await findWebhookByExactUrl(this, currentUrl);
				if (hit?.id) {
					data[idKey] = hit.id;
					return true;
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node') as any;
				const mode = this.getMode?.() as 'manual' | 'trigger' | string;
				const isManual = mode === 'manual';

				const currentUrlRaw = this.getNodeWebhookUrl('default');
				if (!currentUrlRaw) {
					throw new NodeOperationError(this.getNode(), 'Webhook URL could not be determined');
				}
				const currentUrl = currentUrlRaw;

				if (isManual) {
					try {
						const list = await listWebhooks(this);
						const stale = list.filter((w) => w.url === currentUrl);
						for (const s of stale) {
							await deleteWebhookByIdWithRetry(this, s.id, { retries: 1, backoffMs: 200, failOnError: false });
						}
					} catch {}
				}

				const selectedEvent = this.getNodeParameter('events', 0) as string;
				const events: string[] = [selectedEvent];

				const strictSingleRegistration = true;

				const properties: string[] = [];
				const missing: string[] = [];

				// ---- Contact property mode ----
				if (selectedEvent === 'changeContactProperty') {
					const selected = (this.getNodeParameter('contactProperties', 0) as string[]) ?? [];
					if (!Array.isArray(selected) || selected.length === 0) {
						missing.push('Please select at least one Contact property.');
					} else {
						properties.push(...selected);
					}
				}

				// ---- Deal property mode ----
				if (selectedEvent === 'changeDealProperty') {
					const selected = (this.getNodeParameter('dealProperties', 0) as string[]) ?? [];
					if (!Array.isArray(selected) || selected.length === 0) {
						missing.push('Please select at least one Deal property.');
					} else {
						properties.push(...selected);
					}
				}

				// ---- Stage selection ----
				if (selectedEvent === 'updateDealStage') {
					const scope = (this.getNodeParameter('dealStageScope', 0) as 'all' | 'pipeline' | 'specific') ?? 'all';

					if (scope === 'all') {
					}

					if (scope === 'pipeline') {
						const pipelineId = this.getNodeParameter('pipelineId', 0) as string;
						if (!pipelineId) missing.push('updateDealStage → Please select a pipeline');
						else properties.push(pipelineId);
					}

					if (scope === 'specific') {
						const pipelineId = this.getNodeParameter('pipelineId', 0) as string;
						const stageId = this.getNodeParameter('stageId', 0) as string;
						if (!pipelineId) missing.push('updateDealStage → Please select a pipeline');
						if (!stageId) missing.push('updateDealStage → Please select a stage');
						if (pipelineId && stageId) {
							properties.push(pipelineId, stageId);
						}
					}
				}

				if (selectedEvent === 'submitForm') {
					const formId = (this.getNodeParameter('formId', 0) as string) || '';
					if (!formId) {
						missing.push('Please select a form.');
					} else {
						properties.push(formId);
					}
				}

				// ---- New Activity (Phone Call) ----
				if (selectedEvent === 'newActivity') {
					// 1) Call Type (ANY | SPECIFIC)
					const callTypeMode = (this.getNodeParameter('callTypeMode', 0) as 'any' | 'specific') ?? 'any';
					if (callTypeMode === 'specific') {
						const phoneCallActivityTypeId = (this.getNodeParameter('phoneCallActivityTypeId', 0) as string) || '';
						if (!phoneCallActivityTypeId) {
							missing.push('Please select a Call Type.');
						} else {
							properties.push(phoneCallActivityTypeId);
						}
					}
					// 2) Call Result (ANY | SPECIFIC)
					const callResultMode = (this.getNodeParameter('callResultMode', 0) as 'any' | 'specific') ?? 'any';
					if (callResultMode === 'specific') {
						const selectedResults = (this.getNodeParameter('callResultTypes', 0) as string[]) ?? [];
						if (!selectedResults.length) {
							missing.push('Please select at least one Call Result.');
						} else {
							properties.push(...selectedResults);
						}
					}
				}

				// ---- Additional free strings ----
				const extra = (this.getNodeParameter('propertiesExtra', 0, {}) as IDataObject) || {};
				const extraItems = (extra.property as IDataObject[]) || [];
				for (const i of extraItems) {
					const v = String(i?.value ?? '').trim();
					if (v) properties.push(v);
				}

				if (missing.length) {
					throw new NodeOperationError(this.getNode(), 'Missing required selections for the chosen event.', {
						description: missing.join('\n'),
					});
				}

				// Build the GraphQL input safely
				const input: any = {
					url: currentUrl,
					triggers: events,
				};

				// Only include `properties` if there are any
				if (properties.length > 0) {
					input.properties = properties;
				}

				const mutation = `
				mutation CreateWebhook($input: CreateWebhookInput!) {
					createWebhook(input: $input) { id url }	}`;

				const res: any = await gqlCall(this as any, {
					operationName: 'CreateWebhook',
					query: mutation,
					variables: { input },
				});

				const created = res?.createWebhook ?? res;
				const subscriptionId = created?.id as string | undefined;

				// Clean up old
				const oldId = isManual ? data.subscriptionIdTest : data.subscriptionIdProd;
				if (oldId && oldId !== subscriptionId) {
					await deleteWebhookByIdWithRetry(this, oldId, { retries: 2, backoffMs: 300, failOnError: false });
				}

				// Store
				data.idByUrl = data.idByUrl || {};
				if (subscriptionId) data.idByUrl[currentUrl] = { id: subscriptionId, ts: Date.now() };

				if (isManual) {
					data.subscriptionIdTest = subscriptionId;
					data.lastTestUrl = currentUrl;
				} else {
					if (!subscriptionId) {
						throw new NodeOperationError(
							this.getNode(),
							'umsatz.io: Could not read subscriptionId from CreateWebhook.',
							{
								description: JSON.stringify(res || {}),
							},
						);
					}
					data.subscriptionIdProd = subscriptionId;

					// optional single-registration cleanup
					if (strictSingleRegistration) {
						const list = await listWebhooks(this);
						const dups = list.filter((w) => w.url === currentUrl && w.id !== subscriptionId);
						for (const d of dups) {
							await deleteWebhookByIdWithRetry(this, d.id, { retries: 1, backoffMs: 300, failOnError: false });
						}
					}
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node') as any;
				const mode = this.getMode?.() as 'manual' | 'trigger' | string;
				const isManual = mode === 'manual';
				const currentUrlRaw = this.getNodeWebhookUrl('default');
				if (!currentUrlRaw) throw new NodeOperationError(this.getNode(), 'Webhook URL could not be determined.');
				const currentUrl = currentUrlRaw;

				const failOnProdDeleteError = (this.getNodeParameter('strictSingleRegistration', 0) as boolean) ?? true;

				const idKey = isManual ? 'subscriptionIdTest' : 'subscriptionIdProd';
				let id = data[idKey] as string | undefined;

				if (!id) {
					const cached = await findWebhookByExactUrl(this, currentUrl);
					id = cached?.id;
				}
				if (!id) return true;

				if (isManual) {
					await deleteWebhookByIdWithRetry(this, id, { retries: 0, backoffMs: 0, failOnError: false });
					if (data.idByUrl?.[currentUrl]) delete data.idByUrl[currentUrl];
					if (data.subscriptionIdTest === id) delete data.subscriptionIdTest;
					return true;
				}

				try {
					const ok = await deleteWebhookByIdWithRetry(this, id, {
						retries: 3,
						backoffMs: 500,
						failOnError: failOnProdDeleteError,
					});
					if (!ok) {
						data.staleProdIds = Array.isArray(data.staleProdIds) ? data.staleProdIds : [];
						if (!data.staleProdIds.includes(id)) data.staleProdIds.push(id);
					}
				} catch (e: any) {
					throw new NodeOperationError(this.getNode(), 'umsatz.io: Delete production webhook failed', {
						description: e?.message || 'unknown',
					});
				} finally {
					if (data.idByUrl?.[currentUrl]) delete data.idByUrl[currentUrl];
					if (data.subscriptionIdProd === id) delete data.subscriptionIdProd;
				}

				return true;
			},
		},
	};

	/** ---------- Webhook Handler ---------- */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = (req.body ?? {}) as IDataObject;

		// --- AUTO-DELETE TEST WEBHOOK ON HIT ---
		const mode = this.getMode?.() as 'manual' | 'trigger' | string;
		if (mode === 'manual') {
			try {
				const data = this.getWorkflowStaticData('node') as any;
				const currentUrlRaw = this.getNodeWebhookUrl('default');
				if (currentUrlRaw) {
					const id = data?.subscriptionIdTest as string | undefined;
					if (id) {
						await deleteWebhookByIdWithRetry(this, id, { retries: 0, backoffMs: 0, failOnError: false });
						if (data.idByUrl?.[currentUrlRaw]) delete data.idByUrl[currentUrlRaw];
						if (data.subscriptionIdTest === id) delete data.subscriptionIdTest;
					} else {
						const hit = await findWebhookByExactUrl(this, currentUrlRaw);
						if (hit?.id) {
							await deleteWebhookByIdWithRetry(this, hit.id, { retries: 0, backoffMs: 0, failOnError: false });
							const d = this.getWorkflowStaticData('node') as any;
							if (d.idByUrl?.[currentUrlRaw]) delete d.idByUrl[currentUrlRaw];
							if (d.subscriptionIdTest === hit.id) delete d.subscriptionIdTest;
						}
					}
				}
			} catch (e) {
				this.logger?.warn?.('umsatz.io Trigger: auto-delete test webhook failed (ignored).');
			}
		}

		return {
			webhookResponse: { body: { ok: true }, responseCode: 200 },
			workflowData: [
				[
					{
						json: {
							body,
							executionMode: mode,
						},
					},
				],
			],
		};
	}
}
