// cloudfunctions/saveUserEquipment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // ✅ 修复：优先使用客户端传递的 openid，如果没有则使用云端的 openid
  const { templateId, equipmentName, imageUrl, attributes, item_id, openid } = event
  const cloudOpenid = cloud.getWXContext().openid
  const finalOpenid = openid || cloudOpenid
  const now = new Date()

  // 优先使用 item_id，如果未提供则使用 templateId
  const itemId = item_id || templateId
  
  // 验证参数一致性：如果同时提供了 item_id 和 templateId，应该保持一致
  if (item_id && templateId && item_id !== templateId) {
    console.warn('警告：item_id 和 templateId 不一致，可能导致数据关联问题')
    console.log(`item_id: ${item_id}, templateId: ${templateId}`)
    // 在实际环境中，这里可以抛出一个错误或使用更严格的逻辑
  }
  
  // 参数验证：确保必要的参数存在
  if (!itemId) {
    return { success: false, error: '缺少必要的装备ID参数' }
  }
  if (!equipmentName) {
    return { success: false, error: '缺少装备名称参数' }
  }
  if (!imageUrl) {
    return { success: false, error: '缺少图片URL参数' }
  }

  try {
    const { data: records } = await db.collection('user_warehouse').where({
      openid: finalOpenid,
      equipmentName: equipmentName
    }).get()

    let oldImageUrl = null
    let result = null

    if (records.length > 0) {
      const record = records[0]
      if (record.images && record.images.length > 0) {
        oldImageUrl = record.images[0]
      }

      await db.collection('user_warehouse').doc(record._id).update({
        data: {
          templateId: itemId, // 使用 item_id 作为 templateId
          images: [imageUrl],
          // ✅ 保存用户填写的属性对象 (e.g. { "dmg%": 198, "lifesteal": 5 })
          attributes: attributes || {}, 
          isActive: true,
          updateTime: now,
          activationTime: record.isActive ? record.activationTime : now
        }
      })
      result = { action: 'update', id: record._id }
    } else {
      const res = await db.collection('user_warehouse').add({
        data: {
          openid: finalOpenid,
          templateId: itemId, // 使用 item_id 作为 templateId
          equipmentName,
          images: [imageUrl],
          // ✅ 保存属性
          attributes: attributes || {}, 
          isActive: true,
          activationTime: now,
          createTime: now,
          updateTime: now
        }
      })
      result = { action: 'create', id: res._id }
    }

    if (oldImageUrl && oldImageUrl !== imageUrl && oldImageUrl.startsWith('cloud://')) {
      try { await cloud.deleteFile({ fileList: [oldImageUrl] }) } catch (e) {}
    }

    return { success: true, ...result }

  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}