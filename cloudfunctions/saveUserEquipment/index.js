// cloudfunctions/saveUserEquipment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext()
  const { templateId, equipmentName, imageUrl, attributes } = event
  const now = new Date()

  try {
    // 1. 检查是否已存在该装备记录 (根据 openid + 装备名称)
    const { data: records } = await db.collection('user_warehouse').where({
      openid: openid,
      equipmentName: equipmentName
    }).get()

    let oldImageUrl = null
    let result = null

    if (records.length > 0) {
      // --- 更新现有记录 ---
      const record = records[0]
      // 记录旧图路径以便删除
      if (record.images && record.images.length > 0) {
        oldImageUrl = record.images[0]
      }

      await db.collection('user_warehouse').doc(record._id).update({
        data: {
          templateId,
          images: [imageUrl], // 覆盖旧图
          isActive: true,
          updateTime: now,
          // 如果之前未激活，更新激活时间
          activationTime: record.isActive ? record.activationTime : now
        }
      })
      result = { action: 'update', id: record._id }
    } else {
      // --- 创建新记录 ---
      const res = await db.collection('user_warehouse').add({
        data: {
          openid,
          templateId,
          equipmentName,
          images: [imageUrl],
          attributes: attributes || [],
          isActive: true,
          activationTime: now,
          createTime: now,
          updateTime: now
        }
      })
      result = { action: 'create', id: res._id }
    }

    // 2. 尝试删除旧图片 (清理垃圾文件)
    if (oldImageUrl && oldImageUrl !== imageUrl && oldImageUrl.startsWith('cloud://')) {
      try {
        await cloud.deleteFile({ fileList: [oldImageUrl] })
      } catch (e) {
        // 删除失败不影响主流程，忽略
        console.warn('旧图删除失败', e)
      }
    }

    return { success: true, ...result }

  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}