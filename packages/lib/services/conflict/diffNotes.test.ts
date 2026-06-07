import { diffNotes, diffNotesTwoWay, diffTitles, diffTitlesTwoWay, Section } from './diffNotes';

const types = (sections: Section[]) => sections.map(s => s.type);

describe('diffNotes', () => {

	test('clean merge - local adds at top, remote adds at bottom', () => {
		const base = 'b\nc';
		const local = 'a\nb\nc';
		const remote = 'b\nc\nd';

		const sections = diffNotes(base, local, remote);

		expect(types(sections)).toEqual(['addition', 'deletion']);
		expect(sections[0].localLines).toEqual(['a']);
		expect(sections[0].remoteLines).toEqual([]);
		expect(sections[1].remoteLines).toEqual(['d']);
		expect(sections[1].localLines).toEqual([]);
	});

	test('genuine conflict - both sides change the same line differently', () => {
		const base = 'one\ntwo\nthree';
		const local = 'one\nLOCAL\nthree';
		const remote = 'one\nREMOTE\nthree';

		const sections = diffNotes(base, local, remote);

		expect(types(sections)).toEqual(['conflict']);
		expect(sections[0].localLines).toEqual(['LOCAL']);
		expect(sections[0].remoteLines).toEqual(['REMOTE']);
		expect(sections[0].baseLines).toEqual(['two']);
	});

	test('mixed note - addition, deletion and conflict each classified', () => {
		const base = 'header\nkeep1\ntarget\nkeep2\nfooter';
		const local = 'header\nlocalAdd\nkeep1\nLOCAL\nkeep2\nfooter';
		const remote = 'header\nkeep1\nREMOTE\nkeep2';

		const sections = diffNotes(base, local, remote);

		// local inserts a line (addition), both change 'target' (conflict),
		// remote drops the trailing 'footer' (deletion).
		expect(types(sections)).toEqual(['addition', 'conflict', 'deletion']);
	});

	test('identical changes on both sides do not count as a conflict', () => {
		const base = 'one\ntwo\nthree';
		const local = 'one\nSAME\nthree';
		const remote = 'one\nSAME\nthree';

		const sections = diffNotes(base, local, remote);

		expect(types(sections)).not.toContain('conflict');
	});

	test('empty local - remote content treated as a change', () => {
		const sections = diffNotes('shared', '', 'shared\nmore');
		expect(() => diffNotes('shared', '', 'shared\nmore')).not.toThrow();
		expect(sections.length).toBeGreaterThan(0);
	});

	test('empty remote - local content treated as a change', () => {
		const sections = diffNotes('shared', 'shared\nmore', '');
		expect(() => diffNotes('shared', 'shared\nmore', '')).not.toThrow();
		expect(sections.length).toBeGreaterThan(0);
	});

	test('single line note with a conflicting edit', () => {
		const sections = diffNotes('hello', 'hello local', 'hello remote');

		expect(types(sections)).toEqual(['conflict']);
		expect(sections[0].localLines).toEqual(['hello local']);
		expect(sections[0].remoteLines).toEqual(['hello remote']);
	});

	test('identical notes return no sections', () => {
		const sections = diffNotes('same\nbody', 'same\nbody', 'same\nbody');
		expect(sections).toEqual([]);
	});

	test('two-way diff - every difference is a conflict', () => {
		const local = 'one\nLOCAL\nthree';
		const remote = 'one\nREMOTE\nthree';

		const sections = diffNotesTwoWay(local, remote);

		expect(sections.length).toBeGreaterThan(0);
		expect(sections.every(s => s.type === 'conflict')).toBe(true);
		expect(sections.every(s => s.baseLines.length === 0)).toBe(true);
	});

	test('two-way diff - identical notes return no sections', () => {
		expect(diffNotesTwoWay('a\nb', 'a\nb')).toEqual([]);
	});

	test('empty base falls back to two-way with all conflicts', () => {
		const local = 'a\nb';
		const remote = 'a\nc';

		const sections = diffNotesTwoWay(local, remote);

		expect(sections.every(s => s.type === 'conflict')).toBe(true);
	});

	test.each([
		['unchanged title', 't', 't', 't', 'unchanged'],
		['only local changed', 't', 'local', 't', 'addition'],
		['only remote changed', 't', 't', 'remote', 'deletion'],
		['both changed differently', 't', 'local', 'remote', 'conflict'],
		['both changed the same way', 't', 'same', 'same', 'unchanged'],
	])('diffTitles - %s', (_name, base, local, remote, expected) => {
		const section = diffTitles(base, local, remote);
		expect(section.type).toBe(expected);
		expect(section.localLines).toEqual([local]);
		expect(section.remoteLines).toEqual([remote]);
	});

	test('diffTitlesTwoWay - differing titles conflict', () => {
		expect(diffTitlesTwoWay('a', 'b').type).toBe('conflict');
		expect(diffTitlesTwoWay('a', 'a').type).toBe('unchanged');
		expect(diffTitlesTwoWay('a', 'b').baseLines).toEqual([]);
	});

});
