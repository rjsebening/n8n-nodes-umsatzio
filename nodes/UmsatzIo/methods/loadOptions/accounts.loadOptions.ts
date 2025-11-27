// n8n-nodes-umsatzio/nodes/UmsatzIo/loadOptions/accounts.loadOptions.ts
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

export async function getAccountsForReporting(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
    query Accounts($onlyPaidAccounts: Boolean) {
      accounts(onlyPaidAccounts: $onlyPaidAccounts) {
        items {
          id
          role
          profile {
            id
            email
            firstName
            lastName
          }
        }
      }
    }
  `;

	const variables = { onlyPaidAccounts: true };

	const data = await gqlCall(this, { query, variables });

	const items = data?.accounts?.items ?? [];

	const options: INodePropertyOptions[] = items.map((acc: any) => {
		const id = acc?.id as string;
		const p = acc?.profile ?? {};
		const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
		const email = (p.email || '').toString().trim();

		const baseLabel = fullName || email || id;
		const name = `${baseLabel}`;

		return { name, value: id };
	});

	return options;
}

export async function getEmailAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
		query EmailProviders {
			emailProviders {
				id
				provider
				email
				shared
				accountId
				tenantId
				__typename
			}
		}
	`;

	const data = await gqlCall(this, { query });

	const providers = data?.emailProviders ?? [];

	const options: INodePropertyOptions[] = providers.map((p: any) => {
		const id = p?.id as string;
		const email = p?.email?.toString().trim() || 'Unknown Email';
		const provider = p?.provider || '';

		const label = provider ? `${email} (${provider})` : email;

		return {
			name: label,
			value: id,
			description: provider,
		};
	});

	return options;
}

export async function getEmailSignatures(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// 1) Check AuthMode — signatures are user-owned
	let authMode = 'basicToken';
	try {
		const creds = (await this.getCredentials('umsatzIoApi')) as any;
		authMode = String(creds?.authMode || 'basicToken');
	} catch {}

	if (authMode !== 'emailPassword') {
		return [
			{
				name: 'Requires Email & Password (Login) – Switch Credentials',
				value: '',
				description: 'Email signatures are user-owned; API token cannot access them',
			},
		];
	}

	// 2) Fetch signatures in user context
	try {
		const res: any = await gqlCall(this, {
			operationName: 'EmailSignatures',
			query: `query EmailSignatures {
        emailSignatures {
          id
          name
          isDefault
        }
      }`,
		});

		const signatures = Array.isArray(res?.emailSignatures) ? res.emailSignatures : [];
		if (!signatures.length) {
			return [{ name: 'No Signatures Found', value: '' }];
		}

		// 3) Sort alphabetically
		return signatures
			.slice()
			.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'de', { sensitivity: 'base' }))
			.map((sig: any) => ({
				name: sig.isDefault ? `${sig.name} (Standard)` : sig.name,
				value: sig.id,
				description: sig.isDefault ? 'Default signature' : 'User signature',
			}));
	} catch (err: any) {
		const msg = (err?.message || 'Failed to load email signatures').toString();
		return [
			{
				name: `Error loading email signatures: ${msg}`,
				value: '',
			},
		];
	}
}
