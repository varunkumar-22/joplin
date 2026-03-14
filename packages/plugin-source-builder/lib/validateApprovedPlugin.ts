import { ApprovedPlugin } from './types';

// validates a single entry from approved-plugins.json before any build starts
const validateApprovedPlugin = (pluginId: string, entry: Partial<ApprovedPlugin>): void => {
	if (!entry.repository_url || !/^https:\/\/github\.com\/.+\/.+/.test(entry.repository_url)) {
		throw new Error(`Plugin "${pluginId}": invalid or missing repository_url — must be a full https://github.com/<owner>/<repo> URL`);
	}

	if (!entry.reviewed_commit || entry.reviewed_commit.trim() === '') {
		throw new Error(`Plugin "${pluginId}": missing reviewed_commit — a full commit SHA is required`);
	}

	if (!entry.status) {
		throw new Error(`Plugin "${pluginId}": missing status`);
	}

	if (!entry.build_command) {
		throw new Error(`Plugin "${pluginId}": missing build_command`);
	}

	if (!entry.publish_dir) {
		throw new Error(`Plugin "${pluginId}": missing publish_dir`);
	}
};

export default validateApprovedPlugin;
