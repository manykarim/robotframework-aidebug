const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function firstWorkspaceFolder(workspace) {
  return workspace?.workspaceFolders?.[0]?.uri?.fsPath || process.cwd();
}

function activeEditorPath(vscodeApi) {
  return vscodeApi?.window?.activeTextEditor?.document?.uri?.fsPath || '';
}

function substituteTemplate(value, context) {
  let result = value;
  const workspaceFolder = context.workspaceFolder || process.cwd();
  const filePath = context.filePath || '';
  result = result.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
  result = result.replace(/\$\{file\}/g, filePath);
  result = result.replace(/\$\{env:([^}]+)\}/g, (_, name) => process.env[name] || '');
  if (result.startsWith('~/')) {
    result = path.join(os.homedir(), result.slice(2));
  }
  return result;
}

function isPathLike(value) {
  return value.includes(path.sep) || value.startsWith('~') || value.includes('${');
}

function validateExecutable(executable) {
  if (!path.isAbsolute(executable)) {
    return;
  }
  if (!fs.existsSync(executable)) {
    throw new Error(`Adapter executable does not exist: ${executable}`);
  }
  try {
    fs.accessSync(executable, fs.constants.X_OK);
  } catch (_error) {
    throw new Error(`Adapter executable is not executable: ${executable}`);
  }
}

function resolveExecutable(rawValue, context) {
  const substituted = substituteTemplate(rawValue, context);
  const resolved = path.isAbsolute(substituted) ? substituted : isPathLike(rawValue) ? path.resolve(context.workspaceFolder, substituted) : substituted;
  if (path.isAbsolute(resolved)) {
    validateExecutable(resolved);
  }
  return resolved;
}

function defaultRobotProgram(vscodeApi) {
  const filePath = activeEditorPath(vscodeApi);
  if (filePath && filePath.endsWith('.robot')) {
    return filePath;
  }
  return '';
}

function resolveProgram(configProgram, vscodeApi) {
  const workspaceFolder = firstWorkspaceFolder(vscodeApi.workspace);
  const filePath = activeEditorPath(vscodeApi);
  if (configProgram) {
    return substituteTemplate(configProgram, { workspaceFolder, filePath });
  }
  return defaultRobotProgram(vscodeApi);
}

module.exports = {
  activeEditorPath,
  defaultRobotProgram,
  firstWorkspaceFolder,
  isPathLike,
  resolveExecutable,
  resolveProgram,
  substituteTemplate,
  validateExecutable
};
