const fs = require("fs");
const path = require("path");

const origSymlink = fs.symlink;
const origSymlinkSync = fs.symlinkSync;
const origPromisesSymlink = fs.promises.symlink;

function copyFallback(target, destPath) {
  try {
    const resolvedTarget = path.isAbsolute(target)
      ? target
      : path.resolve(path.dirname(destPath), target);
    if (fs.existsSync(resolvedTarget)) {
      const stat = fs.statSync(resolvedTarget);
      if (stat.isDirectory()) {
        fs.cpSync(resolvedTarget, destPath, { recursive: true });
      } else {
        fs.copyFileSync(resolvedTarget, destPath);
      }
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

fs.promises.symlink = async function (target, destPath, type) {
  try {
    return await origPromisesSymlink.call(fs.promises, target, destPath, type);
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EEXIST")) {
      if (copyFallback(target, destPath)) return;
    }
    throw err;
  }
};

fs.symlink = function (target, destPath, type, callback) {
  if (typeof type === "function") {
    callback = type;
    type = null;
  }
  origSymlink.call(fs, target, destPath, type, (err) => {
    if (err && (err.code === "EPERM" || err.code === "EEXIST")) {
      if (copyFallback(target, destPath)) return callback ? callback(null) : undefined;
    }
    if (callback) callback(err);
  });
};

fs.symlinkSync = function (target, destPath, type) {
  try {
    return origSymlinkSync.call(fs, target, destPath, type);
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EEXIST")) {
      if (copyFallback(target, destPath)) return;
    }
    throw err;
  }
};
