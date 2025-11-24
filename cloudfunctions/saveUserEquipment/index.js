// cloudfunctions/saveUserEquipment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext()
  // ✅ 新增 attributes 参数接收
  const { templateId, equipmentName, imageUrl, attributes } = event
  const now = new Date()

  try {
    const { data: records } = await db.collection('user_warehouse').where({
      openid: openid,
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
          templateId,
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
          openid,
          templateId,
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