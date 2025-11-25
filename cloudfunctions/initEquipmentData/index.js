const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 💡 标准化文件名工具函数
// 规则：移除单引号，空格变下划线，保留字母数字
function getStandardFileName(name) {
  if (!name) return ''
  return name
    .replace(/['']/g, '')       // 1. 去掉单引号 (Nightwing's -> Nightwings)
    .replace(/\s+/g, '_')       // 2. 空格变下划线 (The Gnasher -> The_Gnasher)
    // .toLowerCase()           // 可选：如果你想全小写，取消注释这行
    + '.png'                    // 3. 加上后缀
}

// 获取所有数据 (带分页)
async function getAllEquipmentTemplates() {
  const MAX_LIMIT = 1000
  const allTemplates = []
  let hasMore = true
  let skip = 0
  
  while (hasMore) {
    const result = await db.collection('equipment_templates')
      .field({ _id: true, name: true, image: true }) // 只需要 name 和 image
      .skip(skip)
      .limit(MAX_LIMIT)
      .get()
    
    if (result.data.length > 0) {
      allTemplates.push(...result.data)
      skip += result.data.length
    } else {
      hasMore = false
    }
    if (skip >= 10000) break
  }
  return allTemplates
}

exports.main = async (event, context) => {
  try {
    console.log('开始执行图片路径标准化...')
    
    // 1. 获取数据库现有数据
    const equipmentTemplates = await getAllEquipmentTemplates()
    console.log(`数据库现有装备: ${equipmentTemplates.length} 条`)

    const updateTasks = []
    let skippedCount = 0

    // 2. 遍历并生成更新任务
    for (const template of equipmentTemplates) {
      const englishName = template.name
      if (!englishName) {
        skippedCount++
        continue
      }

      // 生成标准化的文件名
      const fileName = getStandardFileName(englishName)
      
      // 生成新的云存储路径
      // ⚠️ 请确认你的云环境ID和文件夹名称是否正确
      const newImagePath = `cloud://cloud1-7g43dval99d60dca.636c-cloud1-7g43dval99d60dca-1385676003/items_image/unique_images/${fileName}`
      
      const currentImage = template.image

      // 如果当前路径和新路径不一样，就更新
      if (currentImage !== newImagePath) {
        updateTasks.push({
          id: template._id,
          data: {
            image: newImagePath
          },
          info: `${englishName} -> ${fileName}`
        })
      } else {
        skippedCount++
      }
    }

    // 3. 执行批量更新
    console.log(`准备更新 ${updateTasks.length} 条图片路径...`)
    let updateSuccess = 0
    let updateFail = 0
    const results = []
    const BATCH_SIZE = 50 
    
    for (let i = 0; i < updateTasks.length; i += BATCH_SIZE) {
      const batch = updateTasks.slice(i, i + BATCH_SIZE)
      const promises = batch.map(task => 
        db.collection('equipment_templates').doc(task.id).update({ data: task.data })
          .then(() => {
            return { status: 'success', info: task.info }
          })
          .catch(err => {
            console.error(`❌ 失败: ${task.info}`, err)
            return { status: 'fail', info: task.info, error: err }
          })
      )
      
      const batchRes = await Promise.all(promises)
      batchRes.forEach(res => {
        if (res.status === 'success') updateSuccess++
        else updateFail++
        results.push(res)
      })
    }

    return {
      success: true,
      total: equipmentTemplates.length,
      updated: updateSuccess,
      failed: updateFail,
      skipped: skippedCount,
      logs: results.slice(0, 10) // 只返回前10条日志看看样子
    }

  } catch (error) {
    console.error('执行错误:', error)
    return { success: false, error: error.message }
  }
}