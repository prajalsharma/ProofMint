import { JWTCircuitHelper } from "./generateProof";

const handleGenerateProof = async () => {
  const idToken = process.env.JWT;
  if (!idToken) {
    throw new Error("JWT is not defined in the environment variables.");
  }
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
    throw new Error(
      "Could not find Google public key for the provided key ID."
    );
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

  console.log("idToken", idToken);
      console.log("googleJWTPubkey", googleJWTPubkey);
      console.log("domain", domain);

  const { modulus } = jwkToRsaParams(googleJWTPubkey);

  // Optionally verify the proof (if necessary)
  const proofVerificationResult = await JWTCircuitHelper.verifyProof(
    proof.proof,
    {
      domain,
      jwtPubKey: modulus,
    }
  );

  console.log("Proof verification result:", !proofVerificationResult);
};

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


handleGenerateProof();

function jwkToRsaParams(jwk: JsonWebKey): { modulus: bigint; exponent: bigint } {
  if (!jwk.n || !jwk.e) {
    throw new Error("Invalid JWK: missing modulus or exponent");
  }

  function base64UrlToBigInt(base64url: string): bigint {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    let hex = '0x' + Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return BigInt(hex);
  }

  return {
    modulus: base64UrlToBigInt(jwk.n),
    exponent: base64UrlToBigInt(jwk.e),
  };
}
