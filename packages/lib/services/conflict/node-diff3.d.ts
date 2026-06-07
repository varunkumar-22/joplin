// node-diff3 ships its type declarations only through the package "exports" map
// (node-diff3/src/diff3.d.ts), which the classic CommonJS module resolution used by
// this package cannot read. This shim declares the small subset of the API we use.
// Keep it in sync with node_modules/node-diff3/src/diff3.d.ts.

declare module 'node-diff3' {
	export interface DiffIndicesResult<T> {
		buffer1: [number, number];
		buffer1Content: T[];
		buffer2: [number, number];
		buffer2Content: T[];
	}

	export function diffIndices<T>(buffer1: T[], buffer2: T[]): DiffIndicesResult<T>[];
}
