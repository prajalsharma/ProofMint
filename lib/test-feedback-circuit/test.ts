import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import circuit from "../../public/circuit/feedback_circuit/feedback_circuit.json"; // Your hash folding circuit

// Helper: hash string -> Uint8Array (padded to 32 bytes)
function padTo32Bytes(text: string): Uint8Array {
  const padded = new Uint8Array(32);
  padded.set(new TextEncoder().encode(text));
  return padded;
}

// Helper: hash using WebCrypto
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

// Folded hash of multiple inputs
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

// Generate proof for hash folding circuit
async function generateProofForHashCircuit(feedbackStrings: string[]) {
  const NUM_INPUTS = 10; // Maximum number of inputs
  const actualInputCount = feedbackStrings.length;

  // Pad all feedback strings to 32 bytes
  const paddedInputs: Uint8Array[] = feedbackStrings.map(padTo32Bytes);

  // If we have fewer than 10 inputs, pad the rest with zeros
  while (paddedInputs.length < NUM_INPUTS) {
    paddedInputs.push(new Uint8Array(32)); // pad with zeros
  }

  // Compute the folded hash (root hash) to prove against
  const publishedHash = await computeFoldedHash(
    paddedInputs.slice(0, actualInputCount)
  );

  // Prepare Noir inputs (inputs, actual_input_count, and published_hash)
  const input = {
    inputs: paddedInputs.map((u8) => Array.from(u8)),
    actual_input_count: actualInputCount,
    published_hash: Array.from(publishedHash),
  };

  // Initialize Noir and UltraHonkBackend
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

  // Ensure proof and public inputs are properly parsed
  const proofParsed =
    typeof proof === "string" ? Uint8Array.from(JSON.parse(proof)) : proof;

  const publicInputsParsed =
    typeof publicInputs === "string" ? JSON.parse(publicInputs) : publicInputs;

  const startTime = performance.now();

  // Verify the proof using backend
  const verified = await backend.verifyProof({
    proof: proofParsed,
    publicInputs: publicInputsParsed,
  });

  const verificationTime = performance.now() - startTime;

  return { verified, verificationTime };
}

async function exampleUsage(feedbackStrings: string[]) {
    console.log("------started generateing proofs-------------")
  // Step 1: Generate proof for the feedback circuit
  const { proof, publicInputs, provingTime } =
    await generateProofForHashCircuit(feedbackStrings);

  console.log("Generated Proof:", proof);
  console.log("Public Inputs:", publicInputs);
  console.log("Proof Generation Time:", provingTime, "ms");

  // Step 2: Verify the proof
  const { verified, verificationTime } = await verifyProof(proof, publicInputs);

  console.log("------started verifying proofs-------------")

  console.log("Proof Verified:", verified);
  console.log("Verification Time:", verificationTime, "ms");
}

// Example usage
exampleUsage([
  "Hello Noir!",
  "This is feedback",
  "More fields later maybe",
  // Add more strings as needed
]);
