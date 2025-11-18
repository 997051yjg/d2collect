// pages/index/index.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    collectionStats: {
      activatedCount: 0,
      totalCount: 0,
      completionRate: 0
    },
    recentEquipments: [],
    loading: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadUserStats()
      this.loadRecentEquipments()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    const userInfo = app.globalData.userInfo
    
    this.setData({ 
      isLoggedIn,
      userInfo: isLoggedIn ? userInfo : null
    })
  },

  // 加载图鉴统计数据
  async loadUserStats() {
    if (!this.data.isLoggedIn || !app.globalData.openid) {
      console.log('用户未登录，跳过加载统计数据')
      this.setData({
        collectionStats: {
          activatedCount: 0,
          totalCount: 0,
          completionRate: 0
        }
      })
      return
    }

    try {
      this.setData({ loading: true })
      
      const db = wx.cloud.database()
      
      // 获取用户已激活的装备数量
      const { data: userEquipments } = await db.collection('user_warehouse')
        .where({ openid: app.globalData.openid })
        .get()
      
      // 获取总装备数量
      const { data: equipmentTemplates } = await db.collection('equipment_templates')
        .get()
      
      const activatedCount = userEquipments.length
      const totalCount = equipmentTemplates.length
      const completionRate = totalCount > 0 ? Math.round((activatedCount / totalCount) * 100) : 0
      
      this.setData({
        collectionStats: {
          activatedCount: activatedCount,
          totalCount: totalCount,
          completionRate: completionRate
        }
      })
      
    } catch (error) {
      console.error('加载图鉴统计数据失败:', error)
      // 出错时使用默认值
      this.setData({
        collectionStats: {
          activatedCount: 0,
          totalCount: 0,
          completionRate: 0
        }
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载最近上传的装备
  async loadRecentEquipments() {
    try {
      const db = wx.cloud.database()
      
      // 获取用户最近上传的装备
      const { data: userEquipments } = await db.collection('user_warehouse')
        .where({ openid: app.globalData.openid })
        .orderBy('activationTime', 'desc')
        .limit(5)
        .get()
      
      if (userEquipments.length > 0) {
        // 获取装备模板信息
        const templateIds = userEquipments.map(item => item.templateId)
        const { data: equipmentTemplates } = await db.collection('equipment_templates')
          .where({
            _id: db.command.in(templateIds)
          })
          .get()
        
        // 构建最近装备列表
        const recentEquipments = userEquipments.map(userEquip => {
          const template = equipmentTemplates.find(t => t._id === userEquip.templateId)
          if (template) {
            const emoji = this.getEquipmentEmoji(template.type)
            return {
              id: template._id,
              name: template.name,
              type: template.type,
              emoji: emoji,
              activationTime: userEquip.activationTime
            }
          }
          return null
        }).filter(item => item !== null)
        
        this.setData({
          recentEquipments: recentEquipments
        })
      } else {
        this.setData({
          recentEquipments: []
        })
      }
    } catch (error) {
      console.error('加载最近装备失败:', error)
      this.setData({
        recentEquipments: []
      })
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

  // 微信登录
  async wxLogin() {
    try {
      wx.showLoading({
        title: '登录中...',
        mask: true
      })
      
      const result = await app.wxLogin()
      
      if (result.success) {
        this.setData({
          isLoggedIn: true,
          userInfo: result.userInfo
        })
        
        // 加载统计数据
        await this.loadUserStats()
        await this.loadRecentEquipments()
        
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        })
      } else {
        wx.hideLoading()
        wx.showModal({
          title: '登录失败',
          content: result.error || '登录过程中出现错误',
          showCancel: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      
      // 更详细的错误提示
      let errorMsg = '登录失败，请重试'
      if (error.errMsg) {
        if (error.errMsg.includes('getUserProfile')) {
          errorMsg = '获取用户信息失败，请重试'
        } else if (error.errMsg.includes('cloud')) {
          errorMsg = '云服务异常，请检查网络连接'
        }
      }
      
      wx.showModal({
        title: '登录失败',
        content: errorMsg,
        showCancel: false
      })
    }
  },

  // 退出登录
  logout() {
    app.logout()
    this.setData({
      isLoggedIn: false,
      userInfo: null,
      stats: {
        collectionCount: 0,
        achievementCount: 0,
        totalProgress: 0
      },
      recentEquipments: []
    })
  },

  // 查看装备详情
  viewEquipment(e) {
    const { id } = e.currentTarget.dataset
    
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 跳转到上传页面
  goToUpload() {
    if (!this.data.isLoggedIn) {
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

  // 跳转到图鉴页面
  goToCollection() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.switchTab({
      url: '/pages/collection/collection'
    })
  },

  // 跳转到成就页面
  goToAchievement() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/achievement/achievement'
    })
  },


})