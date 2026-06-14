// Duplicate of packages/lib/services/conflict/node-diff3.d.ts. The lib shim lets the lib
// package type-check on its own, but its ambient declaration is not picked up when the
// desktop program follows into diffNotes.ts across packages, so the same minimal shim is
// needed here. Keep it in sync with the original and node_modules/node-diff3/src/diff3.d.ts.

declare module 'node-diff3' {
	export interface DiffIndicesResult<T> {
		buffer1: [number, number];
		buffer1Content: T[];
		buffer2: [number, number];
		buffer2Content: T[];
	}

	export function diffIndices<T>(buffer1: T[], buffer2: T[]): DiffIndicesResult<T>[];
}
