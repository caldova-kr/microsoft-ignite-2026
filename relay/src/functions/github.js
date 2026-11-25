"use strict";
const { app } = require("@azure/functions");
const { handle } = require("../relay");

for (const route of ["device/code", "token"]) {
  app.http("github-" + route.replace("/", "-"), {
    route: "github/" + route,
    methods: ["POST", "OPTIONS"],
    authLevel: "anonymous",
    handler: async (request) => {
      let body = {};
      if (request.method === "POST") {
        const text = await request.text();
        if (text.length > 4096) body = null;
        else { try { body = text ? JSON.parse(text) : {}; } catch (e) { body = {}; } }
      }
      return handle({ method: request.method, origin: request.headers.get("origin"), route, body: body || {} }, process.env, fetch);
    }
  });
}
