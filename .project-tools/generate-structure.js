/**
 * generate-structure.js
 *
 * 作用：
 * 递归扫描项目根目录，生成项目的目录结构并保存为 Markdown 格式的文件。
 * 支持自定义排除某些目录（如 node_modules、.git 等），避免生成不需要展示的文件夹内容。
 *
 * 使用说明：
 * 1. 修改 `excludeDirs` 数组，配置需要排除的目录名称。
 * 2. 运行此脚本，生成的 Markdown 文件会输出到 `.project-tools/project-structure.md`。
 * 3. 生成的 Markdown 文件采用树状缩进，方便阅读和项目结构展示。
 *
 * 运行方式：
 * node .project-tools/generate-structure.js
 *
 * 依赖：
 * 该脚本基于 Node.js 的 ES 模块，Node.js 版本需 >= 12。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../');
console.log('项目根目录:', projectRoot);
// 自定义排除目录，比如node_modules和.git
const excludeDirs = [
    'node_modules',
    '.git',
    '.idea',
    '.vscode',
    'dist',
    'build',
    'out',
    'coverage',
    'logs',
    'tmp',
    'temp',
    '__tests__',
    '.github'
];

/**
 * 生成目录结构，支持排除指定文件夹
 * @param {string} dirPath 目录路径
 * @param {string[]} excludeDirs 要排除的文件夹名数组
 * @returns {Array} 结构数组
 */
function generateStructure(dirPath, excludeDirs = []) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];

    for (const file of files) {
        if (file.isDirectory()) {
            if (excludeDirs.includes(file.name)) {
                // 跳过排除目录
                continue;
            }
            result.push({
                name: file.name,
                type: 'directory',
                children: generateStructure(path.join(dirPath, file.name), excludeDirs),
            });
        } else {
            result.push({
                name: file.name,
                type: 'file',
            });
        }
    }
    return result;
}

/**
 * 结构数组转Markdown字符串
 * @param {Array} structure
 * @param {number} level 缩进等级
 * @returns {string}
 */
function structureToMarkdown(structure, level = 0) {
    let md = '';
    const indent = '  '.repeat(level);
    for (const item of structure) {
        if (item.type === 'directory') {
            md += `${indent}- 📁 **${item.name}**\n`;
            md += structureToMarkdown(item.children, level + 1);
        } else {
            md += `${indent}- 📄 ${item.name}\n`;
        }
    }
    return md;
}


// 生成项目结构

const structure = generateStructure(projectRoot, excludeDirs);
const mdContent = `# 项目结构\n\n${structureToMarkdown(structure)}`;
const savePath = path.join(projectRoot, 'docs', 'project-structure.md');

fs.writeFileSync(savePath, mdContent, 'utf-8');

console.log('项目结构文件已保存到 ' + savePath);
