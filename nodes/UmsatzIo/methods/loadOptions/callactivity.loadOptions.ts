// nodes/UmsatzIo/loadOptions/callactivity.loadOptions.ts
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { gqlCall } from '../../helpers/gql';

/** Call Result Mapping by Call-Type Category */
const CALL_RESULT_BY_CATEGORY: Record<string, Array<{ value: string; name: string }>> = {
	closingCall: [
		{ value: 'notReached', name: 'Not Reached' },
		{ value: 'rescheduled', name: 'Rescheduled' },
		{ value: 'cancelled', name: 'Cancelled' },
		{ value: 'sold', name: 'Sold' },
		{ value: 'notSold', name: 'Not Sold' },
	],
	settingCall: [
		{ value: 'notReached', name: 'Not Reached' },
		{ value: 'rescheduled', name: 'Rescheduled' },
		{ value: 'cancelled', name: 'Cancelled' },
		{ value: 'followUp', name: 'Follow Up' },
		{ value: 'qualified', name: 'Qualified' },
		{ value: 'scheduled', name: 'Scheduled' },
		{ value: 'unqualified', name: 'Unqualified' },
	],
	openingCall: [
		{ value: 'notReached', name: 'Not Reached' },
		{ value: 'decisionMakerWithInterestWithAppointment', name: 'Decision Maker With Interest With Appointment' },
		{ value: 'decisionMakerWithInterestWithoutAppointment', name: 'Decision Maker With Interest Without Appointment' },
		{ value: 'decisionMakerWithoutInterest', name: 'Decision Maker Without Interest' },
		{ value: 'gatekeeper', name: 'Gatekeeper' },
		{ value: 'withInterestWithAppointment', name: 'Interest with Appointment' },
		{ value: 'withInterestWithoutAppointment', name: 'Interest Without Appointment' },
		{ value: 'withoutInterest', name: 'Without Interest' },
		{
			value: 'gatekeeperAndDecisionMakerWithInterestWithAppointment',
			name: 'Gatekeeper And Decision Maker With Interest With Appointment',
		},
		{
			value: 'gatekeeperAndDecisionMakerWithInterestWithoutAppointment',
			name: 'Gatekeeper And Decision Maker With Interest Without Appointment',
		},
		{ value: 'gatekeeperAndDecisionMakerWithoutInterest', name: 'Gatekeeper And Decision Maker Without Interest' },
	],
};

function allCallResultOptions(): Array<{ value: string; name: string }> {
	const seen = new Set<string>();
	const out: Array<{ value: string; name: string }> = [];
	for (const cat of Object.keys(CALL_RESULT_BY_CATEGORY)) {
		for (const opt of CALL_RESULT_BY_CATEGORY[cat]) {
			if (!seen.has(opt.value)) {
				seen.add(opt.value);
				out.push(opt);
			}
		}
	}
	return out;
}

/** Load phone call activity types from API */
export async function loadPhoneCallActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query = `
		query GetPhoneCallActivityTypes {
			phoneCallActivityTypes {
				id
				label
				category
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const list: any[] = res?.phoneCallActivityTypes ?? [];
	return list
		.filter((t) => t?.id)
		.map((t) => ({
			name: t.label ? `${t.label} (${t.category})` : `${t.id} (${t.category})`,
			value: String(t.id),
		}));
}

/** Load call result types depending on callTypeMode + selected call type */
export async function loadCallResultTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const callTypeMode = (this.getNodeParameter('callTypeMode', 0) as 'any' | 'specific') ?? 'any';

	// ANY → show all result types
	if (callTypeMode === 'any') {
		return allCallResultOptions().map((o) => ({ name: o.name, value: o.value }));
	}

	// SPECIFIC → read selected type, get its category, map to results
	const callTypeId = this.getNodeParameter('phoneCallActivityTypeId', 0) as string;
	if (!callTypeId) {
		return [{ name: 'Please Select a Call Type First', value: '' }];
	}

	const query = `
		query GetPhoneCallActivityTypes {
			phoneCallActivityTypes {
				id
				label
				category
			}
		}
	`;
	const res: any = await gqlCall(this, { query, variables: {} });
	const list: any[] = res?.phoneCallActivityTypes ?? [];
	const hit = list.find((t) => String(t?.id) === String(callTypeId));
	const category: string | undefined = hit?.category;

	if (!category || !CALL_RESULT_BY_CATEGORY[category]) {
		return [{ name: 'No Result Types for This Call Type', value: '' }];
	}

	return CALL_RESULT_BY_CATEGORY[category].map((o) => ({ name: o.name, value: o.value }));
}
