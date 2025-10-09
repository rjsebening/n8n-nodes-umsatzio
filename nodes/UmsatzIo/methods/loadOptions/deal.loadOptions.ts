import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

/**
 * Deal-Picker:
 * - optionaler Filter: dealSearch (Update/GetById/ChangeStage)
 * - optionaler Filter: dealContactSearch + contactId (Activities/LogEmail)
 * - wenn contactId vorhanden -> lade Deals über Contact.deals
 * - sonst -> globale Deals-Suche mit Pagination
 */
export async function getDeals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// Suchparameter robust lesen (verschiedene Ops verwenden unterschiedliche Feldnamen)
	let search = '';
	try {
		search = (this.getNodeParameter('dealSearch', 0) as string) || '';
	} catch {}
	try {
		if (!search) search = (this.getNodeParameter('dealContactSearch', 0) as string) || '';
	} catch {}

	// optional: vorgewählter Kontakt (bei Activities / LogEmail-Flow)
	let contactId = '';
	try {
		contactId = (this.getNodeParameter('contactId', 0) as string) || '';
	} catch {}

	// 1) Wenn contactId gesetzt -> Deals direkt am Kontakt holen
	if (contactId) {
		const resp: any = await gqlCall(this, {
			operationName: 'ContactDeals',
			query: `query ContactDeals($contactId: ID!) {
        contact(contactId: $contactId) {
          id
          deals { id name pipeline { id name } stage { id name } }
        }
      }`,
			variables: { contactId },
		});

		const deals: Array<any> = resp?.contact?.deals ?? [];
		if (!deals.length) return [{ name: 'No Deals Found for Contact', value: '__no_deals__' }];

		// optional clientseitiger Name-Filter
		const needle = search.toLowerCase();
		const filtered = needle
			? deals.filter((d) =>
					String(d?.name || '')
						.toLowerCase()
						.includes(needle),
				)
			: deals;

		if (!filtered.length) return [{ name: 'No Matching Deals', value: '__no_deals__' }];

		return filtered.map((d) => {
			const pipe = d?.pipeline?.name ? ` • ${d.pipeline.name}` : '';
			const stage = d?.stage?.name ? ` › ${d.stage.name}` : '';
			return { name: `${d.name}${pipe}${stage}`, value: String(d.id) };
		});
	}

	// 2) Globale Deals-Suche mit Pagination (einfach: erste Seite)
	const page = 0;
	const limit = 50;
	const qSearch = JSON.stringify(search);

	const res: any = await gqlCall(this, {
		operationName: 'Deals',
		query: `query Deals {
      deals(pagination: { page: ${page}, limit: ${limit} }, searchString: ${qSearch}) {
        data { id name pipeline { id name } stage { id name } }
        pagination { page limit total }
      }
    }`,
	});

	const rows: any[] = res?.deals?.data ?? [];
	if (!rows.length) return [{ name: 'No Deals Found', value: '__no_deals__' }];

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
