import Image from "next/image";
import { Button } from "./ui/button";
import { Wallet } from "lucide-react";
import Link from "next/link";

const Header = () => {
  return (
    <header className="w-full lg:w-[75%] mx-auto flex justify-between items-center mb-8">
      <div className="flex items-center gap-2 text-xl font-semibold">
        <Link href="/" className="flex items-center gap-2 uppercase text-2xl">
          <Image src="/logo.svg" alt="Logo" width={75} height={75} className="" />
          <span className="text-cream">
            Proof<span className="text-brownish">Mint</span>
          </span>
        </Link>
      </div>
      <Button className="text-cream text-lg border-1 border-cream bg-transparent hover:bg-cream hover:text-darkblue transition-colors px-10 py-5">
        <Wallet className="mr-1" /> <span className="hidden md:block">Connect Wallet</span>
      </Button>
    </header>
  );
};
export default Header;
