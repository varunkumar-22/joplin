import Note from '../../models/Note';
import BaseItem from '../../models/BaseItem';
import ConflictNoteState from '../../models/ConflictNoteState';
import Setting from '../../models/Setting';
import ItemChange from '../../models/ItemChange';
import { ModelType } from '../../BaseModel';
import { itemIsReadOnlySync } from '../../models/utils/readOnly';
import { NoteEntity } from '../database/types';
import { MergedSection, twoWayDiff } from './diffNotes';
import isConflictResolutionEnabled from './isConflictResolutionEnabled';

export enum ConflictDataStatus {
	Ok = 'ok',
	// No three-way data for this note (no state row, or it is still encrypted or
	// locked), so show the read-only conflict view
	Unavailable = 'unavailable',
}

export interface ConflictData {
	status: ConflictDataStatus;
	sections: MergedSection[];
	mergedText: string;
	remoteUpdatedTime: number;
	localTitle: string;
	remoteTitle: string;
	titleConflict: boolean;
}

const originalIsReadOnly = (original: NoteEntity) => {
	const shareCache = BaseItem.syncShareCache;
	if (!shareCache) return false;

	return itemIsReadOnlySync(
		ModelType.Note,
		ItemChange.SOURCE_UNSPECIFIED,
		{ id: original.id, share_id: original.share_id, deleted_time: original.deleted_time },
		Setting.value('sync.userId'),
		shareCache,
		true,
	);
};

const unavailable = (): ConflictData => {
	return {
		status: ConflictDataStatus.Unavailable,
		sections: [],
		mergedText: '',
		remoteUpdatedTime: 0,
		localTitle: '',
		remoteTitle: '',
		titleConflict: false,
	};
};

// Sections are recomputed on each call because they were never stored.
export default async (noteId: string): Promise<ConflictData> => {
	if (!isConflictResolutionEnabled()) return unavailable();

	const note = await Note.load(noteId);
	if (!note) return unavailable();

	// No readable body to diff against yet - decryption re-saves the note, so the
	// merge can be recomputed then.
	if (note.encryption_applied || note.is_locked) return unavailable();

	const state = await ConflictNoteState.byNoteId(noteId);
	if (!state) return unavailable();

	// The remote version stays as the original note.
	const remoteNote = note.conflict_original_id ? await Note.load(note.conflict_original_id) : null;
	if (!remoteNote) return unavailable();
	if (remoteNote.encryption_applied || remoteNote.is_locked) return unavailable();
	if (remoteNote.deleted_time) return unavailable();
	// Refuse read-only before the UI appears
	if (originalIsReadOnly(remoteNote)) return unavailable();

	const localBody = note.body ?? '';
	const remoteBody = remoteNote.body ?? '';

	// Always use two-way diff. The viewer only shows differences, so it does not
	// requires base and all conflicts will appear in same way.
	const merged = twoWayDiff(localBody, remoteBody);

	const localTitle = note.title ?? '';
	const remoteTitle = remoteNote.title ?? '';

	return {
		status: ConflictDataStatus.Ok,
		sections: merged.sections,
		mergedText: merged.mergedText,
		remoteUpdatedTime: remoteNote.updated_time,
		localTitle,
		remoteTitle,
		titleConflict: localTitle !== remoteTitle,
	};
};
