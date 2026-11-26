"use strict";
const { app } = require("@azure/functions");
const { handle, MAX_BODY } = require("../relay");

for (const route of ["device/code", "token"]) {
  app.http("github-" + route.replace("/", "-"), {
    route: "github/" + route,
    methods: ["POST", "OPTIONS"],
    authLevel: "anonymous",
    handler: async (request) => {
      let body = {};
      let tooLarge = Number(request.headers.get("content-length") || 0) > MAX_BODY;
      if (request.method === "POST" && !tooLarge) {
        const text = await request.text();
        if (text.length > MAX_BODY) tooLarge = true;
        else { try { body = text ? JSON.parse(text) : {}; } catch (e) { body = {}; } }
      }
      return handle({ method: request.method, origin: request.headers.get("origin"), route, body: body || {}, tooLarge }, process.env, fetch);
    }
  });
}
