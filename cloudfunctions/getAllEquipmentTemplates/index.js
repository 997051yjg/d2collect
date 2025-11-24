// cloudfunctions/getAllEquipmentTemplates/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const MAX_LIMIT = 1000 // 云函数单次获取的最大条数

  try {
    // 1. 先查询数据总数
    const countResult = await db.collection('equipment_templates').count()
    const total = countResult.total

    // 如果没数据，直接返回空
    if (total === 0) {
      return { code: 0, data: [] }
    }

    // 2. 计算需要分几次取 (例如 1500 条数据需要取 2 次)
    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []

    // 3. 循环构建查询任务
    for (let i = 0; i < batchTimes; i++) {
      const promise = db.collection('equipment_templates')
        // 【优化点】只取列表页需要的字段，大幅减少传输体积
        // 如果你的列表页还需要其他字段，请在这里加上
        .field({
          _id: true,
          name: true,
          name_zh: true, // ✅ 必须加上这个！否则列表页全是英文
          type: true,
          rarity: true,
          set: true,      // ✅ 必须加上用于套装判断
          rune: true,      // ✅ 必须加上用于符文之语判断
          image: true,    // 如果是 cloud:// 路径
          createTime: true
        })
        .skip(i * MAX_LIMIT) // 跳过前 n 条
        .limit(MAX_LIMIT)    // 每次取 1000 条
        .orderBy('createTime', 'desc')
        .get()
      
      tasks.push(promise)
    }

    // 4. 【并行执行】同时发送所有请求，速度最快
    // (如果是串行 await，耗时会翻倍)
    const batchResults = await Promise.all(tasks)

    // 5. 组装数据：把多次请求的结果数组合并成一个大数组
    let allData = []
    for (let i = 0; i < batchResults.length; i++) {
      allData = allData.concat(batchResults[i].data)
    }

    console.log(`成功获取所有装备模板：共 ${allData.length} 条`)

    // 6. 必须用 return (不能用中文"返回")
    return {
      code: 0,
      message: 'success',
      data: allData
    }

  } catch (error) {
    console.error('获取装备失败:', error)
    return {
      code: -1,
      message: error.message,
      data: []
    }
  }
}