import { IExecuteFunctions, ApplicationError, IDataObject } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

export async function handleWebhook(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	switch (operation) {
		case 'listWebhooks': {
			const data = await gqlCall(this, {
				operationName: 'GetWebhooks',
				query: `query GetWebhooks { webhooks { id url triggers } }`,
				variables: {},
			});
			return { webhooks: data?.webhooks ?? [] };
		}

		case 'createWebhook': {
			const url = this.getNodeParameter('url', i) as string;
			const triggers = this.getNodeParameter('triggers', i) as string[];
			let properties = this.getNodeParameter('properties', i, []) as string[];

			// Falls updateDealStage gewählt → pipelineId + stageId in properties
			/*if (triggers?.includes('updateDealStage')) {
				const pipelineId = this.getNodeParameter('pipelineId', i, '') as string;
				const stageId = this.getNodeParameter('stageId', i, '') as string;
				if (pipelineId) properties = [...properties, pipelineId];
				if (stageId) properties = [...properties, stageId];
			}*/

			if (triggers?.includes('updateDealStage')) {
				const scope = (this.getNodeParameter('dealStageScope', i, 'all') as 'all' | 'specific') ?? 'all';
				if (scope === 'specific') {
					const pipelineId = (this.getNodeParameter('pipelineId', i, '') as string) || '';
					const stageId = (this.getNodeParameter('stageId', i, '') as string) || '';
					if (!pipelineId) throw new ApplicationError('updateDealStage requires a pipeline.');
					if (!stageId) throw new ApplicationError('updateDealStage requires a stage.');
					properties = [...properties, pipelineId, stageId];
				}
			}

			// Falls submitForm gewählt → formIds in properties
			if (triggers?.includes('submitForm')) {
				const formIds = this.getNodeParameter('formIds', i, []) as string[];
				if (Array.isArray(formIds) && formIds.length) {
					properties = [...properties, ...formIds];
				}
			}

			const input: IDataObject = { url, triggers };
			if (Array.isArray(properties) && properties.length) input.properties = properties;

			const data = await gqlCall(this, {
				operationName: 'CreateWebhook',
				query: `mutation CreateWebhook($input: CreateWebhookInput!) {
					createWebhook(input: $input) { id url triggers }
				}`,
				variables: { input },
			});
			return data?.createWebhook ?? {};
		}

		case 'updateWebhook': {
			const id = this.getNodeParameter('webhookId', i) as string;
			const url = this.getNodeParameter('url', i, '') as string;
			const triggers = this.getNodeParameter('triggers', i, []) as string[];
			let properties = this.getNodeParameter('properties', i, []) as string[];

			if (Array.isArray(triggers) && triggers.length) {
				/*if (triggers.includes('updateDealStage')) {
					const pipelineId = this.getNodeParameter('pipelineId', i, '') as string;
					const stageId = this.getNodeParameter('stageId', i, '') as string;
					if (pipelineId) properties = [...properties, pipelineId];
					if (stageId) properties = [...properties, stageId];
				}*/

				if (triggers.includes('updateDealStage')) {
					const scope = (this.getNodeParameter('dealStageScope', i, 'all') as 'all' | 'specific') ?? 'all';
					if (scope === 'specific') {
						const pipelineId = (this.getNodeParameter('pipelineId', i, '') as string) || '';
						const stageId = (this.getNodeParameter('stageId', i, '') as string) || '';
						if (!pipelineId) throw new ApplicationError('updateDealStage requires a pipeline.');
						if (!stageId) throw new ApplicationError('updateDealStage requires a stage.');
						properties = [...properties, pipelineId, stageId];
					}
				}

				if (triggers.includes('submitForm')) {
					const formIds = this.getNodeParameter('formIds', i, []) as string[];
					if (Array.isArray(formIds) && formIds.length) {
						properties = [...properties, ...formIds];
					}
				}
			}

			const input: IDataObject = {};
			if (url) input.url = url;
			if (Array.isArray(triggers) && triggers.length) input.triggers = triggers;
			if (Array.isArray(properties) && properties.length) input.properties = properties;

			const data = await gqlCall(this, {
				operationName: 'UpdateWebhook',
				query: `mutation UpdateWebhook($id: ID!, $input: UpdateWebhookInput!) {
					updateWebhook(id: $id, input: $input) { id url triggers }
				}`,
				variables: { id, input },
			});
			return data?.updateWebhook ?? {};
		}

		case 'deleteWebhook': {
			const id = this.getNodeParameter('webhookId', i) as string;

			const data = await gqlCall(this, {
				operationName: 'DeleteWebhook',
				query: `mutation DeleteWebhook($id: ID!) {
					deleteWebhook(id: $id) { id url triggers }
				}`,
				variables: { id },
			});
			return { deleted: data?.deleteWebhook ?? null };
		}

		default:
			throw new ApplicationError(`Unsupported webhook operation: ${operation}`);
	}
}
