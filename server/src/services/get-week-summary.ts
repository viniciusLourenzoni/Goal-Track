import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import dayjs from "dayjs";

export async function getWeekSummary() {
  const lastDayOfWeek = dayjs().endOf("week").toDate();
  const firstDayOfWeek = dayjs().startOf("week").toDate();

  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.created_at,
      })
      .from(goals)
      .where(lte(goals.created_at, lastDayOfWeek))
  );

  const goalsCompletedInWeek = db.$with("goals_completed_in_week").as(
    db
      .select({
        id: goalCompletions.id,
        title: goals.title,
        completedAt: goalCompletions.created_at,
        completedAtDate: sql/*SQL*/ `
          DATE(${goalCompletions.created_at})
        `.as("completedAtDate"),
      })
      .from(goalCompletions)
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      .where(
        and(
          gte(goalCompletions.created_at, firstDayOfWeek),
          lte(goalCompletions.created_at, lastDayOfWeek)
        )
      )
  );

  const goalsCompletededByWeekDay = db.$with("goals_completed_by_week_day").as(
    db
      .select({
        completedAtDate: goalsCompletedInWeek.completedAtDate,
        completions: sql/*SQL*/ `
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ${goalsCompletedInWeek.id},
            'title', ${goalsCompletedInWeek.title},
            'completedAt', ${goalsCompletedInWeek.completedAt}
          )
        )    
        `.as("completions"),
      })
      .from(goalsCompletedInWeek)
      .groupBy(goalsCompletedInWeek.completedAtDate)
  );

  const result = await db
    .with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompletededByWeekDay)
    .select({
      completed: sql/*SQL*/ `
            (SELECT COUNT(*) FROM ${goalsCompletedInWeek})
        `.mapWith(Number),

      total: sql/*SQL*/ `
        (SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})
      `.mapWith(Number),
      goalsPerDay: sql/*SQL*/ `
        JSON_OBJECT_AGG(
          ${goalsCompletededByWeekDay.completedAtDate},
          ${goalsCompletededByWeekDay.completions}
        )
      `,
    })
    .from(goalsCompletededByWeekDay);

  return {
    summary: result[0],
  };
}
