// nodes/UmsatzIo/loadOptions/common.loadOptions.ts
import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

/** Pipelines */
export async function getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const data = await gqlCall(this, {
		operationName: 'Pipelines',
		query: `query Pipelines { pipelines { id name dealsTotal } }`,
	});
	return (data?.pipelines ?? []).map((p: any) => ({ name: p.name, value: p.id }));
}

/** Stages by selected pipeline */
export async function getStagesByPipeline(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
	if (!pipelineId) return [];
	const data = await gqlCall(this, {
		operationName: 'Pipeline',
		query: `query Pipeline($pipelineId: String!) {
      pipeline(pipelineId: $pipelineId) { stages { id name color } }
    }`,
		variables: { pipelineId },
	});
	return (data?.pipeline?.stages ?? []).map((s: any) => ({ name: s.name, value: s.id }));
}

/** Loader for Filter Groups Deals */
export async function getDealFilterGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
				description: 'Filter groups are user-owned; API token cannot access them',
			},
		];
	}

	try {
		const res: any = await gqlCall(this, {
			operationName: 'FilterGroups',
			query: `query FilterGroups($serviceType: ServiceType!) {
        filterGroups(serviceType: $serviceType) { id name shared __typename }
      }`,
			variables: { serviceType: 'deal' },
		});

		const groups = Array.isArray(res?.filterGroups) ? res.filterGroups : [];
		if (!groups.length) return [{ name: 'No Filter Groups Found', value: '' }];

		return groups
			.slice()
			.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'de', { sensitivity: 'base' }))
			.map((g: any) => ({
				name: String(g.name),
				value: String(g.id),
				description: g.shared ? 'Shared' : 'Private',
			}));
	} catch (err: any) {
		const msg = (err?.message || 'Failed to load filter groups').toString();
		return [{ name: `Error loading filter groups: ${msg}`, value: '' }];
	}
}

/** Loader for Filter Groups Contacts */
export async function getContactFilterGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
				description: 'Contact filter groups are user-owned; API token cannot access them',
			},
		];
	}

	try {
		const res: any = await gqlCall(this, {
			operationName: 'FilterGroups',
			query: `query FilterGroups($serviceType: ServiceType!) {
        filterGroups(serviceType: $serviceType) { id name shared __typename }
      }`,
			variables: { serviceType: 'contact' },
		});

		const groups = Array.isArray(res?.filterGroups) ? res.filterGroups : [];
		if (!groups.length) return [{ name: 'No Filter Groups Found', value: '' }];

		return groups
			.slice()
			.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'de', { sensitivity: 'base' }))
			.map((g: any) => ({
				name: String(g.name),
				value: String(g.id),
				description: g.shared ? 'Shared' : 'Private',
			}));
	} catch (err: any) {
		const msg = (err?.message || 'Failed to load filter groups').toString();
		return [{ name: `Error loading filter groups: ${msg}`, value: '' }];
	}
}

/** CONTACT PICKER – versteht contactSearch ODER dealContactSearch */
export async function getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rawSearch =
		(this.getCurrentNodeParameter('contactSearch') as string) ||
		(this.getCurrentNodeParameter('dealContactSearch') as string) ||
		'';
	const term = rawSearch.trim();
	const hasSearch = term.length > 0;

	const limit = hasSearch ? 50 : 20;
	const page = 0;
	const qSearch = hasSearch ? JSON.stringify(term) : '';

	const query = hasSearch
		? `query Contacts {
         contacts(searchString: ${qSearch}, pagination: { page: ${page}, limit: ${limit} }) {
           data { id data }
           pagination { page limit total }
         }
       }`
		: `query Contacts {
         contacts(pagination: { page: ${page}, limit: ${limit} }) {
           data { id data }
           pagination { page limit total }
         }
       }`;

	const data = await gqlCall(this, { operationName: 'Contacts', query, variables: {} });

	const list = data?.contacts?.data ?? [];
	if (!Array.isArray(list) || list.length === 0) {
		return [{ name: hasSearch ? 'No contacts found (adjust search)' : 'No contacts found', value: '' }];
	}

	const out: INodePropertyOptions[] = [];
	for (const c of list) {
		const d = c?.data || {};
		const first = (d.global_contact_firstName || '').toString().trim();
		const last = (d.global_contact_lastName || '').toString().trim();
		const email = (d.global_contact_email || '').toString().trim();
		const full = `${first} ${last}`.trim();
		const label = [full || undefined, email ? `<${email}>` : undefined].filter(Boolean).join(' ') || c.id;
		out.push({ name: label, value: c.id, description: email || undefined });
	}
	return out;
}

/** DEAL PICKER – versteht dealSearch ODER dealContactSearch; kann optional nach contactId einschränken */
export async function getDeals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const op = (this.getCurrentNodeParameter('operation') as string) || '';
	const restrictContactId = (this.getCurrentNodeParameter('contactId') as string) || '';

	// Bei diesen Ops braucht man erst den Kontakt
	const needsContactFirst = ['logEmail', 'listDealEmailActivities', 'listDealPhoneCallActivities'];
	if (needsContactFirst.includes(op) && !restrictContactId) {
		return [{ name: 'Please Select a Contact First', value: '' }];
	}

	// Suchfeld aus beiden möglichen Parametern holen
	const rawSearch =
		(this.getCurrentNodeParameter('dealSearch') as string) ||
		(this.getCurrentNodeParameter('dealContactSearch') as string) ||
		'';
	const term = rawSearch.trim().toLowerCase();
	const hasSearch = term.length > 0;

	// 1) Wenn ein Kontakt gewählt ist, Deals direkt vom Kontakt holen (keine N+1)
	if (restrictContactId) {
		const resp: any = await gqlCall(this, {
			operationName: 'ContactDeals',
			query: `query ContactDeals($contactId: ID!) {
        contact(contactId: $contactId) {
          id
          deals {
            id
            name
            pipeline { id name }
            stage { id name }
          }
        }
      }`,
			variables: { contactId: restrictContactId },
		});

		let deals: any[] = resp?.contact?.deals ?? [];
		if (hasSearch) {
			deals = deals.filter((d) =>
				String(d?.name || '')
					.toLowerCase()
					.includes(term),
			);
		}
		if (!deals.length) return [{ name: 'No Deals Found for Contact', value: '' }];

		return deals.map((d) => {
			const pipe = d?.pipeline?.name ? ` • ${d.pipeline.name}` : '';
			const stage = d?.stage?.name ? ` › ${d.stage.name}` : '';
			return { name: `${d.name}${pipe}${stage}`, value: String(d.id) };
		});
	}

	// 2) Globale Deals-Suche (erste Seite reicht für Picker)
	const page = 0;
	const limit = hasSearch ? 50 : 20;
	const qSearch = hasSearch ? JSON.stringify(term) : '';

	const query = hasSearch
		? `query Deals {
         deals(searchString: ${qSearch}, pagination: { page: ${page}, limit: ${limit} }) {
           data { id name pipeline { id name } stage { id name } }
           pagination { page limit total }
         }
       }`
		: `query Deals {
         deals(pagination: { page: ${page}, limit: ${limit} }) {
           data { id name pipeline { id name } stage { id name } }
           pagination { page limit total }
         }
       }`;

	const data = await gqlCall(this, { operationName: 'Deals', query, variables: {} });
	const rows: any[] = data?.deals?.data ?? [];
	if (!rows.length) return [{ name: hasSearch ? 'No deals found (adjust search)' : 'No deals found', value: '' }];

	return rows.map((d) => {
		const pipe = d?.pipeline?.name ? ` • ${d.pipeline.name}` : '';
		const stage = d?.stage?.name ? ` › ${d.stage.name}` : '';
		return {
			name: `${d.name}${pipe}${stage}`,
			value: String(d.id),
			description: d?.pipeline?.name && d?.stage?.name ? `${d.pipeline.name} / ${d.stage.name}` : undefined,
		};
	});
}
