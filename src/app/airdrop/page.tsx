import { AirdropForm } from "@/components/airdrop/AirdropForm";

export default function AirdropPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Airdrop Tokens</h1>
          <p className="text-muted-foreground mt-2">
            Send ERC-20 tokens or ERC-721 NFTs to multiple addresses in a single
            transaction.
          </p>
        </div>
        <AirdropForm />
      </div>
    </div>
  );
}
