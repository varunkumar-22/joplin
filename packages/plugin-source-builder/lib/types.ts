export interface ApprovedPlugin {
	repository_url: string;
	reviewed_commit: string;
	review_date: string;
	reviewer: string;
	status: string;
	build_command: string;
	publish_dir: string;
}

export type ApprovedPlugins = Record<string, ApprovedPlugin>;

// the manifest.json inside a built .jpl archive
// index signature lets us stamp _review_* fields onto it
export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	[key: string]: unknown;
}

export interface BuildResult {
	pluginId: string;
	jplPath: string;
	manifest: PluginManifest;
}

// injected into buildPluginFromSource so tests can intercept shell calls without actually running git or npm
export type ExecFn = (command: string, cwd?: string) => void;
