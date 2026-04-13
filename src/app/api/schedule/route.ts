import { NextRequest } from "next/server";
import pool from "@/lib/db";

function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    return date;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(time: Date | string | null): string | null {
  if (!time) return null;
  if (typeof time === "string") {
    return time;
  }
  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatRow(row: any) {
  return {
    ...row,
    start_date: formatDate(row.start_date),
    end_date: formatDate(row.end_date),
    is_all_day: !!row.is_all_day,
    start_time: formatTime(row.start_time),
    end_time: formatTime(row.end_time),
    recurrence_type: row.recurrence_type || "none",
    recurrence_end_date: row.recurrence_end_date
      ? formatDate(row.recurrence_end_date)
      : null,
    recurrence_parent_id: row.recurrence_parent_id || null,
  };
}

/** Generate recurring event dates from a base event */
function generateRecurrenceDates(
  startDate: string,
  endDate: string,
  recurrenceType: string,
  recurrenceEndDate: string
): { start: string; end: string }[] {
  const dates: { start: string; end: string }[] = [];
  const base = new Date(startDate + "T00:00:00");
  const baseEnd = new Date(endDate + "T00:00:00");
  const duration = baseEnd.getTime() - base.getTime();
  const limit = new Date(recurrenceEndDate + "T00:00:00");

  // First occurrence is the base itself (inserted as the parent row)
  // Generate subsequent occurrences
  let cursor = new Date(base);

  const advance = (d: Date): Date => {
    const next = new Date(d);
    switch (recurrenceType) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekdays":
        next.setDate(next.getDate() + 1);
        // Skip weekends
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  };

  cursor = advance(cursor);

  while (cursor <= limit && dates.length < 365) {
    const s = formatDate(cursor);
    const e = formatDate(new Date(cursor.getTime() + duration));
    dates.push({ start: s, end: e });
    cursor = advance(cursor);
  }

  return dates;
}

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get("year");
    const month = req.nextUrl.searchParams.get("month");

    let query = "SELECT * FROM schedule_events";
    const params: (string | number)[] = [];

    if (year && month) {
      const monthStr = String(month).padStart(2, "0");
      const firstDayOfMonth = `${year}-${monthStr}-01`;
      const lastDayOfMonth = new Date(
        parseInt(year as string),
        parseInt(month as string),
        0
      );
      const lastDayStr = formatDate(lastDayOfMonth);

      query += " WHERE start_date <= ? AND end_date >= ?";
      params.push(lastDayStr, firstDayOfMonth);
    }

    query += " ORDER BY start_date ASC, start_time ASC";

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(query, params);
      const formattedRows = (rows as any[]).map(formatRow);
      return Response.json({ events: formattedRows });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch events";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      start_date,
      end_date,
      is_all_day,
      start_time,
      end_time,
      category,
      color,
      location,
      description,
      priority = "medium",
      recurrence_type = "none",
      recurrence_end_date = null,
    } = body;

    if (!title || !start_date || !end_date || !category || !color) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!is_all_day && (!start_time || !end_time)) {
      return Response.json(
        {
          error:
            "start_time and end_time are required for non-all-day events",
        },
        { status: 400 }
      );
    }

    if (recurrence_type !== "none" && !recurrence_end_date) {
      return Response.json(
        { error: "recurrence_end_date is required for recurring events" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      // Insert the parent (first occurrence)
      const insertQuery =
        "INSERT INTO schedule_events (title, start_date, end_date, is_all_day, start_time, end_time, category, color, location, description, priority, recurrence_type, recurrence_end_date, recurrence_parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

      const [parentResult]: any = await connection.execute(insertQuery, [
        title,
        start_date,
        end_date,
        is_all_day ? 1 : 0,
        is_all_day ? null : start_time,
        is_all_day ? null : end_time,
        category,
        color,
        location || "",
        description || null,
        priority,
        recurrence_type,
        recurrence_end_date || null,
        null, // parent has no parent_id
      ]);

      const parentId = parentResult.insertId;
      let childCount = 0;

      // Generate recurring instances
      if (recurrence_type !== "none" && recurrence_end_date) {
        const occurrences = generateRecurrenceDates(
          start_date,
          end_date,
          recurrence_type,
          recurrence_end_date
        );

        for (const occ of occurrences) {
          await connection.execute(insertQuery, [
            title,
            occ.start,
            occ.end,
            is_all_day ? 1 : 0,
            is_all_day ? null : start_time,
            is_all_day ? null : end_time,
            category,
            color,
            location || "",
            description || null,
            priority,
            recurrence_type,
            recurrence_end_date,
            parentId,
          ]);
        }
        childCount = occurrences.length;
      }

      const [result]: any = await connection.execute(
        "SELECT * FROM schedule_events WHERE id = ?",
        [parentId]
      );

      const event = result[0];
      return Response.json(
        {
          event: formatRow(event),
          recurrence_count: childCount + 1,
        },
        { status: 201 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create event";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "title",
      "start_date",
      "end_date",
      "is_all_day",
      "start_time",
      "end_time",
      "category",
      "color",
      "location",
      "description",
      "priority",
      "recurrence_type",
      "recurrence_end_date",
    ];

    const updateFields = Object.keys(updates).filter((key) =>
      allowedFields.includes(key)
    );

    if (updateFields.length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(", ");
    const values = updateFields.map((field) => updates[field]);
    values.push(id);

    const connection = await pool.getConnection();
    try {
      const query = `UPDATE schedule_events SET ${setClause} WHERE id = ?`;
      await connection.execute(query, values);

      return Response.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update event";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const scope = req.nextUrl.searchParams.get("scope") || "single";

    if (!id) {
      return Response.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const eventId = parseInt(id);
    const connection = await pool.getConnection();
    try {
      if (scope === "all") {
        // Delete the entire series: find the parent, delete parent + all children
        const [rows]: any = await connection.execute(
          "SELECT id, recurrence_parent_id FROM schedule_events WHERE id = ?",
          [eventId]
        );
        if (rows.length > 0) {
          const parentId = rows[0].recurrence_parent_id || rows[0].id;
          await connection.execute(
            "DELETE FROM schedule_events WHERE id = ? OR recurrence_parent_id = ?",
            [parentId, parentId]
          );
        }
      } else if (scope === "future") {
        // Delete this occurrence and all future ones in the same series
        const [rows]: any = await connection.execute(
          "SELECT id, start_date, recurrence_parent_id FROM schedule_events WHERE id = ?",
          [eventId]
        );
        if (rows.length > 0) {
          const parentId = rows[0].recurrence_parent_id || rows[0].id;
          const startDate = formatDate(rows[0].start_date);
          await connection.execute(
            "DELETE FROM schedule_events WHERE (id = ? OR recurrence_parent_id = ?) AND start_date >= ?",
            [parentId, parentId, startDate]
          );
        }
      } else {
        // Delete single occurrence
        await connection.execute(
          "DELETE FROM schedule_events WHERE id = ?",
          [eventId]
        );
      }

      return Response.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete event";
    return Response.json({ error: message }, { status: 500 });
  }
}
