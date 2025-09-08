import { CreateContestForm } from "@/components/contest/CreateContestForm";

export default function CreateContestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
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
