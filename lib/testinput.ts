import { JWTCircuitHelper } from "./generateProof";

const idToken = process.env.JWT;
const [headerB64, payloadB64] = idToken.split(".");
const header = JSON.parse(atob(headerB64));
const payload = JSON.parse(atob(payloadB64));

const domain = payload.hd;
if (!domain) {
  throw new Error(
    "Domain not found in JWT. This JWT might not be from a Google Workspace account."
  );
}

const keyId = header.kid;
const googleJWTPubkey = await fetchGooglePublicKey(keyId);
if (!googleJWTPubkey) {
  throw new Error("Could not find Google public key for the provided key ID.");
}

console.log("Domain:", domain);
console.log("Google JWT public key:", googleJWTPubkey);

// Generate proof using the JWT and its public key
const proof = await JWTCircuitHelper.generateProof({
  idToken,
  jwtPubkey: googleJWTPubkey,
  domain,
});

console.log("Proof generated:", proof);


// // Optionally verify the proof (if necessary)
// const proofVerificationResult = await JWTCircuitHelper.verifyProof(
//   proof.proof,
//   {
//     domain,
//     jwtPubKey: googleJWTPubkey,
//   }
// );

// console.log("Proof verification result:", proofVerificationResult);

async function fetchGooglePublicKey(keyId: string) {
  if (!keyId) {
    return null;
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const keys = await response.json();

  const key = keys.keys.find((key: { kid: string }) => key.kid === keyId);
  if (!key) {
    console.error(`Google public key with id ${keyId} not found`);
    return null;
  }

  return key;
}
