import validateApprovedPlugin from './validateApprovedPlugin';
import { ApprovedPlugin } from './types';

const validEntry: ApprovedPlugin = {
	repository_url: 'https://github.com/JackGruber/joplin-plugin-backup',
	reviewed_commit: '6a192515eaf71fa6f1aaaa74d406dae45981aa42',
	review_date: '2026-03-14',
	reviewer: 'marph',
	status: 'approved',
	build_command: 'npm run dist',
	publish_dir: 'publish',
};

describe('validateApprovedPlugin', () => {
	test('accepts a valid approved-plugins.json entry', () => {
		expect(() => validateApprovedPlugin('io.github.jackgruber.backup', validEntry)).not.toThrow();
	});

	test('rejects an entry with a missing reviewed_commit', () => {
		const entry = { ...validEntry, reviewed_commit: '' };
		expect(() => validateApprovedPlugin('io.github.jackgruber.backup', entry)).toThrow('reviewed_commit');
	});

	test('rejects an entry with an invalid repository URL', () => {
		const entry = { ...validEntry, repository_url: 'https://gitlab.com/someone/repo' };
		expect(() => validateApprovedPlugin('io.github.jackgruber.backup', entry)).toThrow('repository_url');
	});
});
