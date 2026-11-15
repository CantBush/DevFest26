import {
  ChecklistSchema,
  ProfileSchema,
  TaskDetailSchema,
  type Checklist,
  type Profile,
  type TaskDetail,
} from "@/lib/types";
import checklistSample from "./checklist.sample.json";
import profileDomestic from "./profile.domestic.json";
import profileInternational from "./profile.international.json";
import taskDetailAreaSearch from "./taskDetail.areaSearch.json";
import taskDetailGeneric from "./taskDetail.generic.json";

// Sample data for building screens before the backend exists. Parsing here means
// a fixture that drifts from src/lib/types.ts fails loudly instead of silently.

export const sampleInternationalProfile: Profile = ProfileSchema.parse(profileInternational);
export const sampleDomesticProfile: Profile = ProfileSchema.parse(profileDomestic);
export const sampleChecklist: Checklist = ChecklistSchema.parse(checklistSample);
export const sampleAreaSearchDetail: TaskDetail = TaskDetailSchema.parse(taskDetailAreaSearch);
export const sampleGenericDetail: TaskDetail = TaskDetailSchema.parse(taskDetailGeneric);
