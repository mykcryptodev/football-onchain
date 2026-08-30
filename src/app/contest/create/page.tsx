import { CreateContestForm } from "@/components/contest/CreateContestForm";
import { PageHeader } from "@/components/page-header";

export default function CreateContestPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          description="Pick a game, set the box price, and share the link. Numbers get drawn once the board fills."
          eyebrow="Superbowl Squares"
          title="Create a contest"
        />
        <CreateContestForm />
      </div>
    </div>
  );
}
