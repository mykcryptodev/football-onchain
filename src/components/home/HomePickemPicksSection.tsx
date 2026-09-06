"use client";
import MyPickems from "@/components/pickem/MyPickems";

export function HomePickemPicksSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <MyPickems compact />
    </section>
  );
}
