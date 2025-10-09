import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeExecutionData,
	INodeInputConfiguration,
	INodeOutputConfiguration,
} from 'n8n-workflow';

import { resourceSelector } from './actions/resource.selector';
import { contactOperations, contactFields } from './actions/contact';
import { dealOperations, dealFields } from './actions/deal';
import { graphQLOperations, graphQLFields } from './actions/graphql';
import { webhookOperations, webhookFields } from './actions/webhook';
import { activityOperations, activityFields } from './actions/activity';

import * as Loaders from './methods/loadOptions';

import {
	getContactResourceMapperFields,
	getContactResourceMapperFieldsForUpdate,
} from './methods/resourceMappers/contact.resourceMapper';
import {
	getDealResourceMapperFields,
	getDealResourceMapperFieldsForUpdate,
} from './methods/resourceMappers/deal.resourceMapper';

import { route } from './actions/router';

export class UmsatzIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Umsatz.io',
		name: 'umsatzIo',
		icon: {
			light: 'file:light-icon.svg',
			dark: 'file:dark-icon.svg',
		},
		group: ['transform'],
		version: 1,
		description: 'Interact with Umsatz.io API (powered by agentur-systeme.de)',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Umsatz.io',
			// @ts-expect-error free-form description
			description: 'Interact with Umsatz.io API (powered by agentur-systeme.de)',
		},
		inputs: [{ type: 'main' } as INodeInputConfiguration],
		outputs: [{ type: 'main' } as INodeOutputConfiguration],
		credentials: [{ name: 'umsatzIoApi', required: true }],
		properties: [
			resourceSelector,

			// Activity
			...activityOperations,
			...activityFields,

			// Contact
			...contactOperations,
			...contactFields,

			// Deal
			...dealOperations,
			...dealFields,

			// GraphQL (raw passthrough)
			...graphQLOperations,
			...graphQLFields,

			// Webhook
			...webhookOperations,
			...webhookFields,
		],
	};

	methods = {
		loadOptions: {
			...Loaders.commonLoaders,
			...Loaders.contactLoaders,
			...Loaders.dealLoaders,
			...Loaders.webhookLoaders,
			...Loaders.phoneCallLoaders,
			/*getPhoneCallActivityTypes: loadPhoneCallActivityTypes,
			getCallResultTypes: loadCallResultTypes,
			getDeals,*/
		},
		resourceMapping: {
			getContactResourceMapperFields,
			getContactResourceMapperFieldsForUpdate,
			getDealResourceMapperFields,
			getDealResourceMapperFieldsForUpdate,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			const result = (await route.call(this, i, resource, operation)) as unknown;

			if (Array.isArray(result)) {
				for (const entry of result) {
					returnData.push(entry as IDataObject);
				}
			} else if (result && typeof result === 'object') {
				returnData.push(result as IDataObject);
			} else {
				returnData.push({ result } as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
