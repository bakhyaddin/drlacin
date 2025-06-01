import { assert } from "node:console";
import { config } from "dotenv";

config();

const {
  BASE_URL: BASE_URL_ENV,
  PASSWORD: PASSWORD_ENV,
  USERNAME: USERNAME_ENV,
} = process.env;

assert(BASE_URL_ENV, "BASE_URL is not set");
assert(PASSWORD_ENV, "PASSWORD is not set");
assert(USERNAME_ENV, "USERNAME is not set");

export const BASE_URL = BASE_URL_ENV ?? "";
export const PASSWORD = PASSWORD_ENV ?? "";
export const USERNAME = USERNAME_ENV ?? "";
