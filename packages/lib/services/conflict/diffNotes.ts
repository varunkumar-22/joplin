import { diffIndices } from 'node-diff3';

// Platform independent diff engine for the conflict resolution feature. It takes plain
// strings (note bodies or titles) and returns typed section data describing how the
// local and remote versions diverged from a common ancestor (base). It must stay free
// of any UI or Joplin-specific imports so it can run anywhere.
//
// We work from the two pairwise diffs base->local and base->remote rather than from a
// three-way merge. A merge collapses one-sided edits it can resolve on its own (and
// never surfaces deletions at all), which loses the information the UI needs to show. The
// pairwise diffs keep every change anchored to a base line range, which is what we
// classify and group below.

export type SectionType = 'addition' | 'deletion' | 'conflict' | 'unchanged';

export interface Section {
	type: SectionType;
	localLines: string[];
	remoteLines: string[];
	baseLines: string[];
}

const splitLines = (text: string): string[] => {
	// An empty string is zero lines. Splitting '' would give [''], a phantom empty line.
	if (text === '') return [];
	return text.split('\n');
};

const arraysEqual = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

// A single change of one side against base. baseStart/baseEnd is the half-open range of
// base lines the change covers; sideLines is what that range became on that side. For a
// pure insertion baseStart === baseEnd.
interface Hunk {
	side: 'local' | 'remote';
	baseStart: number;
	baseEnd: number;
	sideLines: string[];
}

const hunksFor = (base: string[], side: string[], which: 'local' | 'remote'): Hunk[] => {
	return diffIndices(base, side).map(d => ({
		side: which,
		baseStart: d.buffer1[0],
		baseEnd: d.buffer1[0] + d.buffer1[1],
		sideLines: d.buffer2Content,
	}));
};

const classify = (localChanged: boolean, remoteChanged: boolean, localLines: string[], remoteLines: string[]): SectionType => {
	if (localChanged && !remoteChanged) return 'addition';
	if (!localChanged && remoteChanged) return 'deletion';
	// Both sides changed the same base range. Identical results are a false conflict.
	if (arraysEqual(localLines, remoteLines)) return 'unchanged';
	return 'conflict';
};

const buildSections = (baseLines: string[], localLines: string[], remoteLines: string[]): Section[] => {
	const hunks = hunksFor(baseLines, localLines, 'local')
		.concat(hunksFor(baseLines, remoteLines, 'remote'))
		.sort((a, b) => a.baseStart - b.baseStart || a.baseEnd - b.baseEnd);

	// Group hunks whose base ranges overlap or touch. A gap of at least one unchanged
	// base line between two hunks starts a new section, matching the rule that an
	// unchanged line always ends the current section.
	const sections: Section[] = [];
	let i = 0;
	while (i < hunks.length) {
		const group: Hunk[] = [hunks[i]];
		let groupEnd = hunks[i].baseEnd;
		let j = i + 1;
		while (j < hunks.length && hunks[j].baseStart <= groupEnd) {
			group.push(hunks[j]);
			groupEnd = Math.max(groupEnd, hunks[j].baseEnd);
			j++;
		}

		const baseStart = group[0].baseStart;
		const localHunks = group.filter(h => h.side === 'local');
		const remoteHunks = group.filter(h => h.side === 'remote');

		// Reconstruct each side's content for this base span. Where a side has no hunk it
		// kept the base lines unchanged, so they pass through verbatim.
		const local = sideContent(baseLines, localHunks, baseStart, groupEnd);
		const remote = sideContent(baseLines, remoteHunks, baseStart, groupEnd);
		const base = baseLines.slice(baseStart, groupEnd);

		const type = classify(localHunks.length > 0, remoteHunks.length > 0, local, remote);

		sections.push({ type, localLines: local, remoteLines: remote, baseLines: base });
		i = j;
	}

	return sections;
};

// Build what a side looks like across a base span, splicing in that side's hunks and
// keeping base lines verbatim wherever the side did not change them.
const sideContent = (baseLines: string[], hunks: Hunk[], spanStart: number, spanEnd: number): string[] => {
	const out: string[] = [];
	let basePos = spanStart;
	for (const hunk of hunks) {
		for (let k = basePos; k < hunk.baseStart; k++) out.push(baseLines[k]);
		out.push(...hunk.sideLines);
		basePos = hunk.baseEnd;
	}
	for (let k = basePos; k < spanEnd; k++) out.push(baseLines[k]);
	return out;
};

export const diffNotes = (base: string, local: string, remote: string): Section[] => {
	const sections = buildSections(splitLines(base), splitLines(local), splitLines(remote));
	// Identical edits on both sides leave nothing for the UI to resolve.
	return sections.filter(s => s.type !== 'unchanged');
};

// Two-way fallback used when there is no usable base (common ancestor). Without a base
// we cannot tell who changed what, so every difference is reported as a conflict.
export const diffNotesTwoWay = (local: string, remote: string): Section[] => {
	const localLines = splitLines(local);
	const remoteLines = splitLines(remote);

	// Diff local against remote directly. Each mismatched chunk is one conflict section,
	// and the gaps between chunks are unchanged lines that act as separators.
	return diffIndices(localLines, remoteLines).map(d => ({
		type: 'conflict' as const,
		localLines: d.buffer1Content,
		remoteLines: d.buffer2Content,
		baseLines: [] as string[],
	}));
};

// Titles are single strings rather than multi-line bodies, but the same three-way
// classification applies. The result is collapsed into a single section.
export const diffTitles = (base: string, local: string, remote: string): Section => {
	const type = classify(local !== base, remote !== base, [local], [remote]);
	return { type, localLines: [local], remoteLines: [remote], baseLines: [base] };
};

export const diffTitlesTwoWay = (local: string, remote: string): Section => {
	const type: SectionType = local === remote ? 'unchanged' : 'conflict';
	return { type, localLines: [local], remoteLines: [remote], baseLines: [] };
};
