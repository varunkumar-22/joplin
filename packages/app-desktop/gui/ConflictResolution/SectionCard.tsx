import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { Section } from '@joplin/lib/services/conflict/diffNotes';
import styled from 'styled-components';

interface Props {
	section: Section;
}

const Card = styled.div`
	border: 1px solid var(--joplin-divider-color);
	border-radius: 6px;
	margin-bottom: 12px;
	background-color: var(--joplin-background-color);
	overflow: hidden;
`;

const Header = styled.div`
	padding: 6px 12px;
	font-weight: bold;
	font-size: var(--joplin-font-size-small);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	border-bottom: 1px solid var(--joplin-divider-color);
	background-color: var(--joplin-background-color2);
`;

const Panels = styled.div`
	display: flex;
	gap: 1px;
	background-color: var(--joplin-divider-color);
`;

const Panel = styled.div`
	flex: 1;
	min-width: 0;
	padding: 8px 12px;
	background-color: var(--joplin-background-color);
`;

const PanelLabel = styled.div`
	font-size: var(--joplin-font-size-small);
	color: var(--joplin-color-faded);
	margin-bottom: 4px;
`;

const Line = styled.div`
	font-family: monospace;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const EmptyContent = styled.div`
	font-style: italic;
	color: var(--joplin-color-faded);
`;

const labelForType = (type: Section['type']) => {
	if (type === 'addition') return _('Addition');
	if (type === 'deletion') return _('Deletion');
	return _('Conflict');
};

const Content = (props: { lines: string[] }) => {
	if (!props.lines.length) {
		return <EmptyContent>{_('(empty)')}</EmptyContent>;
	}
	return <>{props.lines.map((line, i) => <Line key={i}>{line === '' ? ' ' : line}</Line>)}</>;
};

const Side = (props: { label: string; lines: string[] }) => {
	return (
		<Panel>
			<PanelLabel>{props.label}</PanelLabel>
			<Content lines={props.lines}/>
		</Panel>
	);
};

const SectionCard = (props: Props) => {
	const { section } = props;
	const isThreeWay = section.baseLines.length > 0;

	const panels = [];
	if (section.type === 'conflict' && isThreeWay) {
		panels.push(<Side key='base' label={_('Base')} lines={section.baseLines}/>);
	}
	panels.push(<Side key='mine' label={_('Mine')} lines={section.localLines}/>);
	panels.push(<Side key='theirs' label={_('Theirs')} lines={section.remoteLines}/>);

	return (
		<Card>
			<Header>{labelForType(section.type)}</Header>
			<Panels>{panels}</Panels>
		</Card>
	);
};

export default SectionCard;
