// 云函数：获取所有装备模板
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const db = cloud.database()
    
    // 直接获取所有装备模板，不受小程序端限制
    const result = await db.collection('equipment_templates')
      .orderBy('createTime', 'desc')
      .get()
    
    console.log(`云函数获取到 ${result.data.length} 条装备模板数据`)
    
    return {
      code: 0,
      message: 'success',
      data: result.data
    }
  } catch (error) {
    console.error('云函数获取装备模板失败:', error)
    
    return {
      code: -1,
      message: error.message,
      data: []
    }
  }
}