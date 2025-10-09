// nodes/UmsatzIo/actions/activity.actions.ts
import { IExecuteFunctions, ApplicationError, IDataObject } from 'n8n-workflow';
import { gqlCall, coerceDate } from '../../helpers/gql';
import { ensureSlateRichText, createNoteWithOptionalPin } from '../../helpers/notes'; // nodes/UmsatzIo/actions/activity.actions.ts

async function getContactEmailByContactId(ctx: IExecuteFunctions, contactId: string): Promise<string> {
	const r = await gqlCall(ctx, {
		operationName: 'Contact',
		query: `query Contact($contactId: ID!) { contact(contactId: $contactId) { id data } }`,
		variables: { contactId },
	});
	return (r?.contact?.data?.global_contact_email || '').toString().trim();
}

export async function handleActivity(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	const contactId = this.getNodeParameter('contactId', i) as string;

	switch (operation) {
		case 'createNote': {
			const noteText = this.getNodeParameter('noteText', i, '') as string;
			const pinNote = this.getNodeParameter('pinNote', i, false) as boolean;
			const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;

			const noteId = await createNoteWithOptionalPin(this, contactId, noteText, pinNote, makeBold);
			return { parentType: 'contact', parentId: contactId, noteId: noteId ?? null, pinned: !!pinNote };
		}

		case 'logEmail': {
			const activityTimeRaw = this.getNodeParameter('activityTime', i) as string;
			const plain = this.getNodeParameter('description', i, '') as string;
			const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;

			const email = await getContactEmailByContactId(this, contactId);
			if (!email) throw new ApplicationError(`Contact ${contactId}: global_contact_email is not set.`);

			const variables: IDataObject = {
				parentId: contactId,
				parentType: 'contact',
				activityTime: await coerceDate(activityTimeRaw, 'activityTime'),
				email,
				description: ensureSlateRichText(plain, makeBold),
			};

			const data = await gqlCall(this, {
				operationName: 'CreateEmailActivity',
				query: `mutation CreateEmailActivity(
          $parentId: String!
          $description: String
          $activityTime: DateTime!
          $parentType: ParentType!
          $email: String
        ) {
          createEmailActivity(
            input: {
              parentId: $parentId
              parentType: $parentType
              description: $description
              activityTime: $activityTime
              emailAddress: $email
            }
          ) { id __typename }
        }`,
				variables,
			});

			return data?.createEmailActivity ?? {};
		}

		case 'listEmailActivities': {
			const page = this.getNodeParameter('page', i, 0) as number;
			const limit = this.getNodeParameter('limit', i, 50) as number;

			const data = await gqlCall(this, {
				operationName: 'ContactEmailActivities',
				query: `query ContactEmailActivities($contactId: ID!, $pagination: PaginationInput!) {
          contactEmailActivities(contactId: $contactId, pagination: $pagination) {
            activities { id description activityTime emailAddress subject from to cc bcc status createdAt updatedAt }
            pagination { page limit total }
          }
        }`,
				variables: { contactId, pagination: { page, limit } },
			});

			return {
				scope: 'contact',
				parentId: contactId,
				activities: data?.contactEmailActivities?.activities ?? [],
				pagination: data?.contactEmailActivities?.pagination,
			};
		}

		case 'listPhoneCallActivities': {
			const page = this.getNodeParameter('page', i, 0) as number;
			const limit = this.getNodeParameter('limit', i, 50) as number;

			const data = await gqlCall(this, {
				operationName: 'ContactPhoneCallActivities',
				query: `query ContactPhoneCallActivities($contactId: ID!, $pagination: PaginationInput!) {
          contactPhoneCallActivities(contactId: $contactId, pagination: $pagination) {
            activities {
              data {
                id description activityTime phoneCallResult phoneCallActivityTypeId phoneNumber parentType createdAt updatedAt isPinned
                author { id createdAt deletedAt profile { id email firstName lastName } }
                phoneCallActivityType { id domainType label category }
              }
              pagination { page limit total }
            }
            pinnedActivities {
              id description activityTime phoneCallResult phoneCallActivityTypeId phoneNumber parentType createdAt updatedAt isPinned
              author { id createdAt deletedAt profile { id email firstName lastName } }
              phoneCallActivityType { id domainType label category }
            }
          }
        }`,
				variables: { contactId, pagination: { page, limit } },
			});

			return {
				scope: 'contact',
				parentId: contactId,
				activities: data?.contactPhoneCallActivities?.activities?.data ?? [],
				pagination: data?.contactPhoneCallActivities?.activities?.pagination,
				pinned: data?.contactPhoneCallActivities?.pinnedActivities ?? [],
			};
		}

		case 'listNotes': {
			const page = this.getNodeParameter('page', i, 0) as number;
			const limit = this.getNodeParameter('limit', i, 50) as number;

			const data = await gqlCall(this, {
				operationName: 'ContactNotes',
				query: `query ContactNotes($contactId: ID!, $pagination: PaginationInput!) {
          contactNotes(contactId: $contactId, pagination: $pagination) {
            notes {
              data { id description isPinned createdAt updatedAt }
              pagination { page limit total }
            }
            pinnedNotes { id description isPinned createdAt updatedAt }
            count
          }
        }`,
				variables: { contactId, pagination: { page, limit } },
			});

			return {
				scope: 'contact',
				parentId: contactId,
				notes: data?.contactNotes?.notes?.data ?? [],
				pagination: data?.contactNotes?.notes?.pagination,
				pinned: data?.contactNotes?.pinnedNotes ?? [],
				count: data?.contactNotes?.count ?? 0,
			};
		}

		default:
			throw new ApplicationError(`Unsupported activity operation: ${operation}`);
	}
}
