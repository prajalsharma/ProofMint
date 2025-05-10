# 🕵️‍♂️ zk Anonymous Feedback dApp

A private, anonymous feedback platform that proves you belong without revealing who you are.
## ✨ What is this?

This app lets people give honest, anonymous feedback in a group (like a company or school), while still proving they have the right to be there.

Video Demo of our project [ProofMint](https://www.youtube.com/watch?v=t6UT7AVIm9k)

We use:

    🔐 Google login – to check if you're part of a domain (like @delhitechinicalcampus.ac.in)

    🧠 Zero-knowledge proofs – to prove that without showing your identity

    ⚙️ Noir, zkJWT – all the cool zk tools to make it work

## 🧪 How it works

    Sign in with Google
    You log in normally. We never see your email just the proof you belong to the domain.

    Generate a zero-knowledge proof
    Inside your browser, we generate a zk proof that says:

        You signed in with Google

        Your email ends in something like @any-org.com

        You didn’t reveal who you are

    Submit the anon feedback form made for an org or group

    Post feedback
    You submit feedback, and we verify it came from a real, authorized user—without ever knowing who.

## 📦 Circuit Setup, Usage and Output

You’ll need to build the Noir circuit:

nargo build

In the app, we compile and run the circuit inside the browser to wasm to be able to run.

[Circuits](/circuits/) are available here
- [Feedback Circuit](/circuits/feedback_circuit/) is used generate and verify the proof of feedback submission (can be used using ` bun run lib/test-feedback-circuit/test` command)

**Output**:
```
Proof Generation Time: 55411.811143 ms
------started verifying proofs-------------
Proof Verified: true
Verification Time: 21962.619143999997 ms
```
- [JWT](/circuits/jwt_circuit/) circuit is used to verifying the google's `id_token` and generating the proofs. (proof generation can be seen using `bun run lib/testinput.ts` command)

**Output**:
```
id_token
 eyJhbGciOiJSUzI1NiIsImtpZMzNzkyNGUiLCJ0eXA....Z2GPZ2nJ2b4CoGNiR2mBZvQrxXmUL2T1Np4F21CI8gS3hN4KegWZ4Ra9JOj3hV7wTKxzaWsWg
googleJWTPubkey {
  n: "u4iU.....-qZEwRqn5lL_wddZ8-3-3sfGgu5t8i-YECOcECPLhbzw",
  kty: "RSA",
  alg: "RS256",
  kid: "e14c37d6e5c756e8b72fdb5004c0cc356337924e",
  e: "AQAB",
  use: "sig",
}

domain delhitechnicalcampus.ac.in
Proof verification result: true

```

## 🛠 Tech Stack

| Tech     | Purpose                               |
|----------|---------------------------------------|
| Next.js  | Frontend and app framework            |
| Noir     | zk circuit language                   |
| zkJWT    | Verifies Google ID token (JWT) in zk  |

## 🚀 Getting Started

```
git clone https://github.com/prajalsharma/ProofMint

cd zk-feedback-dapp
npm install
npm run dev
```
