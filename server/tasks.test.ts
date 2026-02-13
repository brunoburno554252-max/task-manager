import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      totalPoints: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(id: number = 2): TrpcContext {
  return {
    user: {
      id,
      openId: `user-${id}`,
      email: `user${id}@example.com`,
      name: `User ${id}`,
      loginMethod: "manus",
      role: "user",
      totalPoints: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Task Management API", () => {
  describe("tasks.create", () => {
    it("allows admin to create a task", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.tasks.create({
        title: "Test Task",
        description: "Test description",
        priority: "high",
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("rejects unauthenticated users from creating tasks", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.tasks.create({
          title: "Test",
          priority: "medium",
        })
      ).rejects.toThrow();
    });

    it("rejects non-admin users from creating tasks", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.tasks.create({
          title: "Test",
          priority: "medium",
        })
      ).rejects.toThrow();
    });
  });

  describe("tasks.list", () => {
    it("returns tasks for authenticated users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.tasks.list({});
      expect(result).toHaveProperty("tasks");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it("supports filtering by status", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.tasks.list({ status: "pending" });
      expect(result).toHaveProperty("tasks");
      for (const task of result.tasks) {
        expect(task.status).toBe("pending");
      }
    });

    it("rejects unauthenticated users", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.tasks.list({})).rejects.toThrow();
    });
  });

  describe("tasks.updateStatus", () => {
    it("allows admin to update task status", async () => {
      const adminCaller = appRouter.createCaller(createAdminContext());
      // Create a task first
      const task = await adminCaller.tasks.create({
        title: "Status Test Task",
        priority: "medium",
        assigneeId: 1,
      });
      // Update status
      const result = await adminCaller.tasks.updateStatus({
        id: task.id,
        status: "in_progress",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("tasks.delete", () => {
    it("allows admin to delete a task", async () => {
      const adminCaller = appRouter.createCaller(createAdminContext());
      const task = await adminCaller.tasks.create({
        title: "Delete Test",
        priority: "low",
      });
      const result = await adminCaller.tasks.delete({ id: task.id });
      expect(result).toEqual({ success: true });
    });

    it("rejects non-admin from deleting tasks", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(caller.tasks.delete({ id: 999 })).rejects.toThrow();
    });
  });

  describe("dashboard.stats", () => {
    it("returns dashboard statistics", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.dashboard.stats({});
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("pending");
      expect(result).toHaveProperty("inProgress");
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("overdue");
      expect(result).toHaveProperty("completionRate");
      expect(typeof result.total).toBe("number");
    });
  });

  describe("gamification.ranking", () => {
    it("returns ranking data", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.gamification.ranking();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("gamification.badges", () => {
    it("returns all badges", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.gamification.badges();
      expect(Array.isArray(result)).toBe(true);
      // Badges should have been seeded
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("activity.list", () => {
    it("returns activity log", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.activity.list({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("tasks.comments", () => {
    it("returns comments for a task", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const task = await caller.tasks.create({
        title: "Comment Test Task",
        priority: "medium",
      });
      const comments = await caller.tasks.comments({ taskId: task.id });
      expect(Array.isArray(comments)).toBe(true);
    });

    it("allows adding a comment to a task", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const task = await caller.tasks.create({
        title: "Comment Add Test",
        priority: "low",
      });
      const result = await caller.tasks.addComment({
        taskId: task.id,
        content: "This is a test comment",
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");

      // Verify comment was added
      const comments = await caller.tasks.comments({ taskId: task.id });
      expect(comments.length).toBeGreaterThan(0);
      expect(comments[0].content).toBe("This is a test comment");
    });

    it("rejects empty comments", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.tasks.addComment({ taskId: 1, content: "" })
      ).rejects.toThrow();
    });

    it("rejects unauthenticated users from commenting", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.tasks.addComment({ taskId: 1, content: "test" })
      ).rejects.toThrow();
    });
  });

  describe("tasks.activities", () => {
    it("returns activities for a task", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const task = await caller.tasks.create({
        title: "Activity Test Task",
        priority: "high",
      });
      const activities = await caller.tasks.activities({ taskId: task.id });
      expect(Array.isArray(activities)).toBe(true);
      // Should have at least the creation activity
      expect(activities.length).toBeGreaterThan(0);
    });

    it("rejects unauthenticated users", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.tasks.activities({ taskId: 1 })
      ).rejects.toThrow();
    });
  });

  describe("users.list", () => {
    it("returns users list for authenticated users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.users.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("rejects unauthenticated users", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.users.list()).rejects.toThrow();
    });
  });
});
