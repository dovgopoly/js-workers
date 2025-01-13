import { expose } from "threads/worker"
import { create_kangaroo, Table } from "../pkg";

const startMainTime = performance.now();

const kangaroo = create_kangaroo(Table.Table48);

const elapsedMainTime = performance.now() - startMainTime;

console.log(`Worker init in: ${elapsedMainTime / 1000} seconds`);

expose({
    solve(pk: Uint8Array, maxTime?: bigint): bigint | undefined {
        return kangaroo.solve_dlp(pk, maxTime);
    }
});
