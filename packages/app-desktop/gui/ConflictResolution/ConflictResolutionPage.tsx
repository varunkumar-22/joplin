import * as React from 'react';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { themeStyle } from '@joplin/lib/theme';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('ConflictResolutionPage');

interface Props {
	themeId: number;
	noteId: string;
}

const ConflictResolutionPage = (props: Props) => {
	useEffect(() => {
		logger.info('Mounted for conflict note:', props.noteId);
	}, [props.noteId]);

	const theme = themeStyle(props.themeId);

	const rootStyle: React.CSSProperties = {
		padding: 16,
		height: '100%',
		boxSizing: 'border-box',
		backgroundColor: theme.backgroundColor,
		color: theme.color,
		fontFamily: theme.fontFamily,
	};

	return (
		<div style={rootStyle}>
			<div>Conflict Resolution UI</div>
			<div>{props.noteId}</div>
		</div>
	);
};

const mapStateToProps = (state: AppState) => ({
	themeId: state.settings.theme,
});

export default connect(mapStateToProps)(ConflictResolutionPage);
