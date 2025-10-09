// nodes/UmsatzIo/resourceMappers/deal.resourceMapper.ts
import type { ILoadOptionsFunctions, ResourceMapperField, ResourceMapperFields, IDataObject } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

type CRMField = {
	id: string;
	label?: string | null;
	name?: string | null; // API-Name
	fieldType?: string | null; // z.B. text, textarea, day, dayTime, switch, dropdown, multiselect, numeric, currency, ...
	required?: boolean | null;
	options?: Array<{ id: string; value: string }> | null;
	columnLabel?: string | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache: Record<string, { ts: number; fields: CRMField[] }> = {};

const ft = (s?: string | null) => (s || '').toLowerCase();
const toDisplay = (f: CRMField) => (f.label || f.columnLabel || f.name || f.id || '').toString();

/** Deal-spezifische ReadOnly-Felder – bei Bedarf erweitern */
export const umsatzioDealReadOnlyFields = [
	'global_deal_createdAt',
	'global_deal_createdBy',
	'global_deal_last_contact_attempt',
	'global_deal_last_activity',
	'global_deal_phone_call_count',
];

function mapToFieldType(f: CRMField): ResourceMapperField['type'] {
	const t = ft(f.fieldType);

	// echte Dropdowns + booleanartige Dropdowns als Options (true/false)
	if (t === 'dropdown' || t === 'select' || t === 'booleandropdown' || t === 'switch') return 'options';
	if (t === 'multiselect') return 'array';
	if (t === 'day' || t === 'time' || t === 'daytime') return 'dateTime';
	if (t === 'numeric' || t === 'currency') return 'number';
	return 'string';
}

function toOptions(f: CRMField) {
	const t = ft(f.fieldType);

	// booleanartige Dropdowns: standardmäßig leer, Auswahl true/false
	if (t === 'booleandropdown' || t === 'switch') {
		return [
			{ name: 'Yes', value: true },
			{ name: 'No', value: false },
		];
	}

	if (!Array.isArray(f.options) || !f.options.length) return undefined;
	return f.options.map((o) => ({ name: String(o.value), value: String(o.value) }));
}

async function loadDealCardsFields(this: ILoadOptionsFunctions): Promise<CRMField[]> {
	// Cache-Key pro Credential-URL/Workspace
	let cacheKey = 'deal:default';
	try {
		const creds = (await this.getCredentials('umsatzIoApi')) as unknown as IDataObject;
		const url =
			(creds?.url as string) ?? (creds?.baseUrl as string) ?? (creds?.endpoint as string) ?? (creds?.host as string);
		if (url) cacheKey = `deal:${url}`;
	} catch {
		/* ignore */
	}

	const hit = _cache[cacheKey];
	if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.fields;

	const query = `
    query DealCards {
      cards(serviceType: deal) {
        id
        name
        label
        fields {
          id
          label
          name
          fieldType
          required
          columnLabel
          options { id value }
        }
      }
    }
  `;

	let fields: CRMField[] = [];
	try {
		const res: any = await gqlCall(this, { query, variables: {} });
		const cards: any[] = Array.isArray(res?.cards) ? res.cards : [];

		// Dedupe nach API-Namen (name), Fallback id
		const byKey = new Map<string, CRMField>();
		for (const c of cards) {
			for (const f of (c?.fields ?? []) as CRMField[]) {
				const key = (f.name || f.id).toString();
				if (!byKey.has(key)) byKey.set(key, f);
			}
		}
		fields = [...byKey.values()];
	} catch {
		fields = [];
	}

	_cache[cacheKey] = { ts: Date.now(), fields };
	return fields;
}

/** Für CREATE (add) – kein Matching nötig, Required aus Backend ignorieren */
export async function getDealResourceMapperFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const fields = await loadDealCardsFields.call(this);

	const mapped: ResourceMapperField[] = fields.map((f): ResourceMapperField => {
		const fieldName = (f.name || f.id).toString();
		const type = mapToFieldType(f);
		const opts = type === 'options' || type === 'array' ? toOptions(f) : undefined;

		return {
			id: fieldName,
			displayName: toDisplay(f),
			required: false, // bei Create/Update via Mapper nicht erzwingen
			canBeUsedToMatch: false, // Deal-Upsert via Mapper aktuell nicht vorgesehen
			defaultMatch: false,
			display: true,
			type,
			options: opts,
			readOnly: umsatzioDealReadOnlyFields.includes(fieldName),
			removed: false,
		};
	});

	return { fields: mapped };
}

/** Für UPDATE – identisch, aber explizit ohne Matching/Required */
export async function getDealResourceMapperFieldsForUpdate(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const res = await getDealResourceMapperFields.call(this);
	res.fields = res.fields.map((f) => ({
		...f,
		required: false,
		canBeUsedToMatch: false,
		defaultMatch: false,
	}));
	return res;
}
