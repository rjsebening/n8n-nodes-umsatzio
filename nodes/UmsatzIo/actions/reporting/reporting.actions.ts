// nodes/UmsatzIo/actions/reporting/reporting.actions.ts
import type { IExecuteFunctions } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

const LIST_TYPES_QUERY = `
  query GetPhoneCallActivityTypes {
    phoneCallActivityTypes { id label category }
  }
`;

const OPENING_QUERY = `
  query OpeningCallReports($accountIds: [ID!], $phoneCallActivityTypeId: ID!, $fromDate: DateTime!, $toDate: DateTime!) {
    openingCallReports(
      accountIds: $accountIds
      phoneCallActivityTypeId: $phoneCallActivityTypeId
      fromDate: $fromDate
      toDate: $toDate
    ) {
      total {
        callAttempts
        gatekeeper
        decisionMaker { gatekeeperFirst reachedDirectly __typename }
        expressedInterest { gatekeeperFirst reachedDirectly __typename }
        terminated { reachedDirectly gatekeeperFirst __typename }
        __typename
      }
      reports {
        callAttempts
        gatekeeper
        decisionMaker { gatekeeperFirst reachedDirectly __typename }
        expressedInterest { gatekeeperFirst reachedDirectly __typename }
        terminated { reachedDirectly gatekeeperFirst __typename }
        account { id profile { firstName lastName __typename } __typename }
        __typename
      }
      kpiThresholds(phoneCallActivityTypeId: $phoneCallActivityTypeId) {
        reachabilityRate
        gatekeeperTransferRate
        decisionMakerConversionRate
        interestExpressionRate
        __typename
      }
      __typename
    }
  }
`;

const SETTING_QUERY = `
  query SettingCallReports($accountIds: [ID!], $phoneCallActivityTypeId: ID!, $fromDate: DateTime!, $toDate: DateTime!) {
    settingCallReports(
      accountIds: $accountIds
      phoneCallActivityTypeId: $phoneCallActivityTypeId
      fromDate: $fromDate
      toDate: $toDate
    ) {
      total {
        notOccurred { notReached rescheduled cancelled __typename }
        occurred { followUp qualified scheduled unqualified __typename }
        __typename
      }
      reports {
        notOccurred { notReached rescheduled cancelled __typename }
        occurred { followUp qualified scheduled unqualified __typename }
        account { id profile { firstName lastName __typename } __typename }
        __typename
      }
      kpiThresholds(phoneCallActivityTypeId: $phoneCallActivityTypeId) {
        noShowRate
        qualificationRate
        qualificationTotalRate
        conversionRate
        __typename
      }
      __typename
    }
  }
`;

const CLOSING_QUERY = `
  query ClosingCallReports($accountIds: [ID!], $phoneCallActivityTypeId: ID!, $fromDate: DateTime!, $toDate: DateTime!) {
    closingCallReports(
      accountIds: $accountIds
      phoneCallActivityTypeId: $phoneCallActivityTypeId
      fromDate: $fromDate
      toDate: $toDate
    ) {
      total {
        notOccurred { notReached rescheduled cancelled __typename }
        occurred { sold notSold __typename }
        __typename
      }
      reports {
        notOccurred { notReached rescheduled cancelled __typename }
        occurred { sold notSold __typename }
        account { id profile { firstName lastName __typename } __typename }
        __typename
      }
      kpiThresholds(phoneCallActivityTypeId: $phoneCallActivityTypeId) {
        noShowRate
        completionRate
        closingRate
        __typename
      }
      __typename
    }
  }
`;

type CallCategory = 'openingCall' | 'settingCall' | 'closingCall';

function pickQuery(category: CallCategory) {
	switch (category) {
		case 'openingCall':
			return { key: 'openingCallReports', opName: 'OpeningCallReports', query: OPENING_QUERY };
		case 'settingCall':
			return { key: 'settingCallReports', opName: 'SettingCallReports', query: SETTING_QUERY };
		case 'closingCall':
			return { key: 'closingCallReports', opName: 'ClosingCallReports', query: CLOSING_QUERY };
		default:
			throw new ApplicationError(`Unsupported call category: ${category}`);
	}
}

function flattenOpening(res: any, ctx: { fromDate: string; toDate: string; phoneCallActivityTypeId: string }) {
	const out: any[] = [];
	if (res?.total) {
		out.push({
			json: {
				rowType: 'total',
				...ctx,
				callAttempts: res.total.callAttempts,
				gatekeeper: res.total.gatekeeper,
				decisionMaker_gatekeeperFirst: res.total.decisionMaker?.gatekeeperFirst ?? null,
				decisionMaker_reachedDirectly: res.total.decisionMaker?.reachedDirectly ?? null,
				expressedInterest_gatekeeperFirst: res.total.expressedInterest?.gatekeeperFirst ?? null,
				expressedInterest_reachedDirectly: res.total.expressedInterest?.reachedDirectly ?? null,
				terminated_reachedDirectly: res.total.terminated?.reachedDirectly ?? null,
				terminated_gatekeeperFirst: res.total.terminated?.gatekeeperFirst ?? null,
				kpiThresholds: res.kpiThresholds ?? null,
			},
		});
	}
	for (const r of res?.reports ?? []) {
		const p = r?.account?.profile ?? {};
		out.push({
			json: {
				rowType: 'account',
				accountId: r?.account?.id ?? null,
				accountName: [p.firstName, p.lastName].filter(Boolean).join(' ') || null,
				...ctx,
				callAttempts: r.callAttempts,
				gatekeeper: r.gatekeeper,
				decisionMaker_gatekeeperFirst: r.decisionMaker?.gatekeeperFirst ?? null,
				decisionMaker_reachedDirectly: r.decisionMaker?.reachedDirectly ?? null,
				expressedInterest_gatekeeperFirst: r.expressedInterest?.gatekeeperFirst ?? null,
				expressedInterest_reachedDirectly: r.expressedInterest?.reachedDirectly ?? null,
				terminated_reachedDirectly: r.terminated?.reachedDirectly ?? null,
				terminated_gatekeeperFirst: r.terminated?.gatekeeperFirst ?? null,
			},
		});
	}
	return out;
}

function flattenSettingOrClosing(
	res: any,
	ctx: { fromDate: string; toDate: string; phoneCallActivityTypeId: string },
	variant: 'setting' | 'closing',
) {
	const out: any[] = [];
	const total = res?.total;
	if (total) {
		out.push({
			json: {
				rowType: 'total',
				...ctx,
				notOccurred_notReached: total?.notOccurred?.notReached ?? null,
				notOccurred_rescheduled: total?.notOccurred?.rescheduled ?? null,
				notOccurred_cancelled: total?.notOccurred?.cancelled ?? null,
				occurred_followUp: total?.occurred?.followUp ?? null,
				occurred_qualified: total?.occurred?.qualified ?? null,
				occurred_scheduled: total?.occurred?.scheduled ?? null,
				occurred_unqualified: total?.occurred?.unqualified ?? null,
				occurred_sold: total?.occurred?.sold ?? null,
				occurred_notSold: total?.occurred?.notSold ?? null,
				kpiThresholds: res?.kpiThresholds ?? null,
				variant,
			},
		});
	}
	for (const r of res?.reports ?? []) {
		const p = r?.account?.profile ?? {};
		out.push({
			json: {
				rowType: 'account',
				accountId: r?.account?.id ?? null,
				accountName: [p.firstName, p.lastName].filter(Boolean).join(' ') || null,
				...ctx,
				notOccurred_notReached: r?.notOccurred?.notReached ?? null,
				notOccurred_rescheduled: r?.notOccurred?.rescheduled ?? null,
				notOccurred_cancelled: r?.notOccurred?.cancelled ?? null,
				occurred_followUp: r?.occurred?.followUp ?? null,
				occurred_qualified: r?.occurred?.qualified ?? null,
				occurred_scheduled: r?.occurred?.scheduled ?? null,
				occurred_unqualified: r?.occurred?.unqualified ?? null,
				occurred_sold: r?.occurred?.sold ?? null,
				occurred_notSold: r?.occurred?.notSold ?? null,
				variant,
			},
		});
	}
	return out;
}

export async function callReports(this: IExecuteFunctions, i: number) {
	const phoneCallActivityTypeId = this.getNodeParameter('phoneCallActivityTypeId', i) as string;
	const accountIds = (this.getNodeParameter('accountIds', i, []) as string[]) || [];
	const fromDate = this.getNodeParameter('fromDate', i) as string;
	const toDate = this.getNodeParameter('toDate', i) as string;
	const returnMode = (this.getNodeParameter('returnMode', i, 'raw') as 'raw' | 'flattened') || 'raw';

	// 1) Kategorie lookup via Liste (vermeidet unknown single-lookup)
	const listRes: any = await gqlCall(this, { query: LIST_TYPES_QUERY, variables: {} });
	const list: any[] = listRes?.phoneCallActivityTypes ?? [];
	const hit = list.find((t) => String(t?.id) === String(phoneCallActivityTypeId));
	const category = hit?.category as CallCategory | undefined;
	if (!category) {
		throw new ApplicationError(`Unknown phoneCallActivityTypeId or missing category: ${phoneCallActivityTypeId}`);
	}

	// 2) Query + korrekten operationName wählen
	const { key, opName, query } = pickQuery(category);

	// 3) Variables bauen – accountIds nur setzen, wenn non-empty
	const variables: Record<string, any> = {
		phoneCallActivityTypeId,
		fromDate,
		toDate,
	};
	if (Array.isArray(accountIds) && accountIds.length) {
		variables.accountIds = accountIds;
	}

	const data = await gqlCall(this, { operationName: opName, query, variables });
	const payload = data?.[key];

	if (returnMode === 'raw') {
		return [{ json: { category, ...payload } }];
	}

	const ctx = { fromDate, toDate, phoneCallActivityTypeId };
	if (category === 'openingCall') return flattenOpening(payload, ctx);
	if (category === 'settingCall') return flattenSettingOrClosing(payload, ctx, 'setting');
	return flattenSettingOrClosing(payload, ctx, 'closing');
}

export async function handleReporting(this: IExecuteFunctions, i: number, operation: string) {
	switch (operation) {
		case 'callReports':
			return callReports.call(this, i);
		default:
			throw new ApplicationError(`Unsupported reporting operation: ${operation}`);
	}
}
