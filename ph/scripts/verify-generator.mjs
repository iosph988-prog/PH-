import { createLicense } from "../server/licenses.ts";

const result = await createLicense({ createdBy: 1, deviceLimit: 1, durationDays: 1 });
console.log(JSON.stringify(result));
