// src/utils/data.js
const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join(__dirname, '../../data');

function saveStageOutput(stageName, data, dir = DEFAULT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${stageName}-${timestamp}.json`;
  const filePath = path.join(dir, filename);
  const output = {
    stage: stageName,
    timestamp: new Date().toISOString(),
    data,
  };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  return filePath;
}

function loadStageOutput(stageName, dir = DEFAULT_DIR) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith(`${stageName}-`) && f.endsWith('.json'))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  const filePath = path.join(dir, files[0]);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

module.exports = { saveStageOutput, loadStageOutput };
