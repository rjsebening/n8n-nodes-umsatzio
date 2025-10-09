// nodes/UmsatzIo/helpers/filters.ts
import type { IExecuteFunctions } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import { gqlCall } from './gql';

type ServiceType = 'deal' | 'contact';

type WithLoadedFilterGroupOptions = {
	/** If true, guard that credentials use email+password auth mode (user login). Default: false */
	requireEmailPassword?: boolean;
	/** Whether to deleteFilters on unload. Default: true */
	deleteFilters?: boolean;
};

/**
 * Load a CRM filter group for the current user session, run `fn`, then unload the filter group.
 * Ensures unload happens in `finally`, and can enforce Email+Password auth (Bearer) if desired.
 */
export async function withLoadedFilterGroup<T>(
	ctx: IExecuteFunctions,
	serviceType: ServiceType,
	filterGroupId: string,
	fn: () => Promise<T>,
	opts: WithLoadedFilterGroupOptions = {},
): Promise<T> {
	const { requireEmailPassword = false, deleteFilters = true } = opts;

	if (!filterGroupId) {
		throw new ApplicationError('Missing filterGroupId');
	}

	// Optional auth guard
	if (requireEmailPassword) {
		const creds = (await ctx.getCredentials('umsatzIoApi')) as any;
		const authMode = String(creds?.authMode || 'basicToken');
		if (authMode !== 'emailPassword') {
			throw new ApplicationError(
				`This operation requires Email & Password authentication (user login). API Token cannot access ${serviceType} filter groups.`,
			);
		}
	}

	let loaded = false;
	try {
		// 1) Activate filter group for the session
		await gqlCall(ctx, {
			operationName: 'LoadFilterGroup',
			query: `mutation LoadFilterGroup($id: ID!) {
        loadFilterGroup(id: $id) { id name __typename }
      }`,
			variables: { id: filterGroupId },
		});
		loaded = true;

		// 2) Run the provided function while the filter is active
		const result = await fn();
		return result;
	} finally {
		// 3) Unload the filter group (best-effort)
		if (loaded) {
			try {
				await gqlCall(ctx, {
					operationName: 'UnloadFilterGroup',
					query: `mutation UnloadFilterGroup($serviceType: ServiceType!, $deleteFilters: Boolean!) {
            unloadFilterGroup(serviceType: $serviceType, deleteFilters: $deleteFilters)
          }`,
					variables: { serviceType, deleteFilters },
				});
			} catch {
				// swallow: never block node execution on unload failure
			}
		}
	}
}
