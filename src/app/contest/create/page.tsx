import { CreateContestForm } from "@/components/contest/CreateContestForm";

export default function CreateContestPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Create New Contest
          </h1>
          <p className="text-muted-foreground mt-2">
            Set up a new football squares contest for your next game.
          </p>
        </div>
        <CreateContestForm />
      </div>
    </div>
  );
}
