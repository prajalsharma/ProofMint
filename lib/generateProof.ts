import { generateInputs } from "noir-jwt";
import { type Noir } from "@noir-lang/noir_js";
import { InputMap, type CompiledCircuit } from "@noir-lang/noir_js";

import { type UltraHonkBackend, type BarretenbergVerifier } from "@aztec/bb.js";

const MAX_DOMAIN_LENGTH = 64;

export const JWTCircuitHelper = {
  version: "0.3.1",
  generateProof: async ({
    idToken,
    jwtPubkey,
    domain,
  }: {
    idToken: string;
    jwtPubkey: JsonWebKey;
    domain: string;
  }) => {
    if (!idToken || !jwtPubkey) {
      throw new Error(
        "[JWT Circuit] Proof generation failed: idToken and jwtPubkey are required"
      );
    }

    const signedData = idToken.split(".").slice(0, 2).join(".");
    console.log("Signed data length:", signedData.length);

    const jwtInputs = await generateInputs({
      jwt: idToken,
      pubkey: jwtPubkey,
      shaPrecomputeTillKeys: ["email_verified", "email", "hd"],
      maxSignedDataLength: 640,
    });

    const domainUint8Array = new Uint8Array(MAX_DOMAIN_LENGTH);
    domainUint8Array.set(Uint8Array.from(new TextEncoder().encode(domain)));

    function padToLength(arr: number[], targetLength: number): string[] {
      const padded = new Array(targetLength).fill(0);
      arr.forEach((val, idx) => {
        padded[idx] = val;
      });
      return padded.map((v) => BigInt(v).toString());
    }

    const inputs = {
      partial_data: {
        storage: padToLength((jwtInputs.partial_data?.storage ?? []), 1024),
        len: jwtInputs.partial_data?.len ?? 0,
      },
      partial_hash: (jwtInputs.partial_hash ?? []).map((x) => BigInt(x).toString()),
      full_data_length: BigInt(jwtInputs.full_data_length ?? 0).toString(),
      base64_decode_offset: BigInt(jwtInputs.base64_decode_offset).toString(),
      jwt_pubkey_modulus_limbs: jwtInputs.pubkey_modulus_limbs.map((x) =>
        BigInt(x).toString()
      ),
      jwt_pubkey_redc_params_limbs: jwtInputs.redc_params_limbs.map((x) =>
        BigInt(x).toString()
      ),
      jwt_signature_limbs: jwtInputs.signature_limbs.map((x) =>
        BigInt(x).toString()
      ),
      domain: {
        storage: padToLength(Array.from(domainUint8Array), 64),
        len: BigInt(domain.length).toString(),
      },
    };

    console.log("JWT circuit inputs", inputs);

    const { Noir, UltraHonkBackend } = await initProver();
    const circuitArtifact = await import(`../public/circuit/jwt/circuit.json`);
    const backend = new UltraHonkBackend(circuitArtifact.bytecode, {
      threads: 8,
    });
    const noir = new Noir(circuitArtifact as CompiledCircuit);

    // Generate witness and prove
    const startTime = performance.now();
    const { witness } = await noir.execute(inputs as InputMap);
    const proof = await backend.generateProof(witness);
    const provingTime = performance.now() - startTime;

    console.log(`Proof generated in ${provingTime}ms`);

    return proof;
  },
};

let proverPromise: Promise<{
  Noir: typeof Noir;
  UltraHonkBackend: typeof UltraHonkBackend;
}> | null = null;

async function initProver() {
  if (!proverPromise) {
    proverPromise = (async () => {
      const [{ Noir }, { UltraHonkBackend }] = await Promise.all([
        import("@noir-lang/noir_js"),
        import("@aztec/bb.js"),
      ]);
      return {
        Noir,
        UltraHonkBackend,
      };
    })();
  }
  return proverPromise;
}
