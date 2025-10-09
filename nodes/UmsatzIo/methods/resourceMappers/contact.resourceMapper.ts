// nodes/UmsatzIo/resourceMappers/contact.resourceMapper.ts
import { gqlCall } from '../../helpers/gql';

import type { ILoadOptionsFunctions, ResourceMapperField, ResourceMapperFields, IDataObject } from 'n8n-workflow';

type CRMField = {
	id: string;
	label?: string | null;
	name?: string | null;
	fieldType?: string | null;
	required?: boolean | null;
	options?: Array<{ id: string; value: string }> | null;
	columnLabel?: string | null;
	// evtl. kommt in deiner API auch field: { id, name, ... } – falls ja, hier mergen
};

const umsatzioReadOnlyFields = [
	'global_contact_last_reached',
	'global_contact_last_reached_decision_maker',
	'global_contact_phone_call_count',
	'global_contact_createdAt',
	'global_contact_createdBy',
];

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache: Record<string, { ts: number; fields: CRMField[] }> = {};

const ft = (s?: string | null) => (s || '').toLowerCase();
const toDisplay = (f: CRMField) => (f.label || f.columnLabel || f.name || f.id || '').toString();

function mapToFieldType(f: CRMField): ResourceMapperField['type'] {
	const t = ft(f.fieldType);

	if (t === 'dropdown' || t === 'select' || t === 'booleandropdown' || t === 'switch') return 'options';
	if (t === 'multiselect') return 'array';
	if (t === 'day' || t === 'time' || t === 'daytime') return 'dateTime';
	if (t === 'numeric' || t === 'currency') return 'number';
	return 'string';
}

function toOptions(f: CRMField) {
	const t = ft(f.fieldType);

	// ⬅️ Dropdown true/false, keine Vorauswahl (RM setzt ohne Value = leer)
	if (t === 'booleandropdown' || t === 'switch') {
		return [
			{ name: 'Yes', value: true },
			{ name: 'No', value: false },
		];
	}

	if (!Array.isArray(f.options) || !f.options.length) return undefined;
	return f.options.map((o) => ({ name: String(o.value), value: String(o.value) }));
}

async function loadContactCardsFields(this: ILoadOptionsFunctions): Promise<CRMField[]> {
	// 🔧 CREDs sicher holen + typisieren
	let cacheKey = 'contact:default';
	try {
		const creds = (await this.getCredentials('umsatzIoApi')) as unknown as IDataObject;
		const url =
			(creds?.url as string) ?? (creds?.baseUrl as string) ?? (creds?.endpoint as string) ?? (creds?.host as string);

		if (url) cacheKey = `contact:${url}`;
	} catch {
		// keine Creds → default key
	}
	const hit = _cache[cacheKey];
	if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.fields;

	const query = `
    query ContactCards {
      cards(serviceType: contact) {
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
		// Dedupe nach API-Name (name) mit Fallback ID:
		const byKey = new Map<string, CRMField>();
		for (const c of cards) {
			for (const f of (c?.fields ?? []) as CRMField[]) {
				const key = (f.name || f.id).toString();
				if (!byKey.has(key)) byKey.set(key, f);
			}
		}
		fields = [...byKey.values()];
	} catch (e) {
		// Fallback: leere Felder, damit UI nicht crasht
		fields = [];
	}

	_cache[cacheKey] = { ts: Date.now(), fields };
	return fields;
}

export async function getContactResourceMapperFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const fields = await loadContactCardsFields.call(this);

	// Falls Backend nichts liefert, einen Hinweis-Feld zurückgeben
	if (!fields.length) {
		const fallback: ResourceMapperField = {
			id: 'global_contact_email',
			displayName: 'Email',
			required: false,
			canBeUsedToMatch: true,
			defaultMatch: true,
			display: true,
			type: 'string',
			readOnly: false,
			removed: false,
		};
		return { fields: [fallback] };
	}

	const mapped: ResourceMapperField[] = fields.map((f): ResourceMapperField => {
		const fieldName = (f.name || f.id).toString();
		const type = mapToFieldType(f);
		const opts = type === 'options' || type === 'array' ? toOptions(f) : undefined;
		const isEmail = fieldName === 'global_contact_email';

		return {
			id: fieldName,
			displayName: toDisplay(f),
			required: !!f.required,
			canBeUsedToMatch: isEmail, // nur Email matchbar
			defaultMatch: isEmail, // und default aktiv
			display: true,
			type,
			options: opts,
			readOnly: umsatzioReadOnlyFields.includes(fieldName),
			removed: umsatzioReadOnlyFields.includes(fieldName),
		};
	});

	// falls Email fehlt, hinzufügen
	if (!mapped.some((m) => m.id === 'global_contact_email')) {
		mapped.unshift({
			id: 'global_contact_email',
			displayName: 'Email',
			required: false,
			canBeUsedToMatch: true,
			defaultMatch: true,
			display: true,
			type: 'string',
			readOnly: false,
			removed: false,
		});
	}

	return { fields: mapped };
}

/** Update-Variante: Match-UI ausblenden, indem keine Felder matchbar sind */
export async function getContactResourceMapperFieldsForUpdate(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const res = await getContactResourceMapperFields.call(this);
	res.fields = res.fields.map((f: ResourceMapperField) => ({
		...f,
		required: false, // 👈 Required-Flag für Update deaktivieren
		canBeUsedToMatch: false, // 👈 kein Matching im Update
		defaultMatch: false,
	}));
	return res;
}

export async function getFieldById(this: ILoadOptionsFunctions, fieldId: string) {
	const fields = await loadContactCardsFields.call(this);
	return fields.find((f) => String(f.id) === String(fieldId));
}
