#!/usr/bin/env node

/* eslint-disable no-console */

require('source-map-support').install();

import * as fs from 'fs-extra';
import * as path from 'path';
import buildPluginFromSource from './lib/buildPluginFromSource';
import validateApprovedPlugin from './lib/validateApprovedPlugin';
import { ApprovedPlugins } from './lib/types';

const approvedPluginsPath = path.resolve(__dirname, 'approved-plugins.json');
const defaultOutputDir = path.resolve(__dirname, 'output');

interface BuildArgs {
	id?: string;
}

const commandBuild = async (args: BuildArgs) => {
	const allPlugins: ApprovedPlugins = await fs.readJson(approvedPluginsPath);

	// if --id is given, build only that plugin; otherwise build all approved ones
	const targetIds = args.id
		? [args.id]
		: Object.keys(allPlugins).filter(id => allPlugins[id].status === 'approved');

	if (args.id && !allPlugins[args.id]) {
		console.error(`No entry found for plugin ID: ${args.id}`);
		process.exit(1);
	}

	for (const pluginId of targetIds) {
		const plugin = allPlugins[pluginId];

		try {
			validateApprovedPlugin(pluginId, plugin);
		} catch (err) {
			console.error(`Validation failed: ${(err as Error).message}`);
			process.exit(1);
		}

		await buildPluginFromSource(pluginId, plugin, defaultOutputDir);
		console.log('');
	}
};

async function main() {
	const scriptName = 'plugin-source-builder';

	// eslint-disable-next-line @typescript-eslint/ban-types -- matches plugin-repo-cli pattern
	const commands: Record<string, Function> = {
		build: commandBuild,
	};

	let selectedCommand = '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let selectedCommandArgs: any = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const setSelectedCommand = (name: string, args: any) => {
		selectedCommand = name;
		selectedCommandArgs = args;
	};

	// eslint-disable-next-line no-unused-expressions
	require('yargs')
		.scriptName(scriptName)
		.usage('$0 <cmd> [args]')

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.command('build', 'Build approved plugins from source', (yargs: any) => {
			yargs.option('id', {
				type: 'string',
				describe: 'Build a specific plugin by its manifest ID',
			});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}, (args: any) => setSelectedCommand('build', args))

		.help()
		.argv;

	if (!selectedCommand) {
		console.error(`Please provide a command or run \`${scriptName} --help\``);
		process.exit(1);
	}

	await commands[selectedCommand](selectedCommandArgs);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
