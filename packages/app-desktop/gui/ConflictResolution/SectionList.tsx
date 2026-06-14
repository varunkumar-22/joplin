import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { Section } from '@joplin/lib/services/conflict/diffNotes';
import SectionCard from './SectionCard';
import styled from 'styled-components';

interface Props {
	sections: Section[];
}

const EmptyMessage = styled.div`
	color: var(--joplin-color-faded);
	padding: 16px 0;
`;

const SectionList = (props: Props) => {
	const sections = props.sections.filter(s => s.type !== 'unchanged');

	if (!sections.length) {
		return <EmptyMessage>{_('There are no differences to resolve.')}</EmptyMessage>;
	}

	return (
		<div>
			{sections.map((section, i) => <SectionCard key={i} section={section}/>)}
		</div>
	);
};

export default SectionList;
