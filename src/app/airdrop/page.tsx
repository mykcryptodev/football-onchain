import { AirdropForm } from "@/components/airdrop/AirdropForm";
import { PageHeader } from "@/components/page-header";

export default function AirdropPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          description="Send ERC-20 tokens or ERC-721 NFTs to multiple addresses in a single transaction."
          eyebrow="Tools"
          title="Airdrop tokens"
        />
        <AirdropForm />
      </div>
    </div>
  );
}
