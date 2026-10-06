import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "study-dz",
  title: "Study DZ",
  version: "0.1.0",
  instructions:
    "Tools for Study DZ, an Algerian education management platform. Use `get_my_profile` to see the signed-in user's role and institution.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile],
});
