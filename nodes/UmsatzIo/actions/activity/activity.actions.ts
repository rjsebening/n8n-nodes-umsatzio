import { IExecuteFunctions, ApplicationError, IDataObject } from 'n8n-workflow';
import { gqlCall, coerceDate } from '../../helpers/gql';
import { ensureSlateRichText, createNoteWithOptionalPin } from '../../helpers/notes';

async function getContactEmailByContactId(ctx: IExecuteFunctions, contactId: string): Promise<string> {
	const r = await gqlCall(ctx, {
		operationName: 'Contact',
		query: `query Contact($contactId: ID!) { contact(contactId: $contactId) { id data } }`,
		variables: { contactId },
	});
	return (r?.contact?.data?.global_contact_email || '').toString().trim();
}

export async function getPhoneCallActivityById(
	ctx: IExecuteFunctions,
	phoneCallActivityId: string,
): Promise<IDataObject> {
	const data = await gqlCall(ctx, {
		operationName: 'PhoneCallById',
		query: `query PhoneCallById($id: ID!) {
      PhoneCallActivity(id: $id) {
        id
        activityTime
        phoneCallResult
        phoneCallActivityType { id label category }
        parentId
        parentType
        phoneNumber
        description
        author { id profile { email firstName lastName } }
        createdAt
        updatedAt
      }
    }`,
		variables: { id: phoneCallActivityId },
	});

	const activity = data?.PhoneCallActivity ?? null;

	let descriptionParsed: unknown = activity?.description;
	if (typeof descriptionParsed === 'string') {
		try {
			descriptionParsed = JSON.parse(descriptionParsed);
		} catch {}
	}

	return {
		activity: activity ? { ...activity, descriptionParsed } : null,
		found: Boolean(activity),
	};
}

export async function handleActivity(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
	switch (operation) {
		case 'createNote': {
			const contactId = this.getNodeParameter('contactId', i) as string;

			const noteText = this.getNodeParameter('noteText', i, '') as string;
			const pinNote = this.getNodeParameter('pinNote', i, false) as boolean;
			const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;

			const noteId = await createNoteWithOptionalPin(this, contactId, noteText, pinNote, makeBold);
			return { parentType: 'contact', parentId: contactId, noteId: noteId ?? null, pinned: !!pinNote };
		}

		case 'logEmail': {
			const contactId = this.getNodeParameter('contactId', i) as string;

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
			const contactId = this.getNodeParameter('contactId', i) as string;

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
			const contactId = this.getNodeParameter('contactId', i) as string;

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
			const contactId = this.getNodeParameter('contactId', i) as string;

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

		case 'getPhoneCallActivityById': {
			const phoneCallActivityId = (this.getNodeParameter('phoneCallActivityId', i) as string).trim();
			if (!phoneCallActivityId) {
				throw new ApplicationError('Missing required parameter "phoneCallActivityId".');
			}
			return await getPhoneCallActivityById(this, phoneCallActivityId);
		}

		case 'sendEmail': {
			const emailAccountId = (this.getNodeParameter('emailAccountId', i) as string).trim();
			const subject = (this.getNodeParameter('subject', i) as string).trim();

			if (!emailAccountId) {
				throw new ApplicationError('Missing required parameter "emailAccountId".');
			}
			if (!subject) {
				throw new ApplicationError('Missing required parameter "subject".');
			}

			// Body: plain → Slate-JSON
			const plain = this.getNodeParameter('message', i, '') as string;
			const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
			let richMessage = ensureSlateRichText(plain, makeBold);

			const signatureId = (this.getNodeParameter('signatureId', i, '') as string).trim();

			if (signatureId) {
				let authMode = 'basicToken';
				try {
					const creds = (await this.getCredentials('umsatzIoApi')) as any;
					authMode = String(creds?.authMode || 'basicToken');
				} catch {}

				if (authMode !== 'emailPassword') {
					throw new ApplicationError(
						'Using an email signature requires Email & Password authentication. Please switch the Umsatz.io credentials to "Email & Password" mode.',
					);
				}

				const sigData = await gqlCall(this, {
					operationName: 'EmailSignatures',
					query: `query EmailSignatures {
            emailSignatures {
              id
              content
            }
          }`,
				});

				const signatures = (sigData?.emailSignatures ?? []) as Array<{
					id: string;
					content?: string;
				}>;

				const selected = signatures.find((s) => s.id === signatureId);

				if (!selected) {
					throw new ApplicationError(`Selected email signature with id "${signatureId}" was not found.`);
				}

				if (selected.content) {
					try {
						const msgNodes = JSON.parse(richMessage);
						const sigNodes = JSON.parse(selected.content);

						const msgArr = Array.isArray(msgNodes) ? msgNodes : [msgNodes];
						const sigArr = Array.isArray(sigNodes) ? sigNodes : [sigNodes];

						const merged = [...msgArr, ...sigArr];
						richMessage = JSON.stringify(merged);
					} catch (error) {
						throw new ApplicationError('Failed to merge email body with selected signature.', {
							cause: error as Error,
						});
					}
				}
			}

			// TO (fixedCollection → string[])
			const toCollection = this.getNodeParameter('to.recipient', i, []) as IDataObject[];
			const to = toCollection.map((r) => ((r.email as string) || '').trim()).filter((email) => email.length > 0);

			if (!to.length) {
				throw new ApplicationError('At least one recipient (field "To") is required.');
			}

			const ccCollection = this.getNodeParameter('cc.recipient', i, []) as IDataObject[];
			const cc = ccCollection.map((r) => ((r.email as string) || '').trim()).filter((email) => email.length > 0);

			const bccCollection = this.getNodeParameter('bcc.recipient', i, []) as IDataObject[];
			const bcc = bccCollection.map((r) => ((r.email as string) || '').trim()).filter((email) => email.length > 0);

			const parentType = this.getNodeParameter('parentType', i) as string; // 'contact' | 'deal'
			const parentId = (this.getNodeParameter('parentId', i) as string).trim();

			if (!parentId) {
				throw new ApplicationError('Missing required parameter "parentId".');
			}
			if (!['contact', 'deal'].includes(parentType)) {
				throw new ApplicationError(`Unsupported parentType "${parentType}". Expected "contact" or "deal".`);
			}

			const umsatzSignature = this.getNodeParameter('umsatzSignature', i, false) as boolean;

			const attachments: any[] = [];

			const mutation = `mutation SendEmailI(
								$emailAccountId: String!,
								$subject: String!,
								$message: String,
								$to: [String!]!,
								$cc: [String!],
								$bcc: [String!],
								$attachments: [EmailAttachmentInput!],
								$parentId: String!,
								$parentType: ParentType!,
								$umsatzSignature: Boolean
							) {
								sendEmail(
								input: {
									emailAccountId: $emailAccountId,
									subject: $subject,
									message: $message,
									to: $to,
									cc: $cc,
									bcc: $bcc,
									attachments: $attachments,
									parentId: $parentId,
									parentType: $parentType,
									umsatzSignature: $umsatzSignature
								}
								) {
								id
								__typename
								}
							}`;

			const variables: IDataObject = {
				emailAccountId,
				subject,
				message: richMessage, // Slate-JSON
				to,
				cc,
				bcc,
				attachments,
				parentId,
				parentType,
				umsatzSignature,
			};

			const data = await gqlCall(this, {
				operationName: 'SendEmailI',
				query: mutation,
				variables,
			});

			return data ?? {};
		}

		default:
			throw new ApplicationError(`Unsupported activity operation: ${operation}`);
	}
}
