"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { signIn, useSession, signOut } from "next-auth/react";
import { JWTCircuitHelper } from "@/lib/generateProof";

export default function Page() {
  const { data: session } = useSession();

  const handleLogin = async () => {
    signIn("google");
  };
 
  const handleLogout = () => {
    signOut();
  };

  const handleGenerateAndVerifyProof = async () => {
    if (!session?.id_token) {
      console.error("No JWT token available");
      return;
    }

    try {
      const idToken = session.id_token;
      console.log("idToken", idToken);
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

      console.log("good till here");
    
      const keyId = "07b80a365428525f8bf7cd0846d74a8ee4ef3625";
      console.log("keyId", keyId);
      const googleJWTPubkey = await fetchGooglePublicKey(keyId);
      if (!googleJWTPubkey) {
        throw new Error(
          "Could not find Google public key for the provided key ID."
        );
      }

      console.log("good till here2");

    
      console.log("Domain:", domain);
      console.log("Google JWT public key:", googleJWTPubkey);
    
      console.log("idToken", idToken);
      console.log("googleJWTPubkey", googleJWTPubkey);
      console.log("domain", domain);
      // Generate proof using the JWT and its public key
      const proof = await JWTCircuitHelper.generateProof({
        idToken,
        jwtPubkey: googleJWTPubkey,
        domain,
      });

      console.log("good till here3");

    
      console.log("Proof generated:", proof);
    
      // const { modulus } = jwkToRsaParams(googleJWTPubkey);
    
      // // Optionally verify the proof (if necessary)
      // const proofVerificationResult = await JWTCircuitHelper.verifyProof(
      //   proof.proof,
      //   {
      //     domain,
      //     jwtPubKey: modulus,
      //   }
      // );
    
      // console.log("Proof verification result:", !proofVerificationResult);
      // if (proofVerificationResult) {
      //   alert("Proof verified successfully!");
      // } else {
      //   alert("Proof verification failed");
      // }
    } catch (error) {
      console.error("Error generating/verifying proof:", error);
      alert("Error generating or verifying proof");
    }
  };

  return (
    <main className="text-center text-cream max-w-2xl py-10 mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-brownish">
        Anonymous Feedback with Zero Knowledge
      </h1>
      <p className="mb-10">
        Use zero-knowledge proofs to log in and prove eligibility without
        revealing your identity. Submit feedback privately and securely.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
        <Card className="bg-[#18132f] border border-[#2c254b]">
          <CardContent className="px-6 flex flex-col gap-4 items-start justify-start text-left">
            <div className="flex items-center justify-between gap-2 w-full">
              <h2 className="text-3xl font-semibold text-brownish">
                Anonymous Feedback
              </h2>
              <Image src="/arrow.svg" alt="" width={95} height={95} />
            </div>
            <p className="text-cream text-sm">
              Prove organizational affiliation or log in with your work email to
              submit feedback.
            </p>
            <Button 
              onClick={handleLogin}
              className="text-cream border-2 border-cream bg-transparent font-medium hover:text-darkblue hover:bg-cream w-full"
            >
              {session ? `Signed in as ${session.user?.email}` : 'Log In with Google'}
            </Button>
            {session && (
              <Button 
                onClick={handleGenerateAndVerifyProof}
                className="text-cream border-2 border-cream bg-transparent font-medium hover:text-darkblue hover:bg-cream w-full"
              >
                Generate & Verify Proof
              </Button>
            )}
            <Button 
              onClick={handleLogout}
              className="text-cream border-2 border-cream bg-transparent font-medium hover:text-darkblue hover:bg-cream w-full"
            >
              Log Out
            </Button>
          </CardContent>
        </Card>

        {/* <Card className="bg-[#18132f] border border-[#2c254b]">
          <CardContent className="px-6 flex flex-col gap-4 items-start justify-between text-left h-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <h2 className="text-3xl font-semibold text-brownish">Polling</h2>
              <Image src="/graph.svg" alt="" width={75} height={75} />
            </div>
            <p className="text-cream text-sm mt-3.5">
              Log in with ZK or your email to participate in a poll, then anonymously view results.
            </p>
            <Button className="text-cream border-2 border-cream bg-transparent font-medium hover:text-darkblue hover:bg-cream w-full">
              Log In with ZK
            </Button>
          </CardContent>
        </Card> */}
      </div>
    </main>
  );
}

// Helper functions from testinput.ts
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
