CREATE TABLE "neynar_signers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fid" bigint NOT NULL,
	"signer_uuid" text NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "neynar_signers_fid_unique" UNIQUE("fid")
);
