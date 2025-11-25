// cloudfunctions/getUserEquipment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext()
  
  try {
    // 获取用户装备仓库数据
    const { data } = await db.collection('user_warehouse')
      .where({ 
        openid: openid,
        isActive: true // 只获取激活的装备
      })
      .orderBy('activationTime', 'desc')
      .get()
    
    return {
      code: 0,
      message: 'success',
      data: data
    }
    
  } catch (err) {
    console.error('getUserEquipment error:', err)
    return {
      code: -1,
      message: err.message,
      data: []
    }
  }
}