import { httpRouter } from "convex/server";
import { auth_component, createAuth } from "./auth";

const http = httpRouter();
auth_component.registerRoutes(http, createAuth);
export default http;
