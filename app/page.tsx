"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function Page() {
  return (
    <main className="text-center text-cream max-w-2xl py-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-brownish">
        Anonymous Feedback and Polling with Zero Knowledge
      </h1>
      <p className="mb-10">
        Use zero-knowledge proofs to log in and prove eligibility without revealing your identity.
        Submit feedback or vote privately and securely.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#18132f] border border-[#2c254b]">
          <CardContent className="px-6 flex flex-col gap-4 items-start justify-start text-left">
            <div className="flex items-center justify-between gap-2 w-full">
              <h2 className="text-3xl font-semibold text-brownish">Anonymous Feedback</h2>
              <Image src="/arrow.svg" alt="" width={95} height={95} />
            </div>
            <p className="text-cream text-sm">
              Prove organizational affiliation or log in with your work email to submit feedback.
            </p>
            <Button className="text-cream border-2 border-cream bg-transparent font-medium hover:text-darkblue hover:bg-cream w-full">
              Log In with ZK
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#18132f] border border-[#2c254b]">
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
        </Card>
      </div>
    </main>
  );
}
