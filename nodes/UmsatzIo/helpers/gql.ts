import { IExecuteFunctions, ILoadOptionsFunctions, IDataObject, ApplicationError } from 'n8n-workflow';

function isJwtExpired(token: string, skewSeconds = 30): boolean {
	try {
		const [, payloadB64] = token.split('.');
		const json = Buffer.from(payloadB64, 'base64').toString('utf8');
		const payload = JSON.parse(json) as { exp?: number };
		if (!payload.exp) return false;
		const now = Math.floor(Date.now() / 1000);
		return payload.exp <= now + skewSeconds;
	} catch {
		return false;
	}
}

// ───────────────────────────────────────────────────────────────
// HTTP Helper with Timeout + Exponential Backoff + 429 Retry-After
// ───────────────────────────────────────────────────────────────
function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

function safeString(v: any): string {
	try {
		if (typeof v === 'string') return v;
		return JSON.stringify(v);
	} catch {
		return '[unserializable]';
	}
}

async function httpJson(ctx: any, opts: any, retries = 2, delayMs = 400): Promise<any> {
	const final = {
		timeout: 15_000,
		...opts,
		json: true,
		headers: {
			...(opts?.headers ?? {}),
		},
	};
	try {
		return await ctx.helpers.httpRequest(final);
	} catch (e: any) {
		const status = e?.statusCode ?? e?.response?.statusCode;
		if (status === 429 && retries > 0) {
			const retryAfterHeader = e?.response?.headers?.['retry-after'];
			const retryAfterMs =
				(typeof retryAfterHeader === 'string' && Number(retryAfterHeader) * 1000) ||
				(typeof retryAfterHeader === 'number' && retryAfterHeader * 1000) ||
				delayMs;
			await sleep(retryAfterMs);
			return httpJson(ctx, final, retries - 1, Math.min(delayMs * 2, 5_000));
		}
		if (retries > 0 && (status === 0 || status === undefined)) {
			await sleep(delayMs);
			return httpJson(ctx, final, retries - 1, Math.min(delayMs * 2, 2_000));
		}
		const body = e?.response?.body;
		const msg = body ? safeString(body) : (e?.message ?? 'HTTP error');
		throw new ApplicationError(msg);
	}
}

async function doGraphQL(ctx: any, url: string, headers: any, body: any) {
	let safeBody: any = body;
	try {
		safeBody = JSON.parse(JSON.stringify(body ?? {}));
	} catch {
		safeBody = {};
	}

	const resp = await httpJson(ctx, {
		method: 'POST',
		url,
		headers: {
			...headers,
		},
		body: safeBody,
	});

	if (resp?.errors?.length) {
		const [firstError] = resp.errors as Array<{
			message?: string;
			path?: string[];
			extensions?: { code?: string; [key: string]: any };
			[key: string]: any;
		}>;

		console.error('Umsatz.io GraphQL error:', JSON.stringify(resp.errors, null, 2));

		const code = firstError?.extensions?.code;
		const path = firstError?.path?.join('.') || '';
		const baseMessage = firstError?.message || 'GraphQL error';

		const parts: string[] = [baseMessage];
		if (code) parts.push(`code=${code}`);
		if (path) parts.push(`path=${path}`);

		const msg = parts.join(' | ');

		throw new ApplicationError(msg, {
			extra: {
				graphqlErrors: resp.errors,
			},
		});
	}

	return resp?.data ?? {};
}

/** ─────────────────────────────────────────────────────────────
 *  Role-Check for emailPassword
 *  ────────────────────────────────────────────────────────────*/
const DENY_ROLES = new Set(['TenantMember', 'TenantSupport']);

async function fetchViewerRole(ctx: any, endpoint: string, authHeader: string): Promise<string> {
	const data = await doGraphQL(
		ctx,
		endpoint,
		{ Authorization: authHeader, 'Content-Type': 'application/json', Accept: 'application/json' },
		{ query: `query Account { viewer { role } }` },
	);
	const role = data?.viewer?.role as string | undefined;
	if (!role) throw new ApplicationError('Viewer role not returned.');
	return role;
}

async function ensureRoleAllowedEmailPassword(ctx: any, endpoint: string, accessToken: string) {
	const role = await fetchViewerRole(ctx, endpoint, `Bearer ${accessToken}`);
	if (DENY_ROLES.has(role)) {
		throw new ApplicationError(`Access denied for role "${role}".`);
	}
}

export async function gqlCall(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	body: { operationName?: string; query: string; variables?: IDataObject },
) {
	const credentials = await ctx.getCredentials('umsatzIoApi');
	const endpoint = ((credentials.endpoint as string) || 'https://app.umsatz.io/api/graphql').trim();
	const authMode = (credentials as any).authMode || 'basicToken';

	const outBody: any = { query: body.query };
	if (body.variables !== undefined) {
		try {
			outBody.variables = JSON.parse(JSON.stringify(body.variables));
		} catch {
			outBody.variables = {};
		}
	}
	if (body.operationName && String(body.operationName).trim().length > 0) {
		outBody.operationName = String(body.operationName).trim();
	}

	const makeHeaders = (authHeader: string, extra: Record<string, string> = {}) => ({
		Authorization: authHeader,
		'Content-Type': 'application/json',
		Accept: 'application/json',
		...extra,
	});

	const tryOnce = async (headers: any) => {
		return doGraphQL(ctx as any, endpoint, headers, outBody);
	};

	// === BASIC (API Key) — No Role test ===
	if (authMode === 'basicToken') {
		let token = (((credentials as any).token as string) || '').trim();
		if (!token) throw new ApplicationError('Missing credential "token" for Umsatz.io');

		const rawToken = token.toLowerCase().startsWith('basic ') ? token.slice(6).trim() : token;

		const auth = token.toLowerCase().startsWith('basic ') ? token : `Basic ${token}`;

		return tryOnce(makeHeaders(auth, { 'x-tenant-api-key': rawToken }));
	}

	// === EMAIL/PASSWORD (Bearer) — With Role test ===
	let accessToken = (((credentials as any).accessToken as string) || '').trim();
	let refreshToken = (((credentials as any).refreshToken as string) || '').trim();
	const email = (((credentials as any).email as string) || '').trim();
	const password = (((credentials as any).password as string) || '').trim();

	const commonNoAuthHeaders = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};

	const doRefresh = async () => {
		if (!refreshToken) throw new ApplicationError('Missing refreshToken for refresh flow.');
		const r = await doGraphQL(ctx as any, endpoint, commonNoAuthHeaders, {
			query: `mutation Refresh($refreshToken: String!) {
        refreshToken(token: $refreshToken) { accessToken refreshToken }
      }`,
			variables: { refreshToken },
		});
		accessToken = r.refreshToken.accessToken;
		refreshToken = r.refreshToken.refreshToken;
	};

	const doLogin = async () => {
		if (!email || !password) throw new ApplicationError('Missing email/password for login flow.');
		const r = await doGraphQL(ctx as any, endpoint, commonNoAuthHeaders, {
			query: `mutation Login($input: IAMLoginInput!) {
        login(input: $input) { accessToken refreshToken }
      }`,
			variables: { input: { email, password } },
		});
		accessToken = r.login.accessToken;
		refreshToken = r.login.refreshToken;
	};

	if (accessToken && !isJwtExpired(accessToken)) {
		try {
			await ensureRoleAllowedEmailPassword(ctx, endpoint, accessToken);
			return await tryOnce(makeHeaders(`Bearer ${accessToken}`));
		} catch (e: any) {
			if (e?.graphQLErrorCode === 'UNAUTHENTICATED') {
				try {
					if (refreshToken) await doRefresh();
					else await doLogin();

					await ensureRoleAllowedEmailPassword(ctx, endpoint, accessToken);
					return await tryOnce(makeHeaders(`Bearer ${accessToken}`));
				} catch {
					throw e;
				}
			}
			throw e;
		}
	}

	if (refreshToken) {
		await doRefresh();
	} else {
		await doLogin();
	}

	await ensureRoleAllowedEmailPassword(ctx, endpoint, accessToken);
	return tryOnce(makeHeaders(`Bearer ${accessToken}`));
}

export async function fetchApiFieldName(ctx: IExecuteFunctions, fieldId: string): Promise<string> {
	const data = await gqlCall(ctx, {
		operationName: 'Field',
		query: `query Field($fieldId: ID!) { field(fieldId: $fieldId) { id name } }`,
		variables: { fieldId },
	});
	return data?.field?.name || fieldId;
}

export async function coerceDate(value: string, fieldId: string): Promise<string> {
	const d = new Date(value);
	if (isNaN(d.getTime())) throw new ApplicationError(`Invalid date for fieldId ${fieldId}: ${value}`);
	return d.toISOString();
}
