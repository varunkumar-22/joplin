import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { ApprovedPlugin, BuildResult, ExecFn, PluginManifest } from './types';

// runs a shell command synchronously in the given working directory, stdout is piped to the terminal
const defaultExecFn: ExecFn = (command: string, cwd?: string) => {
	execSync(command, { cwd, stdio: 'inherit' });
};

const buildPluginFromSource = async (
	pluginId: string,
	plugin: ApprovedPlugin,
	outputDir: string,
	execFn: ExecFn = defaultExecFn,
): Promise<BuildResult> => {
	if (plugin.status !== 'approved') {
		throw new Error(`Cannot build "${pluginId}": status is "${plugin.status}". Only "approved" plugins may be built.`);
	}

	const repoName = plugin.repository_url.replace('https://github.com/', '');
	const shortHash = plugin.reviewed_commit.slice(0, 7);

	// work inside a unique temp dir so parallel builds don't collide
	const tempDir = path.join(os.tmpdir(), `joplin-plugin-build-${pluginId}-${Date.now()}`);
	const repoDir = path.join(tempDir, 'repo');

	await fs.mkdirp(tempDir);

	try {
		// clone at the exact reviewed commit
		console.log(`✓ Cloning ${repoName} @ ${shortHash}...`);
		execFn(`git clone ${plugin.repository_url} ${repoDir}`, tempDir);
		execFn(`git checkout ${plugin.reviewed_commit}`, repoDir);

		// --ignore-scripts prevents malicious postinstall/preinstall scripts from running
		execFn('npm install --ignore-scripts', repoDir);
		console.log('✓ npm install --ignore-scripts');

		// build the plugin
		execFn(plugin.build_command, repoDir);
		console.log(`✓ ${plugin.build_command} → ${plugin.publish_dir}/plugin.jpl`);

		// find the built artifacts in the publish directory
		const publishDir = path.join(repoDir, plugin.publish_dir);
		if (!(await fs.pathExists(publishDir))) {
			throw new Error(`publish dir not found after build: ${publishDir}`);
		}

		const publishFiles = await fs.readdir(publishDir);
		const jplFile = publishFiles.find(f => path.extname(f) === '.jpl');
		const jsonFile = publishFiles.find(f => path.extname(f) === '.json');

		if (!jplFile) throw new Error(`No .jpl file found in ${publishDir}`);
		if (!jsonFile) throw new Error(`No manifest .json found in ${publishDir}`);

		// stamp review metadata so it's clear this was built from a reviewed commit
		const manifest: PluginManifest = await fs.readJson(path.join(publishDir, jsonFile));
		manifest._review_status = 'reviewed';
		manifest._reviewed_commit = plugin.reviewed_commit;
		manifest._review_date = plugin.review_date;

		console.log('✓ Stamped manifest:');
		console.log(`    _review_status:   "reviewed"`);
		console.log(`    _reviewed_commit: "${shortHash}..."`);
		console.log(`    _review_date:     "${plugin.review_date}"`);

		// copy to the output directory
		await fs.mkdirp(outputDir);
		const outputJplPath = path.join(outputDir, `${pluginId}.jpl`);
		await fs.copy(path.join(publishDir, jplFile), outputJplPath);
		await fs.writeJson(
			path.join(outputDir, `${pluginId}.manifest.json`),
			manifest,
			{ spaces: '\t' },
		);

		console.log(`✓ Output: ${outputJplPath}`);
		console.log('BUILD SUCCESSFUL');

		return { pluginId, jplPath: outputJplPath, manifest };
	} finally {
		await fs.remove(tempDir);
	}
};

export default buildPluginFromSource;
