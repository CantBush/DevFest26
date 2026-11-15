import {
  BookmarkSchema,
  ChecklistSchema,
  ProfileSchema,
  TaskDetailSchema,
  type Bookmark,
  type Checklist,
  type Profile,
  type TaskDetail,
} from "@/lib/types";

export function profileFromUserDoc(data: unknown): Profile | null {
  if (!data || typeof data !== "object" || !("profile" in data)) return null;
  const parsed = ProfileSchema.safeParse((data as { profile: unknown }).profile);
  return parsed.success ? parsed.data : null;
}

export function checklistFromDoc(data: unknown): Checklist | null {
  const parsed = ChecklistSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function taskDetailFromDoc(data: unknown): TaskDetail | null {
  const parsed = TaskDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function bookmarkFromDoc(id: string, data: unknown): Bookmark | null {
  const parsed = BookmarkSchema.safeParse({ ...(data as object), id });
  return parsed.success ? parsed.data : null;
}

export function progressFromDoc(data: unknown): boolean {
  if (!data || typeof data !== "object" || !("done" in data)) return false;
  return (data as { done: unknown }).done === true;
}

export function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
