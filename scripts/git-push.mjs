import fs from "fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

const dir = process.cwd();
const token = process.argv[2] || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function push() {
  console.log("Attempting to push to remote origin on branch main...");
  if (token) {
    console.log("Using token from environment...");
  } else {
    console.log("No GITHUB_TOKEN set in environment. Checking if push succeeds without auth or needs credentials...");
  }

  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: "main",
    onAuth: () => ({
      username: token || "abhishekdutta29",
      password: token || "",
    }),
  });

  console.log("Push result:", pushResult);
}

push().catch(err => {
  console.error("Push failed:", err.message || err);
  process.exit(1);
});
