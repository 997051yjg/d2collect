// cloudfunctions/getRecentEquipments/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  // 获取当前用户的 OpenID
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 在云端进行聚合查询（这里的权限是管理员级别，不会报错）
    const result = await db.collection('user_warehouse')
      .aggregate()
      .match({
        openid: openid, // 只查自己的
        isActive: true  // 只查已激活的
      })
      .sort({
        activationTime: -1 // 按时间倒序
      })
      .limit(5) // 取最新的5个
      .lookup({
        from: 'equipment_templates', // 关联装备模板表
        localField: 'templateId',
        foreignField: '_id',
        as: 'templateDetail'
      })
      .end()

    return {
      success: true,
      data: result.list
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}