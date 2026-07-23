import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { createProject, deleteProject, getProject, listProjects, updateProject } from "./index";

// Store temp dir path for cleanup
const tempDir = mkdtempSync(join(tmpdir(), "oxzi-db-test-"));
const originalCwd = process.cwd;

beforeAll(() => {
  process.cwd = () => tempDir;
});

afterAll(() => {
  process.cwd = originalCwd;
});

beforeEach(() => {
  // Clean all projects before each test for isolated state
  const existing = listProjects();
  for (const p of existing) {
    deleteProject(p.id);
  }
});

describe("Project DB — CRUD operations", () => {
  it("starts with an empty project list", () => {
    expect(listProjects()).toEqual([]);
  });

  it("creates a project and returns it", () => {
    const project = createProject({ id: "proj_test_1", title: "Test Project", brief: "A test" });
    expect(project.id).toBe("proj_test_1");
    expect(project.title).toBe("Test Project");
    expect(project.brief).toBe("A test");
    expect(project.canonicalState).toBeNull();

    const projects = listProjects();
    expect(projects).toHaveLength(1);
  });

  it("retrieves a project by ID", () => {
    createProject({ id: "proj_test_2", title: "Retrieve Me", brief: "Test" });
    const retrieved = getProject("proj_test_2");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe("Retrieve Me");
  });

  it("returns null for a non-existent project", () => {
    expect(getProject("proj_nonexistent")).toBeNull();
  });

  it("updates a project's fields", () => {
    createProject({ id: "proj_test_3", title: "Original", brief: "Original brief" });
    const updated = updateProject("proj_test_3", {
      title: "Updated Title",
      canonicalState: { key: "value" },
    });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated Title");
    expect(updated!.canonicalState).toEqual({ key: "value" });

    const retrieved = getProject("proj_test_3");
    expect(retrieved!.title).toBe("Updated Title");
  });

  it("deletes a project", () => {
    createProject({ id: "proj_test_4", title: "Delete Me", brief: "Test" });
    expect(listProjects()).toHaveLength(1);
    expect(deleteProject("proj_test_4")).toBe(true);
    expect(getProject("proj_test_4")).toBeNull();
    expect(listProjects()).toHaveLength(0);
  });

  it("returns false when deleting a non-existent project", () => {
    expect(deleteProject("proj_nonexistent")).toBe(false);
  });
});
