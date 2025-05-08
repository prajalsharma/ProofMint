"use client";
import { jwtDecode } from "jwt-decode";
import { signIn, signOut, useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session } = useSession();

  const decodedToken = () => {
    const decoded = jwtDecode(session.id_token);
    console.log(decoded);
  };
  return (
    <div style={{ padding: "2rem" }}>
      {!session ? (
        <button onClick={() => signIn("google")}>Sign in with Google</button>
      ) : (
        <>
          <p>Signed in as {session.user?.email}</p>
          <button onClick={() => signOut()}>Sign out</button>
          <h4>ID Token (JWT):</h4>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {session.id_token}
          </pre>
          <button onClick={() => console.log("JWT:", session.id_token)}>
            Log ID Token to console
          </button>
          <button onClick={decodedToken}>click to see decoded data</button>
        </>
      )}
    </div>
  );
}
