import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

export async function getWebhookTriggers(this: ILoadOptionsFunctions) {
	const data = await gqlCall(this, {
		operationName: 'GetWebhookTriggerEnum',
		query: `query GetWebhookTriggerEnum {
			__type(name: "WebhookTrigger") {
				enumValues(includeDeprecated: true) { name description }
			}
		}`,
	});
	const vals = data?.__type?.enumValues ?? [];
	if (!vals.length) return [{ name: 'No Triggers Found', value: '' }];
	return vals.map((v: any) => ({
		name: v.name,
		value: v.name,
		description: v.description || undefined,
	}));
}

export async function getWebhooksAsOptions(this: ILoadOptionsFunctions) {
	const data = await gqlCall(this, {
		operationName: 'GetWebhooks',
		query: `query GetWebhooks { webhooks { id url triggers } }`,
		variables: {},
	});
	const list = Array.isArray(data?.webhooks) ? data.webhooks : [];
	if (!list.length) return [{ name: 'No Webhooks Found', value: '' }];
	return list.map((w: any) => ({
		name: `${w.url}  (${Array.isArray(w.triggers) ? w.triggers.join(', ') : ''})`,
		value: w.id,
	}));
}

export async function getContactProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const q = `query ContactCards {
		cards(serviceType: contact) {
			fields { id name label columnLabel serviceType }
		}
	}`;
	const r: any = await gqlCall(this, { query: q, variables: {} });

	// ✅ aus cards.*.fields flatten (NICHT r.table.data)
	const fields: any[] = (r?.cards ?? []).flatMap((c: any) => c?.fields ?? []);

	// Deduplizieren nach API-Name (oder id als Fallback)
	const seen = new Map<string, any>();
	for (const f of fields) {
		const key = String(f?.name || f?.id || '');
		if (!key) continue;
		if (!seen.has(key)) seen.set(key, f);
	}

	const out = [...seen.values()]
		.sort((a, b) =>
			String(a.columnLabel || a.label || a.name).localeCompare(String(b.columnLabel || b.label || b.name), 'de', {
				sensitivity: 'base',
			}),
		)
		.map((f) => ({
			name: f.columnLabel || f.label || f.name || f.id,
			value: String(f.name || f.id),
		}));

	return out.length ? out : [{ name: 'No Fields Found', value: '' }];
}

export async function getDealProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const q = `query DealCards {
		cards(serviceType: deal) {
			fields { id name label columnLabel serviceType }
		}
	}`;
	const r: any = await gqlCall(this, { query: q, variables: {} });

	const fields: any[] = (r?.cards ?? []).flatMap((c: any) => c?.fields ?? []);

	const seen = new Map<string, any>();
	for (const f of fields) {
		const key = String(f?.name || f?.id || '');
		if (!key) continue;
		if (!seen.has(key)) seen.set(key, f);
	}

	const out = [...seen.values()]
		.sort((a, b) =>
			String(a.columnLabel || a.label || a.name).localeCompare(String(b.columnLabel || b.label || b.name), 'de', {
				sensitivity: 'base',
			}),
		)
		.map((f) => ({
			name: f.columnLabel || f.label || f.name || f.id,
			value: String(f.name || f.id),
		}));

	return out.length ? out : [{ name: 'No Fields Found', value: '' }];
}

export async function getFormsAsOptions(this: ILoadOptionsFunctions) {
	const q = `query { forms { id name } }`;
	const r: any = await gqlCall(this, { query: q, variables: {} });
	const list = Array.isArray(r?.forms) ? r.forms : [];
	return list.length
		? list.map((f: any) => ({ name: f.name || f.id, value: f.id }))
		: [{ name: 'No Forms Found', value: '' }];
}

export async function getWebhookProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const raw = this.getCurrentNodeParameter('triggers');
	const triggers: string[] = Array.isArray(raw) ? raw : raw ? [raw as string] : [];

	if (!triggers.length) {
		return [{ name: 'Select a Trigger First', value: '' }];
	}

	const out: INodePropertyOptions[] = [];

	const loadProps = async (serviceType: 'contact' | 'deal', prefix: string) => {
		// ❗ Auf cards(..).fields umstellen (kein table)
		const q = `query ${serviceType === 'contact' ? 'Contact' : 'Deal'}Cards {
			cards(serviceType: ${serviceType}) {
				fields { id name label columnLabel }
			}
		}`;
		const res: any = await gqlCall(this, { query: q, variables: {} });
		const fields: any[] = (res?.cards ?? []).flatMap((c: any) => c?.fields ?? []);

		const seen = new Map<string, any>();
		for (const f of fields) {
			const key = String(f?.name || f?.id || '');
			if (!key) continue;
			if (!seen.has(key)) seen.set(key, f);
		}

		const opts = [...seen.values()]
			.sort((a, b) =>
				String(a.columnLabel || a.label || a.name).localeCompare(String(b.columnLabel || b.label || b.name), 'de', {
					sensitivity: 'base',
				}),
			)
			.map((f) => ({
				name: `${prefix}${f.columnLabel || f.label || f.name || f.id}`,
				value: String(f.name || f.id),
			}));
		out.push(...opts);
	};

	if (triggers.includes('changeContactProperty')) {
		await loadProps('contact', 'Contact: ');
	}
	if (triggers.includes('changeDealProperty')) {
		await loadProps('deal', 'Deal: ');
	}

	return out.length ? out : [{ name: 'No Properties Found', value: '' }];
}
