import * as React from 'react';
import { useEffect, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import Note from '@joplin/lib/models/Note';
import ConflictNoteState from '@joplin/lib/models/ConflictNoteState';
import { Section, diffNotes, diffNotesTwoWay } from '@joplin/lib/services/conflict/diffNotes';
import SectionList from './SectionList';
import styled from 'styled-components';

const logger = Logger.create('ConflictResolutionPage');

interface Props {
	noteId: string;
}

const Root = styled.div`
	padding: 16px;
	height: 100%;
	box-sizing: border-box;
	overflow-y: auto;
	background-color: var(--joplin-background-color);
	color: var(--joplin-color);
	font-family: var(--joplin-font-family);
`;

const Title = styled.h2`
	margin-top: 0;
`;

const ConflictResolutionPage = (props: Props) => {
	const [sections, setSections] = useState<Section[]>([]);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			const conflictNote = await Note.load(props.noteId);
			if (!conflictNote) return;

			const state = await ConflictNoteState.byNoteId(props.noteId);

			const localBody = conflictNote.body ?? '';
			const remoteBody = state ? state.remote_body ?? '' : '';
			const baseBody = state ? state.base_body ?? '' : '';

			const result = baseBody ?
				diffNotes(baseBody, localBody, remoteBody) :
				diffNotesTwoWay(localBody, remoteBody);

			if (cancelled) return;

			logger.info('Sections for conflict note:', props.noteId, result);
			setSections(result);
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [props.noteId]);

	return (
		<Root>
			<Title>{_('Resolve conflict')}</Title>
			<SectionList sections={sections}/>
		</Root>
	);
};

export default ConflictResolutionPage;
