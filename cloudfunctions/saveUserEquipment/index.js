// cloudfunctions/saveUserEquipment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 优先使用客户端传递的 openid，如果没有则使用云端的 openid
  const { templateId, equipmentName, imageUrl, attributes, item_id, openid } = event
  const cloudOpenid = cloud.getWXContext().openid
  
  // 【关键变量】这是该装备的归属者 ID
  const finalOpenid = openid || cloudOpenid
  
  const now = new Date()

  // 优先使用 item_id，如果未提供则使用 templateId
  const itemId = item_id || templateId
  
  // 验证参数一致性
  if (item_id && templateId && item_id !== templateId) {
    console.warn('警告：item_id 和 templateId 不一致，可能导致数据关联问题')
  }
  
  // 参数验证
  if (!itemId) return { success: false, error: '缺少必要的装备ID参数' }
  if (!equipmentName) return { success: false, error: '缺少装备名称参数' }
  if (!imageUrl) return { success: false, error: '缺少图片URL参数' }

  try {
    // 查询是否存在旧记录
    const { data: records } = await db.collection('user_warehouse').where({
      openid: finalOpenid,
      equipmentName: equipmentName
    }).get()

    let oldImageUrl = null
    let result = null

    if (records.length > 0) {
      // --- 更新逻辑 (Update) ---
      const record = records[0]
      if (record.images && record.images.length > 0) {
        oldImageUrl = record.images[0]
      }

      await db.collection('user_warehouse').doc(record._id).update({
        data: {
          templateId: itemId,
          images: [imageUrl],
          attributes: attributes || {}, 
          isActive: true,
          updateTime: now,
          // 如果之前没有 _openid (旧数据)，这里也可以顺便补上，但通常 add 时最关键
          // _openid: finalOpenid, 
          activationTime: record.isActive ? record.activationTime : now
        }
      })
      result = { action: 'update', id: record._id }
    } else {
      // --- 创建逻辑 (Create) ---
      const res = await db.collection('user_warehouse').add({
        data: {
          // 【核心修复点】显式写入系统字段 _openid
          // 这样云数据库权限系统 ("所有用户可读") 才能识别出 "ownerId" 是这条数据的创建者
          _openid: finalOpenid, 
          
          // 手动字段 (保持兼容性)
          openid: finalOpenid,
          
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

    // 清理旧图片
    if (oldImageUrl && oldImageUrl !== imageUrl && oldImageUrl.startsWith('cloud://')) {
      try { await cloud.deleteFile({ fileList: [oldImageUrl] }) } catch (e) {}
    }

    return { success: true, ...result }

  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}