import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

interface GanttProjectRow extends RowDataPacket {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface GanttTaskRow extends RowDataPacket {
  id: number;
  project_id: number;
  name: string;
  start_date: Date | string;
  end_date: Date | string;
  progress: number;
  color: string;
  sort_order: number;
  assignee: string | null;
  description: string | null;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProjectWithTasks extends GanttProjectRow {
  tasks: GanttTaskRow[];
}

interface MaxSortOrderRow extends RowDataPacket {
  max_order: number | null;
}

function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    // If already a string, try to extract just the date part (YYYY-MM-DD)
    if (date.includes("T")) {
      return date.split("T")[0];
    }
    return date;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatProjectRow(row: GanttProjectRow) {
  return {
    ...row,
    created_at: formatDate(row.created_at),
    updated_at: formatDate(row.updated_at),
  };
}

function formatTaskRow(row: GanttTaskRow) {
  return {
    ...row,
    start_date: formatDate(row.start_date),
    end_date: formatDate(row.end_date),
    created_at: formatDate(row.created_at),
    updated_at: formatDate(row.updated_at),
  };
}

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("project_id");
    const connection = await pool.getConnection();
    try {
      let projectQuery = "SELECT * FROM gantt_projects ORDER BY sort_order ASC";
      const projectParams: (string | number)[] = [];

      if (projectId) {
        projectQuery = "SELECT * FROM gantt_projects WHERE id = ?";
        projectParams.push(parseInt(projectId));
      }

      const [projects] = await connection.execute<GanttProjectRow[]>(
        projectQuery,
        projectParams
      );

      const formattedProjects: ProjectWithTasks[] = [];

      for (const project of projects) {
        const [tasks] = await connection.execute<GanttTaskRow[]>(
          "SELECT * FROM gantt_tasks WHERE project_id = ? ORDER BY sort_order ASC",
          [project.id]
        );

        formattedProjects.push({
          ...formatProjectRow(project),
          tasks: tasks.map(formatTaskRow),
        });
      }

      return Response.json({ projects: formattedProjects });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch gantt data";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (!type || !["project", "task"].includes(type)) {
      return Response.json(
        { error: "type must be 'project' or 'task'" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      if (type === "project") {
        const { name, color } = body;

        if (!name || !color) {
          return Response.json(
            { error: "name and color are required for project" },
            { status: 400 }
          );
        }

        // Get max sort_order
        const [maxSort] = await connection.execute<MaxSortOrderRow[]>(
          "SELECT MAX(sort_order) as max_order FROM gantt_projects"
        );
        const nextSortOrder =
          (maxSort[0]?.max_order || 0) + 1;

        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO gantt_projects (name, color, sort_order) VALUES (?, ?, ?)",
          [name, color, nextSortOrder]
        );

        const [projects] = await connection.execute<GanttProjectRow[]>(
          "SELECT * FROM gantt_projects WHERE id = ?",
          [result.insertId]
        );

        const project = projects[0];
        return Response.json(
          {
            project: {
              ...formatProjectRow(project),
              tasks: [],
            },
          },
          { status: 201 }
        );
      } else if (type === "task") {
        const {
          project_id,
          name,
          start_date,
          end_date,
          progress = 0,
          color = "#3b82f6",
          assignee = null,
          description = null,
          status = "not_started",
        } = body;

        if (!project_id || !name || !start_date || !end_date) {
          return Response.json(
            {
              error: "project_id, name, start_date, and end_date are required for task",
            },
            { status: 400 }
          );
        }

        // Get max sort_order for this project
        const [maxSort] = await connection.execute<MaxSortOrderRow[]>(
          "SELECT MAX(sort_order) as max_order FROM gantt_tasks WHERE project_id = ?",
          [project_id]
        );
        const nextSortOrder =
          (maxSort[0]?.max_order || 0) + 1;

        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO gantt_tasks (project_id, name, start_date, end_date, progress, color, assignee, description, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            project_id,
            name,
            start_date,
            end_date,
            progress,
            color,
            assignee,
            description,
            status,
            nextSortOrder,
          ]
        );

        const [tasks] = await connection.execute<GanttTaskRow[]>(
          "SELECT * FROM gantt_tasks WHERE id = ?",
          [result.insertId]
        );

        const task = tasks[0];
        return Response.json(
          {
            task: formatTaskRow(task),
          },
          { status: 201 }
        );
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create gantt item";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, ...updates } = body;

    if (!type || !["project", "task"].includes(type)) {
      return Response.json(
        { error: "type must be 'project' or 'task'" },
        { status: 400 }
      );
    }

    if (!id) {
      return Response.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      if (type === "project") {
        const allowedFields = ["name", "color", "sort_order"];
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

        const query = `UPDATE gantt_projects SET ${setClause} WHERE id = ?`;
        await connection.execute(query, values);

        return Response.json({ success: true });
      } else if (type === "task") {
        const allowedFields = [
          "name",
          "start_date",
          "end_date",
          "progress",
          "color",
          "assignee",
          "description",
          "status",
          "sort_order",
          "project_id",
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

        const query = `UPDATE gantt_tasks SET ${setClause} WHERE id = ?`;
        await connection.execute(query, values);

        return Response.json({ success: true });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update gantt item";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    const id = req.nextUrl.searchParams.get("id");

    if (!type || !["project", "task"].includes(type)) {
      return Response.json(
        { error: "type must be 'project' or 'task'" },
        { status: 400 }
      );
    }

    if (!id) {
      return Response.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      if (type === "project") {
        // Delete cascade: delete all tasks first, then project
        await connection.execute(
          "DELETE FROM gantt_tasks WHERE project_id = ?",
          [parseInt(id)]
        );
        await connection.execute(
          "DELETE FROM gantt_projects WHERE id = ?",
          [parseInt(id)]
        );
      } else if (type === "task") {
        await connection.execute(
          "DELETE FROM gantt_tasks WHERE id = ?",
          [parseInt(id)]
        );
      }

      return Response.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete gantt item";
    return Response.json({ error: message }, { status: 500 });
  }
}
