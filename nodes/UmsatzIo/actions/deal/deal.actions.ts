import { IExecuteFunctions, ApplicationError, IDataObject } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';
import { createNoteWithOptionalPin } from '../../helpers/notes';
import { withLoadedFilterGroup } from '../../helpers/filters';

// ===== Helpers: Field kinds & sanitizer (Deals) =====
type RawKind = 'dropdown' | 'select' | 'booleandropdown' | 'multiselect' | 'switch' | 'daytime' | 'numeric' | 'other';

const DEAL_FIELD_TYPES_TTL_MS = 5 * 60 * 1000;
let _dealKindsCache: Record<string, { ts: number; map: Record<string, RawKind> }> = {};

const _ft = (s?: string | null) => (s || '').toLowerCase();
const _isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export const umsatzioDealReadOnlyFields = [
	'global_deal_createdAt',
	'global_deal_createdBy',
	'global_deal_last_contact_attempt',
	'global_deal_last_activity',
	'global_deal_phone_call_count',
];

async function getDealFieldKindsMap(this: IExecuteFunctions): Promise<Record<string, RawKind>> {
	let cacheKey = 'deal:default';
	try {
		const creds = (await this.getCredentials('umsatzIoApi')) as unknown as IDataObject;
		const url =
			(creds?.url as string) ?? (creds?.baseUrl as string) ?? (creds?.endpoint as string) ?? (creds?.host as string);
		if (url) cacheKey = `deal:${url}`;
	} catch {
		/* ignore */
	}

	const hit = _dealKindsCache[cacheKey];
	if (hit && Date.now() - hit.ts < DEAL_FIELD_TYPES_TTL_MS) return hit.map;

	const query = `
    query DealCards {
      cards(serviceType: deal) { fields { id name fieldType } }
    }`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const cards: any[] = Array.isArray(res?.cards) ? res.cards : [];

	const map: Record<string, RawKind> = {};
	for (const c of cards) {
		for (const f of (c?.fields ?? []) as Array<{ id: string; name?: string; fieldType?: string }>) {
			const key = (f.name || f.id)?.toString?.();
			if (!key || key in map) continue;
			const t = _ft(f.fieldType);
			map[key] =
				t === 'dropdown'
					? 'dropdown'
					: t === 'select'
						? 'select'
						: t === 'booleandropdown'
							? 'booleandropdown'
							: t === 'multiselect'
								? 'multiselect'
								: t === 'switch'
									? 'switch'
									: t === 'day' || t === 'time' || t === 'daytime'
										? 'daytime'
										: t === 'numeric' || t === 'currency'
											? 'numeric'
											: 'other';
		}
	}

	_dealKindsCache[cacheKey] = { ts: Date.now(), map };
	return map;
}

async function sanitizeDealResourceMapperValue(
	this: IExecuteFunctions,
	raw: unknown,
	mode: 'add' | 'update',
): Promise<IDataObject> {
	const maybe = (raw ?? {}) as IDataObject;
	const val = (maybe.value ?? maybe) as IDataObject;

	for (const k of Object.keys(val || {})) {
		if (umsatzioDealReadOnlyFields.includes(k)) delete (val as any)[k];
	}

	const kinds = await getDealFieldKindsMap.call(this);
	const out: IDataObject = {};

	for (const [key, v] of Object.entries(val || {})) {
		const kind = kinds[key] ?? 'other';

		if (kind === 'booleandropdown' || kind === 'switch') {
			if (_isEmpty(v)) continue;
			out[key] = typeof v === 'boolean' ? v : String(v).toLowerCase() === 'true';
			continue;
		}

		if (kind === 'numeric') {
			if (_isEmpty(v)) continue;
			const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
			if (!Number.isFinite(n)) continue;
			if (n === 0) continue;
			out[key] = n;
			continue;
		}

		if (kind === 'multiselect') {
			if (!Array.isArray(v) || v.length === 0) continue;
			out[key] = v;
			continue;
		}

		if (kind === 'daytime') {
			if (_isEmpty(v)) continue;
			out[key] = v;
			continue;
		}

		if (_isEmpty(v)) continue;
		out[key] = v;
	}

	return out;
}

export async function handleDeal(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	switch (operation) {
		// === CREATE DEAL ===
		case 'createDeal': {
			const name = this.getNodeParameter('name', i) as string;
			const contactId = this.getNodeParameter('contactId', i) as string;
			const pipelineId = this.getNodeParameter('pipelineId', i) as string;
			const stageId = this.getNodeParameter('stageId', i) as string;

			const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
			const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, true) as boolean;

			const dataObj = await sanitizeDealResourceMapperValue.call(this, fieldsParam, 'add');

			const result = await gqlCall(this, {
				operationName: 'CreateDeal',
				query: `mutation CreateDeal($name: String!, $contactId: String!, $pipelineId: String!, $stageId: String!, $data: JSONObject, $f: Boolean) {
      createDeal(input: { name: $name, contactId: $contactId, pipelineId: $pipelineId, stageId: $stageId, data: $data }, filterUnknownFields: $f) {
        id name contactId pipelineId stageId data createdAt updatedAt
      }
    }`,
				variables: { name, contactId, pipelineId, stageId, data: dataObj, f: filterUnknownFields },
			});

			// Optional initial note
			const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
			const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
			let initialNoteId: string | undefined;
			if (createInitialNote && result?.createDeal?.id) {
				const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
				const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
				if (initialNoteText && initialNoteText.trim()) {
					initialNoteId = await createNoteWithOptionalPin(
						this,
						result.createDeal.id as string,
						initialNoteText,
						pinInitialNote,
						makeBold,
					);
				}
			}

			return {
				...(result?.createDeal ?? {}),
				inputData: { name, contactId, pipelineId, stageId, ...dataObj },
				initialNoteId,
			};
		}

		// === UPDATE DEAL ===
		case 'updateDeal': {
			const dealId = this.getNodeParameter('dealId', i) as string;

			const rawName = (this.getNodeParameter('name', i, '') as string) ?? '';
			const name = rawName.trim() || undefined;

			const updatePipelineStage = this.getNodeParameter('updatePipelineStage', i, false) as boolean;
			const pipelineIdParam = (this.getNodeParameter('pipelineId', i, '') as string).trim();
			const stageIdParam = (this.getNodeParameter('stageId', i, '') as string).trim();

			const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
			const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, true) as boolean;
			const dataObj = await sanitizeDealResourceMapperValue.call(this, fieldsParam, 'update');

			// Nichts zu updaten?
			if (!updatePipelineStage && Object.keys(dataObj).length === 0 && name === undefined) {
				throw new ApplicationError('No fields provided to update.');
			}

			// Input für ein einziges, atomisches updateDeal bauen
			const input: Record<string, any> = { id: dealId };
			if (name !== undefined) input.name = name;
			if (Object.keys(dataObj).length) input.data = dataObj;

			if (updatePipelineStage) {
				if (!pipelineIdParam || !stageIdParam) {
					throw new ApplicationError('To update pipeline/stage, both pipelineId and stageId are required.');
				}
				input.pipelineId = pipelineIdParam;
				input.stageId = stageIdParam;
			}

			// Ein einziger Call – Stage-Wechsel + andere Felder zugleich
			const { updateDeal: updated } = await gqlCall(this, {
				operationName: 'UpdateDeal',
				query: `mutation UpdateDeal($input: CRMDealUpdateInput!, $filterUnknownFields: Boolean!) {
					updateDeal(input: $input, filterUnknownFields: $filterUnknownFields) {
						id
						name
						contactId
						pipelineId
						stageId
						data
						updatedAt
					}
					}`,
				variables: { input, filterUnknownFields },
			});

			// Optional: Note
			const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
			const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
			let initialNoteId: string | undefined;
			if (createInitialNote) {
				const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
				const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
				if (initialNoteText && initialNoteText.trim()) {
					initialNoteId = await createNoteWithOptionalPin(this, dealId, initialNoteText, pinInitialNote, makeBold);
				}
			}

			return {
				...(updated ?? {}),
				inputData: input,
				initialNoteId,
			};
		}

		/**
		 * ===================
		 * GET BY ID
		 * ===================
		 */
		case 'getById': {
			const dealId = this.getNodeParameter('dealId', i) as string;
			const data = await gqlCall(this, {
				operationName: 'Deal',
				query: `query Deal($dealId: String!) {
					deal(dealId: $dealId) {
						id
						data
						name
						pipelineId
						pipeline { id name }
						isArchived
						createdAt
						updatedAt
						stage { id name color }
						contact { id data }
					}
				}`,
				variables: { dealId },
			});
			return data?.deal ?? {};
		}

		/**
		 * ===================
		 * FIND DEALS BY EMAIL
		 * ===================
		 */
		case 'findDealsByEmail': {
			const email = this.getNodeParameter('email', i) as string;

			// 1) Look up contact by email
			const lookup = await gqlCall(this, {
				operationName: 'ContactByEmail',
				query: `query ContactByEmail($email: String!) {
					contactByEmail(email: $email) { id }
				}`,
				variables: { email },
			});
			const contactId = (lookup?.contactByEmail?.id || '').toString().trim();

			if (!contactId) {
				return { email, deals: [], foundContact: false };
			}

			// 2) Deals for contact
			const resp = await gqlCall(this, {
				operationName: 'ContactDeals',
				query: `query ContactDeals($contactId: ID!) {
					contact(contactId: $contactId) {
						id
						deals {
							id
							name
							contactId
							pipelineId
							stageId
							data
							isArchived
							createdAt
							updatedAt
						}
					}
				}`,
				variables: { contactId },
			});

			const deals = resp?.contact?.deals ?? [];
			return { email, contactId, foundContact: true, deals };
		}

		/**
		 * ===================
		 * LIST BY STAGE
		 * ===================
		 */
		case 'listByStage': {
			const stageId = this.getNodeParameter('stageId', i) as string;
			const searchString = this.getNodeParameter('dealSearchString', i, '') as string;
			const rawLimit = this.getNodeParameter('dealLimit', i, 50) as number;
			const limit = Math.max(1, Math.min(Math.floor(Number(rawLimit) || 50), 100));

			const page = this.getNodeParameter('dealPage', i, 0) as number;
			const variables = { stageId, pagination: { page, limit }, ...(searchString ? { searchString } : {}) };

			const data = await gqlCall(this, {
				operationName: 'Deals',
				query: `query Deals($searchString: String, $stageId: String!, $isFilterActive: Boolean, $pagination: PaginationInput!, $sort: CRMFilterSortInput, $timezone: String) {
				deals(
					stageId: $stageId
					searchString: $searchString
					pagination: $pagination
					isFilterActive: $isFilterActive
					sort: $sort
					timezone: $timezone
				) {
					data {
					id
					data
					name
					isArchived
					createdAt
					updatedAt
					lastContactAttempt
					stage {
						id
						name
						color
						__typename
					}
					contact {
						id
						data
						lastContactAttempt
						__typename
					}
					}
					pagination {
					limit
					page
					total
					}
				}
				}`,
				/*query: `query Deals($stageId: String!, $pagination: PaginationInput!, $searchString: String) {
				deals(stageId: $stageId, pagination: $pagination, searchString: $searchString) {
				data { id name contactId pipelineId stageId data createdAt updatedAt }
				pagination { page limit total }
				}
			}`,*/
				variables,
			});
			return {
				stageId,
				pagination: data?.deals?.pagination,
				deals: data?.deals?.data ?? [],
			};
		}

		/**
		 * ===================
		 * LIST BY FILTER GROUP
		 * ===================
		 */

		case 'listByFilterGroup': {
			const filterGroupId = this.getNodeParameter('filterGroupId', i) as string;
			const pipelineId = this.getNodeParameter('pipelineId', i) as string;
			const stageId = this.getNodeParameter('stageId', i) as string; // Pflicht
			const searchString = this.getNodeParameter('dealSearchString', i, '') as string;
			const page = this.getNodeParameter('dealPage', i, 0) as number;
			const rawLimit = this.getNodeParameter('dealLimit', i, 50) as number;
			const limit = Math.max(1, Math.min(Math.floor(Number(rawLimit) || 50), 100));
			const timezone = (this.getNodeParameter('timezone', i, 'Europe/Berlin') as string) || 'Europe/Berlin';

			const payload = await withLoadedFilterGroup(
				this,
				'deal',
				filterGroupId,
				async () => {
					const variables: IDataObject = {
						stageId,
						pagination: { page, limit },
						isFilterActive: true,
						timezone,
					};
					if (searchString && searchString.trim()) variables.searchString = searchString.trim();

					const data = await gqlCall(this, {
						operationName: 'Deals',
						query: `query Deals(
				$stageId: String!,
				$pagination: PaginationInput!,
				$searchString: String,
				$isFilterActive: Boolean,
				$sort: CRMFilterSortInput,
				$timezone: String
				) {
				deals(
					stageId: $stageId,
					pagination: $pagination,
					searchString: $searchString,
					isFilterActive: $isFilterActive,
					sort: $sort,
					timezone: $timezone
				) {
					data { id name contactId pipelineId stageId data createdAt updatedAt }
					pagination { page limit total }
				}
				}`,
						variables,
					});

					const list: any[] = data?.deals?.data ?? [];
					const deals = list.filter((d) => String(d?.pipelineId) === String(pipelineId));

					return {
						constraints: { filterGroupId, pipelineId, stageId, searchString: searchString || null, timezone },
						pagination: data?.deals?.pagination,
						deals,
					};
				},
				{ requireEmailPassword: true, deleteFilters: true },
			);

			return payload;
		}

		/**
		 * ===================
		 * GET PIPELINE (Details)
		 * ===================
		 */
		case 'getPipeline': {
			const pipelineId = this.getNodeParameter('pipelineId', i) as string;

			const data = await gqlCall(this, {
				operationName: 'Pipeline',
				query: `query Pipeline($pipelineId: String!) {
			pipeline(pipelineId: $pipelineId) {
				id
				name
				dealsTotal
				stages {
				id
				name
				color
				deals { id __typename }
				__typename
				}
				__typename
			}
			}`,
				variables: { pipelineId },
			});

			return data?.pipeline ?? {};
		}
		/**
		 * ===================
		 * GET ALL PIPELINES
		 * ===================
		 */

		case 'getPipelines': {
			const data = await gqlCall(this, {
				operationName: 'Pipelines',
				query: `query Pipelines {
			pipelines {
				id
				name
				dealsTotal
				__typename
			}
			}`,
				variables: {},
			});
			return data?.pipelines ?? [];
		}

		/**
		 * ===================
		 * CHANGE PIPELINE/STAGE
		 * ===================
		 */
		case 'changeDealPipelineStage': {
			const dealIdRaw = this.getNodeParameter('dealId', i) as string;
			const pipelineIdRaw = this.getNodeParameter('pipelineId', i) as string;
			const stageIdRaw = this.getNodeParameter('stageId', i) as string;

			const dealId = String(dealIdRaw ?? '').trim();
			const pipelineId = String(pipelineIdRaw ?? '').trim();
			const stageId = String(stageIdRaw ?? '').trim();

			if (!dealId) throw new ApplicationError('dealId is required.');
			if (!pipelineId || !stageId) {
				throw new ApplicationError('To change the stage, both pipelineId and stageId are required.');
			}

			const filterUnknownFields = true; // bewusst strict und non-null

			const variables = {
				input: { id: dealId, pipelineId, stageId }, // CRMDealUpdateInput!
				filterUnknownFields, // Boolean!
			};

			const { updateDeal: updated } = await gqlCall(this, {
				operationName: 'UpdateDealStageOnly',
				query: `mutation UpdateDealStageOnly($input: CRMDealUpdateInput!, $filterUnknownFields: Boolean!) {
				updateDeal(input: $input, filterUnknownFields: $filterUnknownFields) {
					id
					pipelineId
					stageId
					name
					contactId
					data
					updatedAt
				}
				}`,
				variables,
			});

			return {
				...(updated ?? {}),
				inputData: variables.input,
				changed: !!updated && updated.pipelineId === pipelineId && updated.stageId === stageId,
			};
		}

		default:
			throw new ApplicationError(`Unsupported deal operation: ${operation}`);
	}
}
