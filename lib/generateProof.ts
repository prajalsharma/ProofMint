import { generateInputs } from "noir-jwt";
import type { Noir } from "@noir-lang/noir_js";
import { type InputMap, type CompiledCircuit } from "@noir-lang/noir_js";
import type { UltraHonkBackend, BarretenbergVerifier } from "@aztec/bb.js";

const MAX_DOMAIN_LENGTH = 64;

const safeImport = async (modulePath) => {
  try {
    return await import(modulePath);
  } catch (error) {
    console.error(`Failed to import ${modulePath}:`, error);
    throw new Error(`Module import failed: ${modulePath} - ${error.message}`);
  }
};


async function initProver() {
  try {
    const noirModule = await safeImport("@noir-lang/noir_js");
    const aztecModule = await safeImport("@aztec/bb.js");
    
    if (!noirModule.Noir) {
      throw new Error("Noir class not found in @noir-lang/noir_js");
    }
    
    if (!aztecModule.UltraHonkBackend) {
      throw new Error("UltraHonkBackend not found in @aztec/bb.js");
    }
    
    return {
      Noir: noirModule.Noir,
      UltraHonkBackend: aztecModule.UltraHonkBackend
    };
  } catch (error) {
    console.error("Failed to initialize prover:", error);
    throw new Error(`Prover initialization failed: ${error.message}`);
  }
}


async function initVerifier() {
  try {
    const aztecModule = await safeImport("@aztec/bb.js");
    
    if (!aztecModule.BarretenbergVerifier) {
      throw new Error("BarretenbergVerifier not found in @aztec/bb.js");
    }
    
    return { 
      BarretenbergVerifier: aztecModule.BarretenbergVerifier 
    };
  } catch (error) {
    console.error("Failed to initialize verifier:", error);
    throw new Error(`Verifier initialization failed: ${error.message}`);
  }
}


function splitBigIntToLimbs(
  bigInt: bigint,
  byteLength: number,
  numLimbs: number
): bigint[] {
  const chunks: bigint[] = [];
  const mask = (1n << BigInt(byteLength)) - 1n;

  for (let i = 0; i < numLimbs; i++) {
    const shift = BigInt(i) * BigInt(byteLength);
    const chunk = (bigInt / (1n << shift)) & mask;
    chunks.push(chunk);
  }

  return chunks;
}


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

    // Generate JWT inputs
    const jwtInputs = await generateInputs({
      jwt: idToken,
      pubkey: jwtPubkey,
      shaPrecomputeTillKeys: ["email_verified", "email", "hd"],
      maxSignedDataLength: 640,
    });

    // Prepare domain input
    const domainUint8Array = new Uint8Array(MAX_DOMAIN_LENGTH);
    domainUint8Array.set(Uint8Array.from(new TextEncoder().encode(domain)));

    // Helper function to pad arrays to required length
    function padToLength(arr: number[], targetLength: number): string[] {
      const padded = new Array(targetLength).fill(0);
      arr.forEach((val, idx) => {
        padded[idx] = val;
      });
      return padded.map((v) => BigInt(v).toString());
    }

    // Prepare circuit inputs
    const inputs = {
      partial_data: {
        storage: padToLength(jwtInputs.partial_data?.storage ?? [], 1024),
        len: jwtInputs.partial_data?.len ?? 0,
      },
      partial_hash: (jwtInputs.partial_hash ?? []).map((x) =>
        BigInt(x).toString()
      ),
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

    console.log("JWT circuit inputs prepared");

    try {
      // Initialize prover
      const { Noir, UltraHonkBackend } = await initProver();
      
      // Load circuit artifact
      const circuitArtifact = await safeImport("../public/circuit/jwt/circuit.json");
      
      // Create backend instance
      const backend = new UltraHonkBackend(circuitArtifact.bytecode, {
        threads: 8,
      });
      
      // Create Noir instance
      const noir = new Noir(circuitArtifact as CompiledCircuit);

      // Generate witness and prove
      console.log("Generating proof...");
      const startTime = performance.now();
      const { witness } = await noir.execute(inputs as InputMap);
      const proof = await backend.generateProof(witness);
      const provingTime = performance.now() - startTime;

      console.log(`Proof generated in ${provingTime}ms`);
      return proof;
    } catch (error) {
      console.error("Proof generation failed:", error);
      throw new Error(`[JWT Circuit] Proof generation failed: ${error.message}`);
    }
  },

  verifyProof: async (
    proof: Uint8Array,
    {
      domain,
      jwtPubKey,
    }: {
      domain: string;
      jwtPubKey: bigint;
    }
  ) => {
    // Input validation
    if (!domain || !jwtPubKey) {
      throw new Error(
        "[JWT Circuit] Proof verification failed: invalid public inputs"
      );
    }

    try {
      // Initialize verifier
      const { BarretenbergVerifier } = await initVerifier();

      // Load verification key
      const vkey = await safeImport("../public/circuit/jwt/circuit-vkey.json");

      // Prepare public inputs
      const publicInputs = [];

      // Push modulus limbs as 64 char hex strings (18 Fields)
      const modulusLimbs = splitBigIntToLimbs(jwtPubKey, 120, 18);
      publicInputs.push(
        ...modulusLimbs.map((s) => "0x" + s.toString(16).padStart(64, "0"))
      );

      const domainUint8Array = new Uint8Array(64);
      domainUint8Array.set(Uint8Array.from(new TextEncoder().encode(domain)));
      publicInputs.push(
        ...Array.from(domainUint8Array).map(
          (s) => "0x" + s.toString(16).padStart(64, "0")
        )
      );
      publicInputs.push("0x" + domain.length.toString(16).padStart(64, "0"));

      const proofData = {
        proof: proof,
        publicInputs,
      };

      const verifier = new BarretenbergVerifier({
        crsPath: process.env.TEMP_DIR,
      });
      
      const result = await verifier.verifyUltraHonkProof(
        proofData,
        Uint8Array.from(vkey)
      );

      return result;
    } catch (error) {
      console.error("Proof verification failed:", error);
      throw new Error(`[JWT Circuit] Proof verification failed: ${error.message}`);
    }
  },
};