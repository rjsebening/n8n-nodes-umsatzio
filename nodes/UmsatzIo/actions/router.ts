import { IExecuteFunctions, ApplicationError } from 'n8n-workflow';
import { handleContact } from './contact/contact.actions';
import { handleDeal } from './deal/deal.actions';
import { handleGraphQL } from './graphql/graphql.actions';
import { handleWebhook } from './webhook/webhook.actions';
import { handleActivity } from './activity/activity.actions';
import { handleReporting } from './reporting/reporting.actions';
import { handleAccounts } from './accounts/accounts.actions';

export async function route(this: IExecuteFunctions, i: number, resource: string, operation: string): Promise<unknown> {
	switch (resource) {
		case 'accounts':
			return handleAccounts.call(this, i, operation);

		case 'activity':
			return handleActivity.call(this, i, operation);

		case 'contact':
			return handleContact.call(this, i, operation);

		case 'deal':
			return handleDeal.call(this, i, operation);

		case 'graphql':
			return handleGraphQL.call(this, i, operation);

		case 'webhook':
			return handleWebhook.call(this, i, operation);

		case 'reporting':
			return handleReporting.call(this, i, operation);

		default:
			throw new ApplicationError(`Unsupported resource: ${resource}`);
	}
}
