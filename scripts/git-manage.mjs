import fs from "fs";
import path from "path";
import git from "isomorphic-git";

const dir = process.cwd();

async function main() {
  console.log("1. Initializing Git repository in", dir);
  await git.init({ fs, dir, defaultBranch: "main" });

  // Read .gitignore patterns
  const gitignorePath = path.join(dir, ".gitignore");
  const ignorePatterns = [
    ".git",
    "node_modules",
    ".next",
    ".env",
    ".env.local",
    ".env*.local",
    ".vercel",
    ".DS_Store",
    "coverage",
    "build"
  ];

  function shouldIgnore(relPath) {
    const parts = relPath.replace(/\\/g, "/").split("/");
    for (const part of parts) {
      if (ignorePatterns.includes(part)) return true;
      if (part.startsWith(".env")) return true;
    }
    return false;
  }

  function getAllFiles(currentDir, baseDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      if (shouldIgnore(relPath)) continue;

      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }
    return files;
  }

  const filesToAdd = getAllFiles(dir, dir);
  console.log(`2. Found ${filesToAdd.length} files to track.`);

  // Double check NO .env files are in filesToAdd
  const leakedEnvs = filesToAdd.filter(f => f.includes(".env"));
  if (leakedEnvs.length > 0) {
    throw new Error("SECURITY ALERT: .env files detected in stage list: " + leakedEnvs.join(", "));
  }

  console.log("3. Staging files...");
  for (const filepath of filesToAdd) {
    await git.add({ fs, dir, filepath });
  }

  console.log("4. Creating initial commit...");
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: "abhishekdutta29",
      email: "abhishekdutta29@users.noreply.github.com",
    },
    message: "Initial commit: OfferCheck - Instant AI & Web Risk Verification for Job and Internship Offers",
  });
  console.log("Commit created successfully:", sha);

  console.log("5. Setting remote origin...");
  await git.setConfig({
    fs,
    dir,
    path: "remote.origin.url",
    value: "https://github.com/abhishekdutta29/TinyFish_Hackathon_OfferCheck.git",
  });

  console.log("Git repo ready! Remote origin set to https://github.com/abhishekdutta29/TinyFish_Hackathon_OfferCheck.git");
}

main().catch(err => {
  console.error("Git error:", err);
  process.exit(1);
});
