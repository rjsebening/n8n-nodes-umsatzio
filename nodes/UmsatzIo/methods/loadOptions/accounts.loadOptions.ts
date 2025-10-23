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
