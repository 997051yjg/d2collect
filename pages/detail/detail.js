// pages/detail/detail.js
const app = getApp()
const { getRarityText } = require('../../utils/rarityMap.js')
const { getPropertyConfig } = require('../../utils/propertyMap.js')

Page({
  data: {
    // 核心数据
    equipment: null,      // 装备模板数据
    userEquipment: null,  // 用户仓库数据（具体的Roll值、图片）
    userInfo: null,       // 收藏者（主人）信息
    
    // 状态标识
    loading: true,
    isActivated: false,   // 是否已点亮
    isOwner: false,       // 【新增】当前查看者是否是装备主人
    
    // 辅助
    showCanvas: false,
    generatingImage: false,
    currentImageIndex: 0,
    scrollLeft: 0
  },

// pages/detail/detail.js - onLoad 函数

onLoad(options) {
    const equipmentId = options.id
    let ownerId = options.ownerId
    
    // 1. 尝试获取 openid
    const myOpenId = app.globalData.openid

    // 2. 如果我是通过普通点击进来的（没带 ownerId），默认看自己的
    if (!ownerId && myOpenId) {
      ownerId = myOpenId
    }

    // 3. 【新增】如果此时 ownerId 还是空的（比如刷新页面导致 globalData 丢失），
    // 再次尝试调用 app.wxLogin() 或等待逻辑 (视你 app.js 实现而定)
    // 这里做一个简单的兜底：如果没有 ownerId，就只加载模版，不加载用户数据
    
    this.setData({ equipmentId, ownerId })

    if (equipmentId) {
      this.loadData(equipmentId, ownerId)
    }
  },

  // 统一加载流程
  async loadData(equipmentId, ownerId) {
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const myOpenId = app.globalData.openid
      
      // 判断身份
      const isOwner = (ownerId === myOpenId)
      this.setData({ isOwner })

      // 1. 并行查询：装备模板 + 用户仓库数据
      // 注意：查询 user_warehouse 时，我们要查 ownerId 的数据
      const templatePromise = db.collection('equipment_templates').doc(equipmentId).get()
      
      let userPromise = Promise.resolve({ data: [] })
      
      if (ownerId) {
        userPromise = db.collection('user_warehouse')
          .where({
            // 【修正】将 _openid 改为 openid，与 upload.js 保存的字段一致
            openid: ownerId, 
            templateId: equipmentId
          })
          .get()
      }

      const [templateRes, userRes] = await Promise.all([templatePromise, userPromise])
      
      // 2. 处理装备模板
      const equipment = {
        ...templateRes.data,
        rarity: getRarityText(templateRes.data)
      }

      // 3. 处理用户数据
      let userEquipment = null
      let isActivated = false
      
      if (userRes.data.length > 0) {
        userEquipment = userRes.data[0]
        isActivated = true
        
        // 获取主人的个人信息
        this.loadOwnerInfo(ownerId)
      }

      // 4. 处理属性显示 (复用原有逻辑，增加容错)
      if (equipment.attributes) {
        equipment.attributes = this.processAttributes(equipment.attributes, userEquipment)
      }

      this.setData({
        equipment,
        userEquipment,
        isActivated,
        loading: false
      })

    } catch (error) {
      console.error('详情页加载失败', error)
      wx.showToast({ title: '数据加载异常', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 属性处理逻辑抽离
  processAttributes(attributes, userEquipment) {
    return attributes.map(attr => {
      const config = getPropertyConfig(attr.code)
      let displayText = ''
      let userValue = undefined

      // 如果已激活，尝试获取用户的 Roll 值
      if (userEquipment && userEquipment.attributes && userEquipment.attributes[attr.code] !== undefined) {
        userValue = userEquipment.attributes[attr.code]
      }

      // 生成显示文本
      const valToShow = userValue !== undefined ? userValue : attr.min
      displayText = config.format.replace('{0}', valToShow)
      if (attr.param) displayText = displayText.replace('{p}', attr.param)

      return {
        ...attr,
        label: config.label,
        displayColor: config.color,
        displayText,
        userValue // 存下来，wxml 里判断是否显示 "Roll" 标记
      }
    })
  },

  // 获取主人的信息
  async loadOwnerInfo(openid) {
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('users').where({ openid }).get()
      if (data.length > 0) {
        this.setData({ userInfo: data[0] })
      } else {
        // 默认信息
        this.setData({ userInfo: { nickName: '神秘奈非天', avatarUrl: '/images/default-avatar.png' } })
      }
    } catch (e) {
      console.error(e)
    }
  },

  // ==========================================
  // 分享核心配置 (Share Logic)
  // ==========================================
  
  // 1. 分享给好友 (卡片)
  onShareAppMessage() {
    const { equipment, isActivated, ownerId, userInfo } = this.data
    
    // 构造标题
    let title = `暗黑2图鉴：${equipment.name}`
    if (isActivated && userInfo) {
      title = `快来看${userInfo.nickName}的【${equipment.name}】！`
    }

    // 构造路径：必须带上 ownerId，否则别人点进来也是空的
    const path = `/pages/detail/detail?id=${equipment._id}&ownerId=${ownerId}`

    return {
      title: title,
      path: path,
      imageUrl: this.data.userEquipment?.images?.[0] || '/images/share-cover.jpg' // 优先用装备图，否则用默认图
    }
  },

  // 2. 分享到朋友圈
  onShareTimeline() {
    const { equipment, ownerId } = this.data
    return {
      title: `暗黑2装备展示：${equipment.name}`,
      query: `id=${equipment._id}&ownerId=${ownerId}`,
      imageUrl: this.data.userEquipment?.images?.[0]
    }
  },

  // 补充：回到首页
  goToHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  
  // 补充：去上传（只有主人或者未激活时才显示）
  goToUpload() {
    // 这里由于是 TabBar 跳转，无法直接传参，沿用之前的 Cache 方案
    const { equipment } = this.data
    wx.setStorageSync('pendingUpload', {
      templateId: equipment._id,
      equipmentName: equipment.name
    })
    wx.switchTab({ url: '/pages/upload/upload' })
  }
})