import type {
	ICredentialType,
	INodeProperties,
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IDataObject,
} from 'n8n-workflow';

/** Rollen, die keinen Zugriff haben */
const DENY_ROLES = new Set(['TenantMember', 'TenantSupport']);

/** Rolle des eingeloggten Users laden */
async function fetchViewerRole(this: IHttpRequestHelper, endpoint: string, authorization: string): Promise<string> {
	const resp = await this.helpers.httpRequest({
		method: 'POST',
		url: endpoint,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: authorization,
		},
		body: {
			query: `query Account { viewer { id role } }`,
		},
		json: true,
	});

	if ((resp as any)?.errors?.length) {
		const msg = (resp as any).errors[0]?.message || 'Failed to fetch viewer role.';
		throw new Error(msg);
	}

	const role = (resp as any)?.data?.viewer?.role as string | undefined;
	if (!role) throw new Error('Viewer role not returned.');
	return role;
}

export class UmsatzIoApi implements ICredentialType {
	name = 'umsatzIoApi';
	displayName = 'Umsatz.io API';
	documentationUrl = 'https://github.com/rjsebening/n8n-nodes-umsatzio/blob/main/CREDENTIALS.md';

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'endpoint',
			type: 'string',
			default: 'https://app.umsatz.io/api/graphql',
			placeholder: 'https://app.umsatz.io/api/graphql',
			description: 'Base URL of the Umsatz.io GraphQL API',
		},
		{
			displayName: 'Auth Mode',
			name: 'authMode',
			type: 'options',
			default: 'basicToken',
			options: [
				{ name: 'API Token (Recommended)', value: 'basicToken' },
				{ name: 'Email & Password', value: 'emailPassword' },
			],
		},

		// --- Basic Token ---
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API Token provided by Umsatz.io',
			displayOptions: { show: { authMode: ['basicToken'] } },
		},

		// --- Email/Password Login ---
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			placeholder: 'e.g. user@example.com',
			displayOptions: { show: { authMode: ['emailPassword'] } },
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authMode: ['emailPassword'] } },
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject): Promise<IDataObject> {
		const endpoint =
			(typeof credentials.endpoint === 'string' && credentials.endpoint.trim()) || 'https://app.umsatz.io/api/graphql';
		const authMode = String(credentials.authMode || 'basicToken');

		// 🔐 Nur bei Email & Password prüfen wir die Rolle
		if (authMode === 'emailPassword') {
			const email = (credentials.email as string) || '';
			const password = (credentials.password as string) || '';
			if (!email || !password) {
				throw new Error('Email & Password are required for login.');
			}

			// 1) Login
			const loginResp = await this.helpers.httpRequest({
				method: 'POST',
				url: endpoint,
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: {
					query: `mutation Login($input: IAMLoginInput!) {
						login(input: $input) { accessToken refreshToken }
					}`,
					variables: { input: { email, password } },
				},
				json: true,
			});

			if ((loginResp as any)?.errors?.length) {
				const msg = (loginResp as any).errors[0]?.message || 'Login failed.';
				throw new Error(msg);
			}

			const accessToken = (loginResp as any)?.data?.login?.accessToken as string | undefined;
			const refreshToken = (loginResp as any)?.data?.login?.refreshToken as string | undefined;

			if (!accessToken) throw new Error('Login failed – no accessToken returned.');

			// 2) Rolle prüfen
			const role = await fetchViewerRole.call(this, endpoint, `Bearer ${accessToken}`);
			if (DENY_ROLES.has(role)) {
				throw new Error(`Access denied for role "${role}". Please use an account with sufficient permissions.`);
			}

			// 3) Tokens persistieren
			return {
				accessToken,
				refreshToken: refreshToken ?? '',
				role,
			};
		}

		// 👉 basicToken: KEIN Rollencheck notwendig (nur Admins können API-Keys erstellen)
		return {};
	}

	test = {
		request: {
			method: 'POST' as const,
			url: '={{$credentials.endpoint}}',
			headers: {
				Authorization:
					'={{ $credentials.authMode === "emailPassword"' +
					' ? ($credentials.accessToken ? "Bearer " + $credentials.accessToken : "")' +
					' : ($credentials.token && ($credentials.token.toLowerCase().startsWith("basic ") || $credentials.token.toLowerCase().startsWith("bearer ")) ? $credentials.token : "Basic " + $credentials.token) }}',
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: { query: 'query __Ping { __typename }' },
			json: true,
		},
	};
}
