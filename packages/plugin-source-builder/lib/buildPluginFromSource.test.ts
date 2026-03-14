import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import buildPluginFromSource from './buildPluginFromSource';
import { ApprovedPlugin, BuildResult, ExecFn } from './types';

const backupPlugin: ApprovedPlugin = {
	repository_url: 'https://github.com/JackGruber/joplin-plugin-backup',
	reviewed_commit: '6a192515eaf71fa6f1aaaa74d406dae45981aa42',
	review_date: '2026-03-14',
	reviewer: 'marph',
	status: 'approved',
	build_command: 'npm run dist',
	publish_dir: 'publish',
};

// these tests actually clone and build a real plugin, they're slow by nature — allow up to 3 minutes
const integrationOutputDir = path.join(__dirname, '..', 'output', 'test-integration');
let integrationResult: BuildResult;

describe('buildPluginFromSource', () => {
	beforeAll(async () => {
		integrationResult = await buildPluginFromSource(
			'io.github.jackgruber.backup',
			backupPlugin,
			integrationOutputDir,
		);
	}, 180_000);

	afterAll(async () => {
		await fs.remove(integrationOutputDir);
	});

	test('builds a real plugin from source and produces a .jpl file', () => {
		expect(fs.existsSync(integrationResult.jplPath)).toBe(true);
		expect(path.extname(integrationResult.jplPath)).toBe('.jpl');
	});

	test('stamps _review_status, _reviewed_commit, and _review_date onto the manifest', () => {
		expect(integrationResult.manifest._review_status).toBe('reviewed');
		expect(integrationResult.manifest._reviewed_commit).toBe(backupPlugin.reviewed_commit);
		expect(integrationResult.manifest._review_date).toBe(backupPlugin.review_date);
	});

	// a plugin with a non-approved status should be rejected before any network calls are made
	test('refuses to build a plugin with status "pending"', async () => {
		const pendingPlugin = { ...backupPlugin, status: 'pending' };
		await expect(
			buildPluginFromSource('io.github.jackgruber.backup', pendingPlugin, '/tmp/should-not-exist'),
		).rejects.toThrow('"pending"');
	});

	// uses a recording execFn to intercept shell calls without running them,
	// and creates the minimal file structure the function needs to complete
	test('always passes --ignore-scripts to npm install', async () => {
		const recordedCommands: Array<{ command: string; cwd?: string }> = [];

		const recordingExec: ExecFn = (command: string, cwd?: string) => {
			recordedCommands.push({ command, cwd });

			// when git clone runs, create just enough structure for the function
			// to find after the build step: a publish/ dir with a .jpl and manifest.json
			if (command.startsWith('git clone')) {
				// target directory is always the last token in the clone command
				const repoDir = command.split(' ').pop()!;
				const publishDir = path.join(repoDir, 'publish');
				fs.mkdirpSync(publishDir);
				fs.writeFileSync(path.join(publishDir, 'plugin.jpl'), 'fake-jpl-content');
				fs.writeJsonSync(path.join(publishDir, 'manifest.json'), {
					id: 'io.github.jackgruber.backup',
					name: 'Backup',
					version: '1.0.0',
				});
			}
		};

		const outputDir = path.join(os.tmpdir(), `test-ignore-scripts-${Date.now()}`);

		try {
			await buildPluginFromSource(
				'io.github.jackgruber.backup',
				backupPlugin,
				outputDir,
				recordingExec,
			);
		} finally {
			await fs.remove(outputDir);
		}

		const npmInstall = recordedCommands.find(c => c.command.startsWith('npm install'));
		expect(npmInstall).toBeDefined();
		expect(npmInstall!.command).toContain('--ignore-scripts');
		// guard against someone accidentally removing the flag later
		expect(npmInstall!.command).not.toMatch(/^npm install(?! --ignore-scripts)/);
	});
});
