import {RistrettoPoint} from "@noble/curves/ed25519";

export function generateKeyPair(bits: number) {
    const privateKey = generateRandomInteger(bits);
    const publicKey = mulBasePoint(privateKey);
    return {privateKey, publicKey: fromHexString(publicKey.toString(16))};
}

function generateRandomInteger(bits: number): bigint {
    const max = (1n << BigInt(bits)) - 1n;
    return BigInt(Math.floor(Math.random() * (Number(max) + 1)));
}

function mulBasePoint(scalar: bigint): bigint {
    return BigInt('0x' + RistrettoPoint.BASE.multiply(scalar).toHex())
}

const fromHexString = (hexString: string) => Uint8Array.from(Buffer.from(hexString.padStart(64, "0"), "hex"));
