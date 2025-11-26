// pages/index/index.js
const app = getApp()
const { getRarityText, getRarityClass } = require('../../utils/rarityMap.js')

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
      // 检查是否需要强制刷新统计数据
      const shouldRefreshStats = wx.getStorageSync('shouldRefreshStats')
      if (shouldRefreshStats) {
        // 清除标志并强制刷新
        wx.removeStorageSync('shouldRefreshStats')
        this.loadUserStats(true)
      } else {
        this.loadUserStats()
      }
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

  // 加载图鉴统计数据（优化版）
  async loadUserStats(forceRefresh = false) {
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

    // 检查缓存，避免重复查询
    const cacheKey = `userStats_${app.globalData.openid}`
    const cachedStats = wx.getStorageSync(cacheKey)
    const now = Date.now()
    
    // 缓存有效期为5分钟，但如果是强制刷新则跳过缓存
    if (!forceRefresh && cachedStats && (now - cachedStats.timestamp < 5 * 60 * 1000)) {
      this.setData({
        collectionStats: cachedStats.data
      })
      return
    }

    try {
      this.setData({ loading: true })
      
      const db = wx.cloud.database()
      
      // 并行查询，提高效率
      const [userEquipmentsResult, totalCountResult] = await Promise.all([
        // 只查询激活状态的装备，减少数据量
        db.collection('user_warehouse')
          .where({ 
            openid: app.globalData.openid,
            isActive: true
          })
          .field({
            _id: true,
            templateId: true
          })
          .count(),
        
        // 获取总装备数量
        db.collection('equipment_templates')
          .count()
      ])
      
      const activatedCount = userEquipmentsResult.total
      const totalCount = totalCountResult.total
      const completionRate = totalCount > 0 ? Math.round((activatedCount / totalCount) * 100) : 0
      
      const stats = {
        activatedCount: activatedCount,
        totalCount: totalCount,
        completionRate: completionRate
      }
      
      // 缓存结果
      wx.setStorageSync(cacheKey, {
        data: stats,
        timestamp: now
      })
      
      this.setData({
        collectionStats: stats
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

  // 🚀 最终优化版：调用云函数获取数据（解决权限问题 + 速度最快）
  async loadRecentEquipments() {
    try {
      this.setData({ loading: true }) // 可选：如果你想显示加载状态

      // 调用刚才写的云函数 'getRecentEquipments'
      const { result } = await wx.cloud.callFunction({
        name: 'getRecentEquipments'
      })

      if (result && result.success && result.data.length > 0) {
        const list = result.data
        
        // 数据格式化（把云端返回的原始数据转成页面需要的格式）
        const recentEquipments = list.map(item => {
          const template = item.templateDetail[0]
          
          if (template) {
            const icon = template.image || this.getEquipmentIcon(template.type)
            const rarityClass = getRarityClass(template) // 获取品质类名
            
            return {
              id: template._id,
              templateId: template._id, // 添加templateId字段，用于点击跳转
              // ✅ 适配中文名：优先显示中文，没有则显示英文
              name: template.name_zh || template.name, 
              type: template.type,
              icon: icon,
              rarity: getRarityText(template), // 使用新的字段判断逻辑
              rarityValue: template.rarity, // 保留原始数值用于CSS类名判断
              rarityClass: rarityClass, // 直接存储品质类名
              activationTime: item.activationTime,
              // 直接传递模板数据，让WXML可以调用getRarityClass函数
              template: template
            }
          }
          return null
        }).filter(item => item !== null)

        this.setData({ recentEquipments })
      } else {
        this.setData({ recentEquipments: [] })
      }
    } catch (error) {
      console.error('云函数调用失败:', error)
      this.setData({ recentEquipments: [] })
    } finally {
       // 停止加载状态
       this.setData({ loading: false })
       // 停止下拉刷新
       wx.stopPullDownRefresh() 
    }
  },

  // 获取装备类型的图标
  getEquipmentIcon(type) {
    // 默认图标路径映射
    const iconMap = {
      '头部': '/images/equipment-icons/helmet.png',
      '盔甲': '/images/equipment-icons/armor.png',
      '腰带': '/images/equipment-icons/belt.png',
      '鞋子': '/images/equipment-icons/boots.png',
      '手套': '/images/equipment-icons/gloves.png',
      '戒指': '/images/equipment-icons/ring.png',
      '项链': '/images/equipment-icons/amulet.png',
      '手持': '/images/equipment-icons/weapon.png'
    }
    
    return iconMap[type] || '/images/equipment-icons/default.png'
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
        
        // 加载统计数据（强制刷新，确保最新数据）
        await this.loadUserStats(true)
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
    const { templateid } = e.currentTarget.dataset
    
    if (!templateid) {
      wx.showToast({
        title: '装备信息异常',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/detail/detail?id=${templateid}`
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

  // 跳转到个人信息页面
  goToProfile() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 跳转到图鉴页面（只显示已激活装备）
  goToActivatedCollection() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 设置筛选条件：只显示已激活装备，取消未激活筛选
    wx.setStorageSync('collectionFilterSettings', {
      advancedFilters: {
        unique: true,
        suit: true,
        runeWord: true,
        activated: true,
        notActivated: false // 取消未激活筛选
      },
      currentTypeFilter: 'all',
      searchKeyword: ''
    })
    
    wx.switchTab({
      url: '/pages/collection/collection'
    })
  },

  // 跳转到图鉴页面（默认筛选）
  goToCollection() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    //重置筛选器 
    wx.setStorageSync('collectionFilterSettings', {
        advancedFilters: {
          unique: true,
          suit: true,
          runeWord: true,
          activated: true,
          notActivated: true // 取消未激活筛选
        },
        currentTypeFilter: 'all',
        searchKeyword: ''
    })

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