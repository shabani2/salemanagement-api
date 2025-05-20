import { config } from "../config/config";

describe("Database URI selection", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clear cache
    process.env = { ...OLD_ENV }; // Restore env
  });

  afterEach(() => {
    process.env = OLD_ENV; // Reset env after tests
  });

  it("should return MONGO_URI_PROD when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    process.env.MONGO_URI_PROD = "prod_uri";
    const { databaseUri } = require("../config/config").config;
    expect(databaseUri).toBe("prod_uri");
  });

  it("should return MONGO_URI_TEST when NODE_ENV is test", () => {
    process.env.NODE_ENV = "test";
    process.env.MONGO_URI_TEST = "test_uri";
    const { databaseUri } = require("../config/config").config;
    expect(databaseUri).toBe("test_uri");
  });

  it("should return MONGO_URI_LOCAL by default", () => {
    process.env.NODE_ENV = "development";
    process.env.MONGO_URI_LOCAL = "local_uri";
    const { databaseUri } = require("../config/config").config;
    expect(databaseUri).toBe("local_uri");
  });

  it("should throw error if URI missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.MONGO_URI_PROD;
    expect(() => require("../config/config").config).toThrow(
      "Missing environment variable: MONGO_URI_PROD",
    );
  });
});
