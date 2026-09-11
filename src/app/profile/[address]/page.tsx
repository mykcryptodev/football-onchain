import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";

import PlayerProfile from "@/components/profile/PlayerProfile";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return { title: `Player ${address.slice(0, 6)}…${address.slice(-4)}` };
}

export default async function ProfilePage({ params }: Props) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  return <PlayerProfile address={address.toLowerCase()} />;
}
