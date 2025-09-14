'use server';
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";

import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// User table
const record = sqliteTable("record", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  score: integer("score").notNull(),
  recordTime: text("record_time").notNull(),
});

// This is the one to use for static routes (i.e. ISR/SSG)
export const getDbAsync = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { record });
});

// Server actions for leaderboard functionality
export async function getTopScores(limit = 50) {
  try {
    const db = await getDbAsync();
    const scores = await db
      .select()
      .from(record)
      .orderBy(sql`${record.score} DESC`)
      .limit(limit);
    return { success: true, data: scores };
  } catch (error) {
    console.error('Failed to fetch top scores:', error);
    return { success: false, error: 'Failed to fetch leaderboard data' };
  }
}

export async function addScore(playerName, score, recordTime) {
  try {
    const db = await getDbAsync();
    const newRecord = await db
      .insert(record)
      .values({
        name: playerName,
        score: score,
        recordTime: recordTime,
      })
      .returning();
    return { success: true, data: newRecord[0] };
  } catch (error) {
    console.error('Failed to add score:', error);
    return { success: false, error: 'Failed to save score' };
  }
}
