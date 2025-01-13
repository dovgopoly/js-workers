/* tslint:disable */
/* eslint-disable */
export function create_kangaroo(table: Table): WASMKangaroo;
export enum Table {
  Table32 = 0,
  Table48 = 1,
}
export class WASMKangaroo {
  private constructor();
  free(): void;
  solve_dlp(pk: Uint8Array, max_time?: bigint | null): bigint | undefined;
}
