import { IExecuteFunctions, ApplicationError } from 'n8n-workflow';
import { gqlCall } from './gql';

export function ensureSlateRichText(input: string, bold?: boolean): string {
	const trimmed = (input ?? '').trim();
	if (!trimmed) {
		return JSON.stringify([{ type: 'paragraph', children: [{ text: '' }] }]);
	}
	if (trimmed.startsWith('[') || trimmed.startsWith('{')) return trimmed;

	const node = [{ type: 'paragraph', children: [bold ? { text: trimmed, bold: true } : { text: trimmed }] }];
	return JSON.stringify(node);
}

export async function createNoteWithOptionalPin(
	ctx: IExecuteFunctions,
	parentId: string,
	plainTextOrSlate: string,
	pin: boolean,
	makeBold?: boolean,
) {
	if (!parentId?.trim()) throw new ApplicationError('createNoteWithOptionalPin: parentId is required');

	const description = ensureSlateRichText(plainTextOrSlate, makeBold);

	const created = await gqlCall(ctx, {
		operationName: 'CreateNote',
		query: `mutation CreateNote($parentId: String!, $description: String!) {
			createNote(input: { parentId: $parentId, description: $description }) { id __typename }
		}`,
		variables: { parentId, description },
	});

	const noteId = created?.createNote?.id as string | undefined;

	if (pin && noteId) {
		try {
			await gqlCall(ctx, {
				operationName: 'pinNote',
				query: `mutation pinNote($noteId: ID!) {
					pinNote(noteId: $noteId, isPinned: true) { id __typename }
				}`,
				variables: { noteId },
			});
		} catch {
		}
	}
	return noteId;
}
