import { pgTable, text, bigint, timestamp, uuid } from "drizzle-orm/pg-core";

export const neynarSigners = pgTable("neynar_signers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fid: bigint("fid", { mode: "number" }).notNull().unique(),
  signerUuid: text("signer_uuid").notNull(),
  status: text("status").notNull().default("pending_approval"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
