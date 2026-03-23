import * as React from 'react';
import { useState, useCallback } from 'react';
import Button, { ButtonLevel } from '../Button/Button';
import ButtonBar from '../ConfigScreen/ButtonBar';
import { AppState } from '../../app.reducer';
const { connect } = require('react-redux');
const styled = require('styled-components').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- styled-components theme prop
type StyleProps = any;

interface AdditionSection {
	type: 'addition';
	remoteText: string;
}

interface DeletionSection {
	type: 'deletion';
	deletedText: string;
}

interface ConflictSection {
	type: 'conflict';
	localText: string;
	remoteText: string;
}

type Section = (AdditionSection | DeletionSection | ConflictSection) & { id: number };

type Resolution = 'accepted' | 'rejected' | 'mine' | 'theirs' | 'edited';

interface SectionState {
	resolution: Resolution | null;
	editMode: boolean;
	editText: string;
}

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- passed by navigator
	style: any;
	// eslint-disable-next-line @typescript-eslint/ban-types -- matches existing joplin pattern
	dispatch: Function;
}

const mockSections: Section[] = [
	{
		id: 1,
		type: 'addition',
		remoteText: 'Discussed the Q3 roadmap and confirmed timelines with the team.',
	},
	{
		id: 2,
		type: 'conflict',
		localText: 'Meeting scheduled for Monday at 10am',
		remoteText: 'Meeting rescheduled to Wednesday at 2pm',
	},
	{
		id: 3,
		type: 'deletion',
		deletedText: 'Action items to be shared by end of day Friday.',
	},
	{
		id: 4,
		type: 'conflict',
		localText: 'Attendees: John, Sarah, Mike',
		remoteText: 'Attendees: John, Sarah, Mike, Lisa, Tom',
	},
];

const StyledRoot = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	font-family: ${(props: StyleProps) => props.theme.fontFamily};
	color: ${(props: StyleProps) => props.theme.color};
	background-color: ${(props: StyleProps) => props.theme.backgroundColor};
`;

const StyledBanner = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 20px;
	background-color: #5c2b2b;
	color: #f8b4b4;
	font-size: ${(props: StyleProps) => props.theme.fontSize}px;
`;

const StyledContent = styled.div`
	flex: 1;
	overflow-y: auto;
	padding: ${(props: StyleProps) => props.theme.configScreenPadding}px;
`;

const StyledCard = styled.div<{ resolved: boolean }>`
	border: 1px solid ${(props: StyleProps) => props.resolved ? props.theme.colorCorrect : props.theme.dividerColor};
	border-radius: 4px;
	padding: 14px 16px;
	margin-bottom: 10px;
	background-color: ${(props: StyleProps) => props.resolved ? 'transparent' : props.theme.backgroundColor};
`;

const StyledCardHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
`;

const StyledLabel = styled.span<{ variant?: string }>`
	font-size: ${(props: StyleProps) => props.theme.fontSize * 0.9}px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: ${(props: StyleProps) => {
		if (props.variant === 'addition') return props.theme.colorCorrect;
		if (props.variant === 'deletion' || props.variant === 'conflict') return props.theme.colorError;
		return props.theme.color;
	}};
`;

const StyledCheckmark = styled.span`
	color: ${(props: StyleProps) => props.theme.colorCorrect};
	font-size: 16px;
`;

const StyledText = styled.p<{ strikethrough?: boolean }>`
	margin: 0 0 10px 0;
	font-size: ${(props: StyleProps) => props.theme.fontSize}px;
	line-height: 1.6em;
	color: ${(props: StyleProps) => props.strikethrough ? props.theme.colorFaded : props.theme.color};
	text-decoration: ${(props: StyleProps) => props.strikethrough ? 'line-through' : 'none'};
`;

const StyledButtonRow = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
`;

const StyledSideBySide = styled.div`
	display: flex;
	gap: 10px;
	margin-bottom: 10px;
`;

const StyledVersionBox = styled.div<{ side: 'mine' | 'theirs' }>`
	flex: 1;
	padding: 10px 12px;
	border: 1px solid ${(props: StyleProps) => props.theme.dividerColor};
	border-radius: 4px;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor3};
`;

const StyledVersionLabel = styled.span`
	display: block;
	font-size: ${(props: StyleProps) => props.theme.fontSize * 0.9}px;
	font-weight: bold;
	color: ${(props: StyleProps) => props.theme.colorFaded};
	margin-bottom: 6px;
`;

const StyledTextarea = styled.textarea`
	width: 100%;
	min-height: 80px;
	padding: 8px 10px;
	border: 1px solid ${(props: StyleProps) => props.theme.dividerColor};
	border-radius: 4px;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor};
	color: ${(props: StyleProps) => props.theme.color};
	font-size: ${(props: StyleProps) => props.theme.fontSize}px;
	font-family: ${(props: StyleProps) => props.theme.fontFamily};
	line-height: 1.6em;
	resize: vertical;
	box-sizing: border-box;
`;

const StyledFooter = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 14px;
	padding: 10px ${(props: StyleProps) => props.theme.configScreenPadding}px;
	border-top: 1px solid ${(props: StyleProps) => props.theme.dividerColor};
	background-color: ${(props: StyleProps) => props.theme.backgroundColor3};
`;

const StyledFooterText = styled.span`
	font-size: ${(props: StyleProps) => props.theme.fontSize}px;
	color: ${(props: StyleProps) => props.theme.colorFaded};
`;

const StyledDialogOverlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 9999;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	background-color: rgba(0, 0, 0, 0.6);
`;

const StyledDialogBox = styled.div`
	background-color: ${(props: StyleProps) => props.theme.backgroundColor};
	color: ${(props: StyleProps) => props.theme.color};
	padding: 16px;
	margin-top: 20px;
	box-shadow: 6px 6px 20px rgba(0, 0, 0, 0.5);
	max-width: 480px;
	width: 90%;
`;

const StyledDialogText = styled.p`
	margin: 0 0 16px 0;
	font-size: ${(props: StyleProps) => props.theme.fontSize}px;
	line-height: 1.6em;
	color: ${(props: StyleProps) => props.theme.color};
`;

const StyledTitleRow = styled.div`
	margin-bottom: 16px;
`;

const StyledTitle = styled.span`
	font-size: ${(props: StyleProps) => props.theme.fontSize * 1.5}px;
	font-weight: bold;
	color: ${(props: StyleProps) => props.theme.color};
`;

const StyledTitleTag = styled.span`
	margin-left: 10px;
	font-size: ${(props: StyleProps) => props.theme.fontSize * 0.85}px;
	color: ${(props: StyleProps) => props.theme.colorFaded};
`;

const StyledUndoRedoRow = styled.div`
	display: flex;
	gap: 4px;
`;

function ConflictResolutionPage(props: Props) {
	const initialStates: Record<number, SectionState> = {};
	for (const s of mockSections) {
		initialStates[s.id] = { resolution: null, editMode: false, editText: s.type === 'conflict' ? s.localText : '' };
	}

	const [sectionStates, setSectionStates] = useState<Record<number, SectionState>>(initialStates);
	const [showKeepBothDialog, setShowKeepBothDialog] = useState(false);

	const resolvedCount = Object.values(sectionStates).filter(s => s.resolution !== null).length;
	const allResolved = resolvedCount === mockSections.length;

	const resolve = useCallback((id: number, resolution: Resolution) => {
		setSectionStates(prev => ({
			...prev,
			[id]: { ...prev[id], resolution, editMode: false },
		}));
	}, []);

	const toggleEditMode = useCallback((id: number) => {
		setSectionStates(prev => {
			const current = prev[id];
			return { ...prev, [id]: { ...current, editMode: !current.editMode } };
		});
	}, []);

	const setEditText = useCallback((id: number, text: string) => {
		setSectionStates(prev => ({
			...prev,
			[id]: { ...prev[id], editText: text },
		}));
	}, []);

	// auto-resolve addition and deletion sections that aren't conflicting
	const applyNonConflicting = useCallback(() => {
		setSectionStates(prev => {
			const next = { ...prev };
			for (const section of mockSections) {
				if (section.type === 'addition' && !next[section.id].resolution) {
					next[section.id] = { ...next[section.id], resolution: 'accepted' };
				}
				if (section.type === 'deletion' && !next[section.id].resolution) {
					next[section.id] = { ...next[section.id], resolution: 'accepted' };
				}
			}
			return next;
		});
	}, []);

	// resolve all remaining sections using local version
	const applyRemainingMine = useCallback(() => {
		setSectionStates(prev => {
			const next = { ...prev };
			for (const section of mockSections) {
				if (!next[section.id].resolution) {
					if (section.type === 'conflict') {
						next[section.id] = { ...next[section.id], resolution: 'mine' };
					} else if (section.type === 'deletion') {
						next[section.id] = { ...next[section.id], resolution: 'accepted' };
					} else if (section.type === 'addition') {
						next[section.id] = { ...next[section.id], resolution: 'rejected' };
					}
				}
			}
			return next;
		});
	}, []);

	// resolve all remaining sections using remote version
	const applyRemainingTheirs = useCallback(() => {
		setSectionStates(prev => {
			const next = { ...prev };
			for (const section of mockSections) {
				if (!next[section.id].resolution) {
					if (section.type === 'conflict') {
						next[section.id] = { ...next[section.id], resolution: 'theirs' };
					} else if (section.type === 'addition') {
						next[section.id] = { ...next[section.id], resolution: 'accepted' };
					} else if (section.type === 'deletion') {
						next[section.id] = { ...next[section.id], resolution: 'rejected' };
					}
				}
			}
			return next;
		});
	}, []);

	const renderAdditionSection = (section: Section & AdditionSection, state: SectionState) => {
		const isResolved = state.resolution !== null;
		const isRejected = state.resolution === 'rejected';

		return (
			<StyledCard key={section.id} resolved={isResolved}>
				<StyledCardHeader>
					<StyledLabel variant="addition">Addition (Remote)</StyledLabel>
					{isResolved && <StyledCheckmark>&#10003;</StyledCheckmark>}
				</StyledCardHeader>
				<StyledText strikethrough={isRejected}>{section.remoteText}</StyledText>
				{!isResolved && (
					<StyledButtonRow>
						<Button level={ButtonLevel.Primary} title="Accept" onClick={() => resolve(section.id, 'accepted')} />
						<Button level={ButtonLevel.Secondary} title="Reject" onClick={() => resolve(section.id, 'rejected')} />
					</StyledButtonRow>
				)}
			</StyledCard>
		);
	};

	const renderDeletionSection = (section: Section & DeletionSection, state: SectionState) => {
		const isResolved = state.resolution !== null;
		const isAccepted = state.resolution === 'accepted';

		return (
			<StyledCard key={section.id} resolved={isResolved}>
				<StyledCardHeader>
					<StyledLabel variant="deletion">Deletion (Local)</StyledLabel>
					{isResolved && <StyledCheckmark>&#10003;</StyledCheckmark>}
				</StyledCardHeader>
				<StyledText strikethrough={isAccepted}>{section.deletedText}</StyledText>
				{!isResolved && (
					<StyledButtonRow>
						<Button level={ButtonLevel.Primary} title="Accept" onClick={() => resolve(section.id, 'accepted')} />
						<Button level={ButtonLevel.Secondary} title="Reject" onClick={() => resolve(section.id, 'rejected')} />
					</StyledButtonRow>
				)}
			</StyledCard>
		);
	};

	const renderConflictSection = (section: Section & ConflictSection, state: SectionState) => {
		const isResolved = state.resolution !== null;

		return (
			<StyledCard key={section.id} resolved={isResolved}>
				<StyledCardHeader>
					<StyledLabel variant="conflict">Conflict</StyledLabel>
					{isResolved && <StyledCheckmark>&#10003;</StyledCheckmark>}
				</StyledCardHeader>

				{state.editMode ? (
					<div>
						<StyledTextarea
							value={state.editText}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditText(section.id, e.target.value)}
						/>
						<div style={{ marginTop: 10 }}>
							<Button level={ButtonLevel.Primary} title="Done" onClick={() => resolve(section.id, 'edited')} />
						</div>
					</div>
				) : isResolved ? (
					<StyledText>
						{state.resolution === 'mine' ? section.localText
							: state.resolution === 'theirs' ? section.remoteText
								: state.editText}
					</StyledText>
				) : (
					<div>
						<StyledSideBySide>
							<StyledVersionBox side="mine">
								<StyledVersionLabel>Mine</StyledVersionLabel>
								<StyledText>{section.localText}</StyledText>
							</StyledVersionBox>
							<StyledVersionBox side="theirs">
								<StyledVersionLabel>Theirs</StyledVersionLabel>
								<StyledText>{section.remoteText}</StyledText>
							</StyledVersionBox>
						</StyledSideBySide>
						<StyledButtonRow>
							<Button level={ButtonLevel.Primary} title="Use Mine" onClick={() => resolve(section.id, 'mine')} />
							<Button level={ButtonLevel.Primary} title="Use Theirs" onClick={() => resolve(section.id, 'theirs')} />
							<Button level={ButtonLevel.Secondary} title="Edit Manually" onClick={() => toggleEditMode(section.id)} />
						</StyledButtonRow>
					</div>
				)}
			</StyledCard>
		);
	};

	const renderSection = (section: Section) => {
		const state = sectionStates[section.id];
		switch (section.type) {
		case 'addition':
			return renderAdditionSection(section as Section & AdditionSection, state);
		case 'deletion':
			return renderDeletionSection(section as Section & DeletionSection, state);
		case 'conflict':
			return renderConflictSection(section as Section & ConflictSection, state);
		}
	};

	const style = { ...props.style, display: 'flex', flexDirection: 'column' as const };

	return (
		<div style={style}>
			<StyledRoot>
				<StyledBanner>
					<span>Conflict note: resolve the sections below to complete the merge</span>
					<StyledUndoRedoRow>
						<Button level={ButtonLevel.Secondary} iconName="fas fa-undo" onClick={() => {}} isSquare={true} tooltip="Undo" />
						<Button level={ButtonLevel.Secondary} iconName="fas fa-redo" onClick={() => {}} isSquare={true} tooltip="Redo" />
					</StyledUndoRedoRow>
				</StyledBanner>

				<StyledContent>
					<StyledTitleRow>
						<StyledTitle>Project Meeting Notes</StyledTitle>
						<StyledTitleTag>conflict</StyledTitleTag>
					</StyledTitleRow>

					<StyledButtonRow style={{ marginBottom: 16 }}>
						<Button level={ButtonLevel.Secondary} title="Apply non-conflicting changes" onClick={applyNonConflicting} />
						<Button level={ButtonLevel.Secondary} title="Apply remaining mine" onClick={applyRemainingMine} />
						<Button level={ButtonLevel.Secondary} title="Apply remaining theirs" onClick={applyRemainingTheirs} />
						<Button level={ButtonLevel.Tertiary} title="Keep both" onClick={() => setShowKeepBothDialog(true)} />
					</StyledButtonRow>

					{mockSections.map(section => renderSection(section))}
				</StyledContent>

				<StyledFooter>
					<StyledFooterText>{resolvedCount} of {mockSections.length} sections resolved</StyledFooterText>
					<Button
						level={ButtonLevel.Primary}
						title="Finish"
						disabled={!allResolved}
						onClick={() => {}}
					/>
				</StyledFooter>
			</StyledRoot>

			{showKeepBothDialog && (
				<StyledDialogOverlay>
					<StyledDialogBox>
						<StyledDialogText>
							This will create a new note titled <strong>Project Meeting Notes (conflict copy)</strong> in the same notebook.
							Your current resolution progress will be saved. Continue?
						</StyledDialogText>
						<StyledButtonRow style={{ justifyContent: 'flex-end' }}>
							<Button level={ButtonLevel.Secondary} title="Cancel" onClick={() => setShowKeepBothDialog(false)} />
							<Button level={ButtonLevel.Primary} title="Confirm" onClick={() => setShowKeepBothDialog(false)} />
						</StyledButtonRow>
					</StyledDialogBox>
				</StyledDialogOverlay>
			)}

			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(ConflictResolutionPage);
