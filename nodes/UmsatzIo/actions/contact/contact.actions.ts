import { IExecuteFunctions, ApplicationError, IDataObject } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';
import { createNoteWithOptionalPin } from '../../helpers/notes';
import { withLoadedFilterGroup } from '../../helpers/filters';

type RawKind =
	| 'dropdown'
	| 'select'
	| 'booleandropdown'
	| 'multiselect'
	| 'switch'
	| 'day'
	| 'time'
	| 'daytime'
	| 'numeric'
	| 'currency'
	| 'other';

const ft = (s?: string | null) => (s || '').toLowerCase();

async function getContactFieldKindsMap(this: IExecuteFunctions): Promise<Record<string, RawKind>> {
	const query = `query ContactCards { cards(serviceType: contact) { fields { id name fieldType } } }`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const cards: any[] = Array.isArray(res?.cards) ? res.cards : [];
	const map: Record<string, RawKind> = {};
	for (const c of cards) {
		for (const f of (c?.fields ?? []) as Array<{ id: string; name?: string; fieldType?: string }>) {
			const key = (f.name || f.id)?.toString?.();
			if (!key || key in map) continue;
			const t = ft(f.fieldType);
			map[key] =
				t === 'dropdown' || t === 'select'
					? 'dropdown'
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
	return map;
}

const umsatzioReadOnlyFields = [
	'global_contact_last_reached',
	'global_contact_last_reached_decision_maker',
	'global_contact_phone_call_count',
	'global_contact_createdAt',
	'global_contact_createdBy',
];

function isEmpty(v: unknown) {
	return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

async function sanitizeResourceMapperValueWithTypes(
	this: IExecuteFunctions,
	raw: unknown,
	mode: 'add' | 'upsert' | 'update',
): Promise<IDataObject> {
	const maybe = (raw ?? {}) as IDataObject;
	const val = (maybe.value ?? maybe) as IDataObject;

	// ReadOnly raus
	for (const k of Object.keys(val || {})) {
		if (umsatzioReadOnlyFields.includes(k)) delete (val as any)[k];
	}

	const kinds = await getContactFieldKindsMap.call(this);
	const out: IDataObject = {};

	for (const [key, v] of Object.entries(val || {})) {
		const kind = kinds[key] ?? 'other';

		if (kind === 'booleandropdown' || kind === 'switch') {
			if (isEmpty(v)) {
				continue;
			}
			out[key] = typeof v === 'boolean' ? v : String(v).toLowerCase() === 'true';
			continue;
		}

		if (kind === 'numeric') {
			if (isEmpty(v)) continue;
			const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
			if (!Number.isFinite(n)) continue;
			if (n === 0) continue;
			out[key] = n;
			continue;
		}

		if (isEmpty(v)) continue;
		out[key] = v;
	}

	return out;
}

export async function handleContact(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	switch (operation) {
		/**
		 * ======================
		 * CREATE CONTACT (add)
		 * ======================
		 */
		case 'createContact': {
			const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
			const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, true) as boolean;
			const dataObj = await sanitizeResourceMapperValueWithTypes.call(this, fieldsParam, 'add');

			const create = await gqlCall(this, {
				operationName: 'CreateContact',
				query: `mutation CreateContact($data: JSONObject!, $filterUnknownFields: Boolean) {
					createContact(input: { data: $data }, filterUnknownFields: $filterUnknownFields) { id __typename }
				}`,
				variables: { data: dataObj, filterUnknownFields },
			});

			// Optional Note (Create)
			const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
			const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
			let initialNoteId: string | undefined;
			if (createInitialNote && create?.createContact?.id) {
				const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
				const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
				if (initialNoteText && initialNoteText.trim()) {
					initialNoteId = await createNoteWithOptionalPin(
						this,
						create.createContact.id as string,
						initialNoteText,
						pinInitialNote,
						makeBold,
					);
				}
			}

			return { ...(create?.createContact ?? {}), inputData: dataObj, initialNoteId };
		}

		/**
		 * ==============
		 * UPDATE CONTACT (by ID)
		 * ==============
		 */
		case 'updateContact': {
			const contactId = this.getNodeParameter('contactId', i) as string;
			if (!contactId) throw new ApplicationError('updateContact requires a contactId.');

			const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
			const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, true) as boolean;
			const allowChangeEmail = this.getNodeParameter('allowChangeEmail', i, false) as boolean;

			const dataObj = await sanitizeResourceMapperValueWithTypes.call(this, fieldsParam, 'update');

			if (!allowChangeEmail && 'global_contact_email' in dataObj) {
				delete (dataObj as any).global_contact_email;
			}
			if (Object.keys(dataObj).length === 0) {
				throw new ApplicationError('No fields provided to update.');
			}

			const result = await gqlCall(this, {
				operationName: 'UpdateContact',
				query: `mutation UpdateContact($contactId: String!, $data: JSONObject, $filterUnknownFields: Boolean) {
				updateContact(input: { id: $contactId, data: $data }, filterUnknownFields: $filterUnknownFields) {
					id data updatedAt
				}
				}`,
				variables: { contactId, data: dataObj, filterUnknownFields },
			});

			// Optional Note
			const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
			const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
			let initialNoteId: string | undefined;
			if (createInitialNote) {
				const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
				const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
				if (initialNoteText && initialNoteText.trim()) {
					initialNoteId = await createNoteWithOptionalPin(this, contactId, initialNoteText, pinInitialNote, makeBold);
				}
			}

			return { ...(result?.updateContact ?? {}), inputData: dataObj, initialNoteId };
		}

		/**
		 * ===========================
		 * UPSERT (by Email)
		 * ===========================
		 */
		case 'upsertContact': {
			const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);

			const filterUnknownFields = this.getNodeParameter('filterUnknownFields', i, true) as boolean;
			const dataObj = await sanitizeResourceMapperValueWithTypes.call(this, fieldsParam, 'upsert');

			const email = String(dataObj.global_contact_email ?? '').trim();
			if (!email) {
				throw new ApplicationError('Upsert requires global_contact_email in the mapped fields.');
			}

			const lookup = await gqlCall(this, {
				operationName: 'ContactByEmail',
				query: `query ContactByEmail($email: String!) { contactByEmail(email: $email) { id } }`,
				variables: { email },
			});
			const foundId = lookup?.contactByEmail?.id as string | undefined;

			if (foundId) {
				delete (dataObj as any).global_contact_email;

				const result = await gqlCall(this, {
					operationName: 'UpdateContact',
					query: `mutation UpdateContact($contactId: String!, $data: JSONObject, $filterUnknownFields: Boolean) {
        updateContact(input: { id: $contactId, data: $data }, filterUnknownFields: $filterUnknownFields) {
          id data updatedAt
        }
      }`,
					variables: { contactId: foundId, data: dataObj, filterUnknownFields },
				});

				return { mode: 'found-and-updated', ...(result?.updateContact ?? {}), inputData: dataObj };
			}

			const created = await gqlCall(this, {
				operationName: 'CreateContact',
				query: `mutation CreateContact($data: JSONObject!, $filterUnknownFields: Boolean) {
      createContact(input: { data: $data }, filterUnknownFields: $filterUnknownFields) { id __typename }
    }`,
				variables: { data: dataObj, filterUnknownFields },
			});

			return { mode: 'created-new', ...(created?.createContact ?? {}), inputData: dataObj };
		}

		/**
		 * ===========
		 * OTHER OPS
		 * ===========
		 */
		case 'getByEmail': {
			const email = this.getNodeParameter('email', i) as string;
			const data = await gqlCall(this, {
				operationName: 'ContactByEmail',
				query: `query ContactByEmail($email: String!) {
					contactByEmail(email: $email) {
						id
						data
						isArchived
						lastContactAttempt
						createdAt
						updatedAt
						author { profile { email firstName lastName } }
						lastContactPerson {
							id role createdAt
							profile { id email firstName lastName }
						}
						deals { id name pipeline { id name } stage { id name } }
					}
				}`,
				variables: { email },
			});
			return { email, contact: data?.contactByEmail ?? null };
		}

		case 'searchContacts': {
			const searchString = this.getNodeParameter('searchString', i) as string;
			const page = this.getNodeParameter('page', i) as number;
			const limit = this.getNodeParameter('limit', i) as number;

			const qSearch = JSON.stringify(searchString);
			const data = await gqlCall(this, {
				operationName: 'Contacts',
				query: `query Contacts {
					contacts(searchString: ${qSearch}, pagination: { page: ${page}, limit: ${limit} }) {
						data {
							id data isArchived lastContactAttempt lastContactPersonId createdAt updatedAt
							lastContactPerson { id role createdAt deletedAt }
							deals { id pipelineId stageId contactId name data isArchived authorId lastContactAttempt createdAt updatedAt }
						}
						pagination { page limit total }
					}
				}`,
			});
			return { searchString, pagination: data?.contacts?.pagination, contacts: data?.contacts?.data ?? [] };
		}

		// 'listByFilterGroup'

		case 'listByFilterGroup': {
			const filterGroupId = this.getNodeParameter('filterGroupId', i) as string;
			const searchString = this.getNodeParameter('searchString', i, '') as string;
			const page = this.getNodeParameter('page', i, 0) as number;
			const rawLimit = this.getNodeParameter('limit', i, 50) as number;
			const limit = Math.max(1, Math.min(Math.floor(Number(rawLimit) || 50), 100));
			const timezone = (this.getNodeParameter('timezone', i, 'Europe/Berlin') as string) || 'Europe/Berlin';

			const result = await withLoadedFilterGroup(
				this,
				'contact',
				filterGroupId,
				async () => {
					const variables: IDataObject = {
						pagination: { page, limit },
						isFilterActive: true,
						timezone,
					};
					if (searchString && searchString.trim()) variables.searchString = searchString.trim();

					const data = await gqlCall(this, {
						operationName: 'Contacts',
						query: `query Contacts(
        $searchString: String,
        $isFilterActive: Boolean,
        $pagination: PaginationInput!,
        $sort: CRMFilterSortInput,
        $timezone: String
      ) {
        contacts(
          searchString: $searchString,
          isFilterActive: $isFilterActive,
          pagination: $pagination,
          sort: $sort,
          timezone: $timezone
        ) {
          data {
            id
            data
            lastContactAttempt
            lastContactPerson { id role createdAt deletedAt profile { id email firstName lastName avatarUrl isEmailBrandingEnabled preferredLanguage } }
            deals { id name pipeline { id name } stage { id name color } }
            updatedAt
            createdAt
            author { id role createdAt deletedAt profile { id email firstName lastName avatarUrl isEmailBrandingEnabled preferredLanguage } }
          }
          pagination { page limit total }
        }
      }`,
						variables,
					});

					return {
						filterGroupId,
						timezone,
						pagination: data?.contacts?.pagination,
						contacts: data?.contacts?.data ?? [],
					};
				},
				{ requireEmailPassword: true, deleteFilters: true },
			);

			return result;
		}

		default:
			throw new ApplicationError(`Unsupported contact operation: ${operation}`);
	}
}
