import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import circuit from "../../public/circuit/feedback_circuit/feedback_circuit.json"; // Your hash folding circuit

function padTo32Bytes(text: string): Uint8Array {
  const padded = new Uint8Array(32);
  padded.set(new TextEncoder().encode(text));
  return padded;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

async function computeFoldedHash(
  paddedInputs: Uint8Array[]
): Promise<Uint8Array> {
  const hashes = await Promise.all(paddedInputs.map((b) => sha256(b)));

  let current = hashes[0];
  for (let i = 1; i < hashes.length; i++) {
    const concat = new Uint8Array(64);
    concat.set(current);
    concat.set(hashes[i], 32);
    current = await sha256(concat);
  }
  return current;
}

async function generateProofForHashCircuit(feedbackStrings: string[]) {
  const NUM_INPUTS = 10; // Maximum number of inputs
  const actualInputCount = feedbackStrings.length;

  const paddedInputs: Uint8Array[] = feedbackStrings.map(padTo32Bytes);

  while (paddedInputs.length < NUM_INPUTS) {
    paddedInputs.push(new Uint8Array(32)); // pad with zeros
  }

  const publishedHash = await computeFoldedHash(
    paddedInputs.slice(0, actualInputCount)
  );

  const input = {
    inputs: paddedInputs.map((u8) => Array.from(u8)),
    actual_input_count: actualInputCount,
    published_hash: Array.from(publishedHash),
  };

  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);

  const startTime = performance.now();

  // Generate the witness and proof
  const { witness } = await noir.execute(input);
  const proof = await backend.generateProof(witness);
  const provingTime = performance.now() - startTime;

  // Return the proof, public inputs, and proving time
  return {
    proof: proof.proof,
    publicInputs: proof.publicInputs,
    provingTime,
  };
}

async function verifyProof(proof, publicInputs) {
  const backend = new UltraHonkBackend(circuit.bytecode);

  const proofParsed =
    typeof proof === "string" ? Uint8Array.from(JSON.parse(proof)) : proof;

  const publicInputsParsed =
    typeof publicInputs === "string" ? JSON.parse(publicInputs) : publicInputs;

  const startTime = performance.now();

  const verified = await backend.verifyProof({
    proof: proofParsed,
    publicInputs: publicInputsParsed,
  });

  const verificationTime = performance.now() - startTime;

  return { verified, verificationTime };
}

async function exampleUsage(feedbackStrings: string[]) {
    console.log("------started generateing proofs-------------")
  const { proof, publicInputs, provingTime } =
    await generateProofForHashCircuit(feedbackStrings);

  console.log("Generated Proof:", proof);
  console.log("Public Inputs:", publicInputs);
  console.log("Proof Generation Time:", provingTime, "ms");

  const { verified, verificationTime } = await verifyProof(proof, publicInputs);

  console.log("------started verifying proofs-------------")

  console.log("Proof Verified:", verified);
  console.log("Verification Time:", verificationTime, "ms");
}

exampleUsage([
  "Hello Noir!",
  "This is feedback",
  "More fields later maybe",
]);
