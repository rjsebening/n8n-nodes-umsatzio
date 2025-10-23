// nodes/UmsatzIo/actions/accounts/accounts.actions.ts
import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

const GQL_GET_ALL_USERS = /* GraphQL */ `
	query Accounts {
		accounts {
			totalCount
			items {
				...Account
				__typename
			}
			__typename
		}
	}

	fragment Account on Account {
		id
		role
		createdAt
		deletedAt
		profile {
			id
			email
			firstName
			lastName
			avatarUrl
			isEmailBrandingEnabled
			__typename
		}
		__typename
	}
`;

const GQL_GET_ACCOUNT_BY_ID = /* GraphQL */ `
	query GetAccountById($filter: IAMAccountsFilterInput) {
		accounts(filter: $filter) {
			items {
				...Account
				__typename
			}
			__typename
		}
	}

	fragment Account on Account {
		id
		role
		createdAt
		deletedAt
		profile {
			id
			email
			firstName
			lastName
			avatarUrl
			isEmailBrandingEnabled
			__typename
		}
		__typename
	}
`;

/**
 * Get All Users (no filter)
 */
export async function accountsGetAllUsers(this: IExecuteFunctions, itemIndex: number): Promise<INodeExecutionData[]> {
	const data: any = await gqlCall(this, {
		operationName: 'Accounts',
		query: GQL_GET_ALL_USERS,
		variables: {},
	});

	const items = Array.isArray(data?.accounts?.items) ? (data.accounts.items as IDataObject[]) : [];
	return this.helpers.returnJsonArray(items);
}

/**
 * Get User by ID
 */
export async function accountsGetUserById(this: IExecuteFunctions, itemIndex: number): Promise<INodeExecutionData[]> {
	const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
	if (!accountId) {
		throw new Error('Please provide an Account ID.');
	}

	const data: any = await gqlCall(this, {
		operationName: 'GetAccountById',
		query: GQL_GET_ACCOUNT_BY_ID,
		variables: { filter: { accountIds: [accountId] } },
	});

	const items = Array.isArray(data?.accounts?.items) ? (data.accounts.items as IDataObject[]) : [];
	return this.helpers.returnJsonArray(items);
}

/* Router-Handler */
export async function handleAccounts(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	switch (operation) {
		case 'getAllUsers':
			return accountsGetAllUsers.call(this, i);
		case 'getUserById':
			return accountsGetUserById.call(this, i);
		default:
			throw new Error(`Unsupported operation for resource "accounts": ${operation}`);
	}
}
