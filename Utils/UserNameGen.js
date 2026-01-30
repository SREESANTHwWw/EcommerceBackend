import { createRequire } from "module";
const require = createRequire(import.meta.url);

const userLoginModel = require("../Model/userLoginModel");

export const generateUsername = async (firstname, lastname = "") => {
  if (!firstname) {
    throw new Error("Firstname is required for username generation");
  }

  const base = `${firstname}${lastname || ""}`
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  const users = await userLoginModel
    .find({ username: new RegExp(`^${base}`) })
    .select("username");

  if (!users.length) return base;

  const numbers = users
    .map(u => u.username.replace(base, ""))
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;

  return `${base}${next}`;
};
