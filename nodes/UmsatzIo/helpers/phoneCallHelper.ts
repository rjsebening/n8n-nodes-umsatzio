import type { IWebhookFunctions } from 'n8n-workflow';
import { gqlCall } from './gql';

const PHONECALL_BY_ID = `
query PhoneCallById($id: ID!) {
  PhoneCallActivity(id: $id) {
    id
    activityTime
    phoneCallResult
    phoneCallActivityType { id label category }
    parentId
    parentType
    phoneNumber
    description
    author { id profile { email firstName lastName } }
    createdAt
    updatedAt
  }
}`;

function normalizeString(v: unknown): string | null {
	const s = (v ?? '').toString().trim();
	return s ? s : null;
}
function extractFromBody(body: any) {
	const typeId =
		normalizeString(body?.phoneCallActivityType?.id) || normalizeString(body?.phoneCallActivityTypeId) || null;
	const result = normalizeString(body?.phoneCallResult);
	const id = normalizeString(body?.id);
	return { id, typeId, result };
}
function matches(
	gotTypeId: string | null,
	gotResult: string | null,
	wantTypeId: string | null,
	wantResult: string | null,
) {
	const typeOk = !wantTypeId || gotTypeId === wantTypeId;
	const resultOk = !wantResult || gotResult === wantResult;
	return typeOk && resultOk;
}

export async function enrichAndMatchPhoneCall(
	this: IWebhookFunctions,
	body: any,
	params: {
		callTypeMode?: 'any' | 'specific';
		callResultMode?: 'any' | 'specific';
		phoneCallActivityTypeId?: string | null;
		callResultTypes?: string | null; // single-select
	},
): Promise<any | null> {
	const wantTypeId = params.callTypeMode === 'specific' ? normalizeString(params.phoneCallActivityTypeId) : null;

	const wantResult = params.callResultMode === 'specific' ? normalizeString(params.callResultTypes) : null;

	const b = extractFromBody(body);

	if (matches(b.typeId, b.result, wantTypeId, wantResult)) {
		if (!b.id) return null;
		try {
			const res: any = await gqlCall(this as any, { query: PHONECALL_BY_ID, variables: { id: b.id } });
			const enriched = res?.PhoneCallActivity ?? null;
			if (!enriched) return null;

			let descriptionParsed = enriched?.description;
			if (typeof descriptionParsed === 'string') {
				try {
					descriptionParsed = JSON.parse(descriptionParsed);
				} catch {}
			}

			return {
				body: body,
				activity: { ...enriched, descriptionParsed },
			};
		} catch (e: any) {
			let descriptionParsed = body?.description;
			if (typeof descriptionParsed === 'string') {
				try {
					descriptionParsed = JSON.parse(descriptionParsed);
				} catch {}
			}
			return {
				body: body,
				activity: {
					id: b.id,
					activityTime: body?.activityTime,
					phoneCallResult: b.result,
					phoneCallActivityType: b.typeId
						? {
								id: b.typeId,
								label: body?.phoneCallActivityType?.label,
								category: body?.phoneCallActivityType?.category,
							}
						: undefined,
					descriptionParsed,
				},
			};
		}
	}

	if (!b.id) return null;
	try {
		const res: any = await gqlCall(this as any, { query: PHONECALL_BY_ID, variables: { id: b.id } });
		const enriched = res?.PhoneCallActivity ?? null;
		if (!enriched) return null;

		const gotTypeId = normalizeString(enriched?.phoneCallActivityType?.id);
		const gotResult = normalizeString(enriched?.phoneCallResult);
		if (!matches(gotTypeId, gotResult, wantTypeId, wantResult)) return null;

		let descriptionParsed = enriched?.description;
		if (typeof descriptionParsed === 'string') {
			try {
				descriptionParsed = JSON.parse(descriptionParsed);
			} catch {}
		}

		return {
			body: body,
			activity: { ...enriched, descriptionParsed },
		};
	} catch {
		return null;
	}
}
