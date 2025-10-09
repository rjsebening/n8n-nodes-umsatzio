import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from './gql';

export async function loadFieldsByService(
	ctx: ILoadOptionsFunctions,
	service: 'contact' | 'deal',
): Promise<
	Array<{
		id: string;
		label?: string;
		name?: string;
		fieldType?: string;
		dataType?: string;
	}>
> {
	const op = service === 'contact' ? 'ContactCards' : 'DealCards';
	const q = `query ${op} {
		cards(serviceType: ${service}) {
			fields { id label name fieldType dataType }
		}
	}`;
	const data = await gqlCall(ctx, {
		operationName: op,
		query: q,
		variables: {},
	});
	const fields = (data?.cards ?? []).flatMap((c: any) => c?.fields ?? []);
	return fields.filter((f: any) => !!f?.id);
}

/** Type Guards */
export function isDropdown(f: any) {
	const ft = String(f?.fieldType || '').toLowerCase();
	const dt = String(f?.dataType || '').toLowerCase();
	return ft === 'dropdown' || dt === 'enum';
}
export function isBoolean(f: any) {
	const ft = String(f?.fieldType || '').toLowerCase();
	const dt = String(f?.dataType || '').toLowerCase();
	return ft === 'switch' || dt === 'boolean';
}
export function isDate(f: any) {
	const ft = String(f?.fieldType || '').toLowerCase();
	const dt = String(f?.dataType || '').toLowerCase();
	return ft === 'day' || ft === 'daytime' || dt === 'date' || dt === 'datetime';
}
export function isTextLike(f: any) {
	return !isDropdown(f) && !isBoolean(f) && !isDate(f);
}

export function toOptionFromField(f: any): INodePropertyOptions {
	return { name: f.label || f.name || f.id, value: f.id };
}

const EXCLUDE_DEAL_FIELD_NAMES = new Set(['name', 'contactId', 'pipelineId', 'stageId']);
export function notExcludedDealField(f: any) {
	const key = (f?.name || '').trim();
	return !EXCLUDE_DEAL_FIELD_NAMES.has(key);
}

type AnyMap = Record<string, unknown>;
declare const global: AnyMap;

export function getGlobalCache<T extends AnyMap = AnyMap>(ns = '__umsatzio_cache__'): T {
	const g = global as AnyMap;
	if (!g[ns]) g[ns] = {};
	return g[ns] as T;
}
