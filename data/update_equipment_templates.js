// 数据更新脚本：根据中英文对照文件更新装备模板数据库
const fs = require('fs');
const path = require('path');

// 读取中英文对照文件
function loadChineseEnglishMap() {
  const filePath = path.join(__dirname, '中英文对照.ini');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const map = {};
  lines.forEach(line => {
    line = line.trim();
    if (line && line.includes('\t')) {
      const [english, chinese] = line.split('\t');
      if (english && chinese) {
        map[english.trim()] = chinese.trim();
      }
    }
  });
  
  return map;
}

// 生成云存储路径
function generateImagePath(chineseName) {
  return `cloud://cloud1-7g43dval99d60dca.636c-cloud1-7g43dval99d60dca-1385676003/unique_image/${chineseName}.png`;
}

// 检查是否是中文文本
function isChineseText(text) {
  if (!text) return false;
  // 简单的中文检测：检查是否包含中文字符
  return /[\u4e00-\u9fff]/.test(text);
}

// 生成更新脚本
function generateUpdateScript() {
  const chineseEnglishMap = loadChineseEnglishMap();
  
  console.log('中英文对照表加载完成，共', Object.keys(chineseEnglishMap).length, '个条目');
  
  // 生成更新脚本内容
  let script = `// 装备模板数据更新脚本
// 请在小程序云开发控制台中执行此脚本

const db = wx.cloud.database();
const _ = db.command;

// 中英文对照表
const chineseEnglishMap = ${JSON.stringify(chineseEnglishMap, null, 2)};

// 检查是否是中文文本
function isChineseText(text) {
  if (!text) return false;
  return /[\\u4e00-\\u9fff]/.test(text);
}

// 生成云存储路径
function generateImagePath(chineseName) {
  return \`cloud://cloud1-7g43dval99d60dca.636c-cloud1-7g43dval99d60dca-1385676003/unique_image/\${chineseName}.png\`;
}

async function updateEquipmentTemplates() {
  console.log('开始更新装备模板数据...');
  
  try {
    // 1. 获取所有装备模板
    const { data: templates } = await db.collection('equipment_templates')
      .field({
        _id: true,
        name: true,
        name_zh: true,
        image: true
      })
      .get();
    
    console.log('共找到', templates.length, '个装备模板');
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updatePromises = [];
    
    // 2. 遍历每个模板，检查是否需要更新
    for (const template of templates) {
      const englishName = template.name;
      let currentChineseName = template.name_zh || '';
      
      // 如果当前name_zh已经是中文，跳过
      if (isChineseText(currentChineseName)) {
        console.log(\`跳过 \${englishName} - name_zh已经是中文: \${currentChineseName}\`);
        skippedCount++;
        continue;
      }
      
      // 查找对应的中文名
      let newChineseName = chineseEnglishMap[englishName];
      
      if (!newChineseName) {
        console.log(\`警告: 未找到 \${englishName} 的中文翻译\`);
        skippedCount++;
        continue;
      }
      
      // 生成新的image路径
      const newImagePath = generateImagePath(newChineseName);
      
      // 准备更新数据
      const updateData = {
        name_zh: newChineseName,
        image: newImagePath
      };
      
      console.log(\`更新 \${englishName}: \`);
      console.log(\`  - name_zh: \${currentChineseName} -> \${newChineseName}\`);
      console.log(\`  - image: \${newImagePath}\`);
      
      // 添加到更新队列
      updatePromises.push(
        db.collection('equipment_templates')
          .doc(template._id)
          .update({
            data: updateData
          })
      );
      
      updatedCount++;
    }
    
    // 3. 批量执行更新
    if (updatePromises.length > 0) {
      console.log('执行批量更新...');
      await Promise.all(updatePromises);
      console.log('批量更新完成');
    }
    
    console.log('========== 更新完成 ==========');
    console.log('更新数量:', updatedCount);
    console.log('跳过数量:', skippedCount);
    console.log('总计:', templates.length);
    
  } catch (error) {
    console.error('更新失败:', error);
  }
}

// 执行更新
updateEquipmentTemplates();`;
  
  return script;
}

// 生成并保存脚本
const scriptContent = generateUpdateScript();
const scriptPath = path.join(__dirname, 'update_script.js');
fs.writeFileSync(scriptPath, scriptContent, 'utf-8');

console.log('更新脚本已生成: update_script.js');
console.log('请在小程序云开发控制台中执行此脚本');

// 显示一些统计信息
const chineseEnglishMap = loadChineseEnglishMap();
console.log('\\n中英文对照统计:');
console.log('总条目数:', Object.keys(chineseEnglishMap).length);
console.log('示例条目:');

// 显示前5个条目作为示例
let count = 0;
for (const [english, chinese] of Object.entries(chineseEnglishMap)) {
  if (count < 5) {
    console.log(\`  \${english} -> \${chinese}\`);
    count++;
  } else {
    break;
  }
}