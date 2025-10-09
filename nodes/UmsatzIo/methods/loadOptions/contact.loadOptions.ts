// nodes/UmsatzIo/loadOptions/contact.loadOptions.ts
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';
import { getFieldById } from '../resourceMappers/contact.resourceMapper';

/**
 * Kontakte laden (für Dropdowns etc.). Nutzt optional 'contactSearch'.
 */
export async function getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let search = '';
	try {
		search = (this.getNodeParameter('contactSearch', 0) as string) || '';
	} catch {
		// optional
	}

	const page = 0;
	const limit = 50;
	const qSearch = JSON.stringify(search);

	const res: any = await gqlCall(this, {
		operationName: 'Contacts',
		query: `query Contacts {
			contacts(searchString: ${qSearch}, pagination: { page: ${page}, limit: ${limit} }) {
				data { id data }
				pagination { page limit total }
			}
		}`,
	});
	const rows: any[] = res?.contacts?.data ?? [];

	return rows.map((c: any) => {
		const email = c?.data?.global_contact_email;
		const first = c?.data?.global_contact_firstName ?? c?.data?.firstName;
		const last = c?.data?.global_contact_lastName ?? c?.data?.lastName;

		const label =
			[first, last].filter(Boolean).join(' ').trim() || (email ? String(email) : '') || String(c?.id ?? 'Unknown');

		return {
			name: label,
			value: String(c.id),
			description: email ? String(email) : undefined,
		};
	});
}

/**
 * Dropdown-Felder (Name/Label + ID) – für ältere Mappings, falls noch verwendet.
 * Filtert lokal nach fieldType (dropdown/select/booleanDropdown).
 */
export async function getDropdownContactFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// Wir nutzen die Cards-API direkt, um Feldliste (inkl. fieldType) zu erhalten.
	const res: any = await gqlCall(this, {
		operationName: 'ContactCards',
		query: `query ContactCards {
			cards(serviceType: contact) {
				fields { id label name fieldType columnLabel }
			}
		}`,
	});

	const fields: Array<{ id: string; label?: string; name?: string; fieldType?: string; columnLabel?: string }> = (
		res?.cards ?? []
	).flatMap((c: any) => c?.fields ?? []);

	const isDropdownLike = (t?: string) => {
		const ft = (t || '').toLowerCase();
		return ft === 'dropdown' || ft === 'select' || ft === 'booleandropdown';
	};

	const dropdowns = fields.filter((f) => isDropdownLike(f.fieldType));
	if (!dropdowns.length) {
		return [{ name: 'No Dropdown Fields Found', value: '__no_dropdown_fields__' }];
	}

	return dropdowns.map((f) => ({
		name: f.columnLabel || f.label || f.name || f.id,
		value: f.id,
		description: `Dropdown field: ${f.label || f.name || f.id}`,
	}));
}

/**
 * Dropdown-Optionen für ein spezifisches Feld innerhalb der Fixed-Collection "dropdownFields.field".
 * Speichert NUR den 'value' der Option (nicht die option.id).
 */
export async function getDropdownOptionsContactForField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let allItems: Array<{ dropdownField?: string; dropdownValue?: string }> = [];
	try {
		allItems = this.getNodeParameter('dropdownFields.field', 0) as Array<{
			dropdownField?: string;
			dropdownValue?: string;
		}>;
	} catch {
		// optional
	}

	const currentItemIndex = allItems.findIndex((item) => item.dropdownField && !item.dropdownValue);
	const fieldId = currentItemIndex >= 0 ? allItems[currentItemIndex].dropdownField : undefined;

	if (!fieldId || fieldId === '__no_dropdown_fields__') {
		return [{ name: 'No Field Selected', value: '__no_field__' }];
	}

	// 1) Versuch: Feld inkl. Optionen aus dem Resource-Mapper-Cache holen
	const mapperField = await getFieldById.call(this, fieldId);
	if (Array.isArray(mapperField?.options) && mapperField.options.length) {
		return mapperField.options.map((o: any) => ({
			name: String(o.value),
			value: String(o.value),
		}));
	}

	// 2) Fallback: Einzel-Feld-Query
	const fieldResp = await gqlCall(this, {
		operationName: 'Field',
		query: `query Field($fieldId: ID!) {
			field(fieldId: $fieldId) { id options { id value } }
		}`,
		variables: { fieldId },
	});

	const opts: Array<{ id: string; value: string }> = fieldResp?.field?.options ?? [];
	if (!opts.length) return [{ name: 'No Options Available', value: '__no_options__' }];

	return opts.map((o) => ({ name: String(o.value), value: String(o.value) }));
}
