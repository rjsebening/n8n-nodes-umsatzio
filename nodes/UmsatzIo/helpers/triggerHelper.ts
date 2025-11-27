import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { gqlCall } from '../helpers/gql';

/** Cache-TTL URL→ID Lookups (10 Min) */
export const URL_ID_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listWebhooks(
	ctx: IHookFunctions | IWebhookFunctions,
): Promise<Array<{ id: string; url: string; triggers?: string[] }>> {
	const query = `query { webhooks { id url triggers } }`;
	try {
		const r: any = await gqlCall(ctx as any, { query, variables: {} });
		const list = r?.webhooks;
		return Array.isArray(list) ? (list as any[]) : [];
	} catch {
		return [];
	}
}

export async function findWebhookByExactUrl(
	ctx: IHookFunctions | IWebhookFunctions,
	url: string,
): Promise<{ id: string; url: string } | undefined> {
	const data = ctx.getWorkflowStaticData('node') as any;
	data.idByUrl = data.idByUrl || {};

	const cached = data.idByUrl[url] as { id: string; ts: number } | undefined;
	if (cached && Date.now() - cached.ts < URL_ID_CACHE_TTL_MS) {
		const list = await listWebhooks(ctx);
		const hit = list.find((w) => w?.id === cached.id && w?.url === url);
		if (hit) return { id: hit.id, url: hit.url };
	}

	const list = await listWebhooks(ctx);
	const hit = list.find((w) => w?.url === url);
	if (hit?.id) {
		data.idByUrl[url] = { id: hit.id, ts: Date.now() };
		return { id: hit.id, url: hit.url };
	}
	return undefined;
}

export async function deleteWebhookByIdWithRetry(
	ctx: IHookFunctions | IWebhookFunctions,
	id: string,
	opts?: {
		retries?: number;
		backoffMs?: number;
		failOnError?: boolean;
	},
): Promise<boolean> {
	const retries = opts?.retries ?? 3;
	const backoffMs = opts?.backoffMs ?? 500;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const mutation = `mutation DeleteWebhook($id: ID!) { deleteWebhook(id: $id) { id } }`;
			await gqlCall(ctx as any, {
				operationName: 'DeleteWebhook',
				query: mutation,
				variables: { id },
			});
			return true;
		} catch (e: any) {
			const msg = e?.message || 'unknown';
			(ctx as any).logger?.warn?.(`umsatz.io: deleteWebhook failed (attempt ${attempt + 1}/${retries + 1})`, {
				id,
				error: msg,
			});
			if (attempt === retries) {
				if (opts?.failOnError) throw e;
				return false;
			}
			await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
		}
	}
	return false;
}
