// pages/detail/detail.js
const app = getApp()

Page({
  data: {
    equipment: null,
    userEquipment: null,
    loading: true,
    isActivated: false,
    showImage: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadEquipmentDetail(options.id)
    }
  },

  // 加载装备详情
  async loadEquipmentDetail(equipmentId) {
    try {
      this.setData({ loading: true })
      
      const db = wx.cloud.database()
      
      // 获取装备模板信息
      const { data: equipmentTemplates } = await db.collection('equipment_templates')
        .where({ _id: equipmentId })
        .get()
      
      if (equipmentTemplates.length === 0) {
        wx.showToast({
          title: '装备不存在',
          icon: 'none'
        })
        wx.navigateBack()
        return
      }

      const equipment = equipmentTemplates[0]
      
      // 检查用户是否已激活该装备
      let userEquipment = null
      let isActivated = false
      
      if (app.globalData.isLoggedIn) {
        const { data: userEquipments } = await db.collection('user_warehouse')
          .where({ 
            openid: app.globalData.openid,
            templateId: equipmentId 
          })
          .field({
            _id: true,
            openid: true,
            templateId: true,
            equipmentName: true,
            images: true,
            updateTime: true,
            createTime: true
          })
          .get()
        
        if (userEquipments.length > 0) {
          userEquipment = userEquipments[0]
          isActivated = true
          
          // 调试信息
          console.log('获取到的用户装备数据:', userEquipment)
          console.log('updateTime 字段:', userEquipment.updateTime)
          console.log('updateTime 类型:', typeof userEquipment.updateTime)
        }
      }
      
      this.setData({
        equipment: equipment,
        userEquipment: userEquipment,
        isActivated: isActivated,
        loading: false
      })
      
    } catch (error) {
      console.error('加载装备详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 获取装备类型的emoji
  getEquipmentEmoji(type) {
    const emojiMap = {
      '武器': '⚔️',
      '防具': '🛡️',
      '饰品': '💍',
      '符文': '🔣',
      '药水': '🧪',
      '卷轴': '📜'
    }
    
    return emojiMap[type] || '❓'
  },

  // 格式化激活时间
  formatActivationTime(timeString) {
    console.log('formatActivationTime 接收的时间:', timeString)
    
    if (!timeString) {
      console.log('时间字符串为空')
      return '未知时间'
    }
    
    try {
      const date = new Date(timeString)
      console.log('解析后的日期对象:', date)
      
      if (isNaN(date.getTime())) {
        console.log('日期无效')
        return '无效时间'
      }
      
      // 格式化为 YYYY-MM-DD HH:mm
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}`
      console.log('格式化后的时间:', formattedTime)
      
      return formattedTime
    } catch (error) {
      console.error('格式化时间失败:', error, '原始时间字符串:', timeString)
      return '时间格式错误'
    }
  },

  // 查看装备图片
  viewImage() {
    if (!this.data.isActivated || !this.data.userEquipment?.images?.[0]) {
      wx.showModal({
        title: '未激活',
        content: '该装备尚未激活，无法查看图片',
        showCancel: false
      })
      return
    }
    
    const imageUrl = this.data.userEquipment.images[0]
    
    wx.previewImage({
      urls: [imageUrl],
      current: imageUrl
    })
  },

  // 显示/隐藏图片
  toggleImage() {
    if (!this.data.isActivated || !this.data.userEquipment?.images?.[0]) {
      wx.showModal({
        title: '未激活',
        content: '该装备尚未激活，无法查看图片',
        showCancel: false
      })
      return
    }
    
    this.setData({
      showImage: !this.data.showImage
    })
  },

  // 跳转到上传页面
  goToUpload() {
    if (!app.globalData.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.switchTab({
      url: '/pages/upload/upload'
    })
  },

  // 分享功能
  onShareAppMessage() {
    const { equipment, isActivated } = this.data
    
    return {
      title: isActivated ? `我的暗黑2装备：${equipment?.name}` : `暗黑2装备：${equipment?.name}`,
      path: `/pages/detail/detail?id=${equipment?._id || ''}`,
      imageUrl: '/images/share-cover.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { equipment, isActivated } = this.data
    
    return {
      title: isActivated ? `我的暗黑2装备：${equipment?.name}` : `暗黑2装备：${equipment?.name}`,
      imageUrl: '/images/share-cover.png'
    }
  }
})