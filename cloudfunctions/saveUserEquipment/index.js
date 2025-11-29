// cloudfunctions/saveUserEquipment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { templateId, equipmentName, imageUrl, attributes, item_id, openid } = event
  const cloudOpenid = cloud.getWXContext().openid
  // 获取真正的归属者 ID
  const finalOpenid = openid || cloudOpenid
  const now = new Date()

  const itemId = item_id || templateId
  
  if (!itemId) return { success: false, error: '缺少必要的装备ID参数' }
  if (!equipmentName) return { success: false, error: '缺少装备名称参数' }
  if (!imageUrl) return { success: false, error: '缺少图片URL参数' }

  try {
    // 查询旧记录
    const { data: records } = await db.collection('user_warehouse').where({
      openid: finalOpenid,
      equipmentName: equipmentName
    }).get()

    let oldImageUrl = null
    let result = null

    if (records.length > 0) {
      // === UPDATE 分支 ===
      const record = records[0]
      if (record.images && record.images.length > 0) {
        oldImageUrl = record.images[0]
      }

      await db.collection('user_warehouse').doc(record._id).update({
        data: {
          // 【核心修复】: 即使是更新旧数据，也要强制补全 _openid
          _openid: finalOpenid,
          
          templateId: itemId,
          images: [imageUrl],
          attributes: attributes || {}, 
          isActive: true,
          updateTime: now,
          activationTime: record.isActive ? record.activationTime : now
        }
      })
      result = { action: 'update', id: record._id }
    } else {
      // === CREATE 分支 ===
      const res = await db.collection('user_warehouse').add({
        data: {
          // 【核心修复】: 显式写入系统字段
          _openid: finalOpenid,
          openid: finalOpenid, // 手动字段双重保险
          
          templateId: itemId,
          equipmentName,
          images: [imageUrl],
          attributes: attributes || {}, 
          isActive: true,
          activationTime: now,
          createTime: now,
          updateTime: now
        }
      })
      result = { action: 'create', id: res._id }
    }

    // 清理旧图
    if (oldImageUrl && oldImageUrl !== imageUrl && oldImageUrl.startsWith('cloud://')) {
      try { await cloud.deleteFile({ fileList: [oldImageUrl] }) } catch (e) {}
    }

    return { success: true, ...result }

  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}