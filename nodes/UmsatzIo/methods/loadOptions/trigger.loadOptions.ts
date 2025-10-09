import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

export async function loadContactProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
		query ContactCards {
			cards(serviceType: contact) {
				fields { id name label columnLabel }
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const fields: any[] = (res?.cards ?? []).flatMap((c: any) => c?.fields ?? []);

	return fields
		.filter((f) => f?.name)
		.sort((a, b) =>
			String(a.columnLabel || a.label || a.name).localeCompare(String(b.columnLabel || b.label || b.name), 'de', {
				sensitivity: 'base',
			}),
		)
		.map((f) => ({
			name: f.columnLabel || f.label || f.name,
			value: String(f.name), // API-Name zurückgeben
		}));
}

export async function loadDealProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
		query DealCards {
			cards(serviceType: deal) {
				fields { id name label columnLabel }
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const fields: any[] = (res?.cards ?? []).flatMap((c: any) => c?.fields ?? []);

	return fields
		.filter((f) => f?.name)
		.sort((a, b) =>
			String(a.columnLabel || a.label || a.name).localeCompare(String(b.columnLabel || b.label || b.name), 'de', {
				sensitivity: 'base',
			}),
		)
		.map((f) => ({
			name: f.columnLabel || f.label || f.name,
			value: String(f.name),
		}));
}

export async function loadPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `query { pipelines { id name } }`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const list: any[] = res?.pipelines ?? [];
	return list.map((p) => ({ name: p.name, value: String(p.id) }));
}

export async function loadStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getNodeParameter('pipelineId', 0) as string;
	if (!pipelineId) return [{ name: 'Please Select a Pipeline First', value: '' }];

	const query = `query ($pipelineId: String!) { pipeline(pipelineId: $pipelineId) { stages { id name } } }`;
	const res: any = await gqlCall(this, { query, variables: { pipelineId } });
	const stages: any[] = res?.pipeline?.stages ?? [];
	if (!stages.length) return [{ name: 'No Stages Found in This Pipeline', value: '' }];
	return stages.map((s) => ({ name: s.name, value: String(s.id) }));
}

export async function loadForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `query { forms { id name } }`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const list: any[] = res?.forms ?? [];
	return list.filter((f) => f?.id).map((f) => ({ name: f.name || f.id, value: String(f.id) }));
}
