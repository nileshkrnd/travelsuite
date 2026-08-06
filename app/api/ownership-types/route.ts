import { createGlobalNameListHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameListHandlers({
  model: "ownershipType",
  idField: "ownershipTypeId",
  nameField: "ownershipTypeName",
  label: "ownership type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
