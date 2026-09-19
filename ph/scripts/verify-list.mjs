import { listLicenses } from "../server/licenses.ts";

const rows = await listLicenses(undefined, 1);
console.log(JSON.stringify(rows));
