import { IExecuteFunctions, ApplicationError, IDataObject } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

export async function handleGraphQL(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	switch (operation) {
		case 'raw': {
			const query = this.getNodeParameter('query', i) as string;

			let variables = this.getNodeParameter('variables', i, {}) as IDataObject;
			try {
				variables = JSON.parse(JSON.stringify(variables ?? {}));
			} catch {
				variables = {};
			}

			const operationNameRaw = this.getNodeParameter('operationName', i, '') as string;
			const operationName =
				operationNameRaw && operationNameRaw.trim().length > 0 ? operationNameRaw.trim() : undefined;

			return gqlCall(this, { query, variables, operationName });
		}

		default:
			throw new ApplicationError(`Unsupported graphql operation: ${operation}`);
	}
}
