// app.js
App({
  globalData: {
    isLoggedIn: false,
    userInfo: null,
    openid: null,
    hasUserInfo: false
  },

  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-7g43dval99d60dca', // 替换为您的云环境ID
      traceUser: true,
    })

    // 检查云函数是否已部署
    this.checkCloudFunctions()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 显示首次使用引导
    this.showFirstTimeGuide()
  },

  // 检查云函数状态
  async checkCloudFunctions() {
    try {
      // 测试getOpenid云函数是否可用
      await wx.cloud.callFunction({
        name: 'getOpenid',
        data: {}
      })
    } catch (error) {
      console.warn('云函数未部署或不可用:', error)
      // 可以添加云函数部署提示
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      // 检查本地存储
      const userInfo = wx.getStorageSync('userInfo')
      const openid = wx.getStorageSync('openid')
      
      if (userInfo && openid) {
        this.globalData.isLoggedIn = true
        this.globalData.userInfo = userInfo
        this.globalData.openid = openid
        this.globalData.hasUserInfo = true
        
        console.log('登录状态: 已登录，用户:', userInfo.nickName)
        
        // 从数据库同步用户信息（确保数据一致性）
        await this.syncUserInfoFromDB(openid)
      } else {
        console.log('登录状态: 未登录')
        this.globalData.isLoggedIn = false
        this.globalData.userInfo = null
        this.globalData.openid = null
        this.globalData.hasUserInfo = false
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      this.globalData.isLoggedIn = false
    }
  },

  // 从数据库同步用户信息
  async syncUserInfoFromDB(openid) {
    try {
      const db = wx.cloud.database()
      
      // 查询用户信息
      const { data: existingUsers } = await db.collection('users')
        .where({ openid: openid })
        .get()
      
      if (existingUsers.length > 0) {
        const dbUserInfo = existingUsers[0]
        
        // 比较本地和数据库的信息，使用数据库中的信息
        if (this.globalData.userInfo && 
            (this.globalData.userInfo.nickName === '暗黑冒险者' || 
             this.globalData.userInfo.avatarUrl === '/images/default-avatar.png')) {
          
          // 如果本地是默认信息，使用数据库中的信息
          const updatedUserInfo = {
            nickName: dbUserInfo.nickName,
            avatarUrl: dbUserInfo.avatarUrl
          }
          
          this.globalData.userInfo = updatedUserInfo
          wx.setStorageSync('userInfo', updatedUserInfo)
          
          console.log('用户信息已从数据库同步:', updatedUserInfo.nickName)
        }
      }
    } catch (error) {
      console.warn('从数据库同步用户信息失败:', error)
      // 失败不影响使用，继续使用本地存储的信息
    }
  },

  // 强制登录检查
  async requireLogin() {
    if (!this.globalData.isLoggedIn) {
      // 显示登录提示
      const res = await wx.showModal({
        title: '需要登录',
        content: '请先登录以使用完整功能',
        confirmText: '立即登录',
        cancelText: '稍后再说'
      })
      
      if (res.confirm) {
        // 跳转到首页进行登录
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
      
      return false
    }
    return true
  },

  // 首次使用引导
  showFirstTimeGuide() {
    const hasSeenGuide = wx.getStorageSync('hasSeenGuide')
    if (!hasSeenGuide) {
      wx.showModal({
        title: '欢迎使用暗黑2装备图鉴',
        content: '这是一个专为暗黑2玩家打造的装备收集工具。您可以：\n\n1. 上传装备照片进行存储\n2. 管理您的装备收藏\n3. 查看收集进度和成就\n4. 与其他玩家分享您的收藏',
        confirmText: '开始使用',
        showCancel: false
      })
      
      wx.setStorageSync('hasSeenGuide', true)
    }
  },

  // 微信登录 - 基础登录（优先从数据库查询用户信息）
  async wxLogin() {
    try {
      // 1. 先进行微信登录
      const loginResult = await wx.login()
      if (!loginResult.code) {
        throw new Error('获取登录凭证失败')
      }

      // 2. 获取openid
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenid'
      })

      // 3. 优先从数据库查询用户信息
      let userInfo = await this.getUserInfoFromDB(result.openid)
      
      // 4. 如果数据库中没有用户信息，使用默认信息
      if (!userInfo) {
        userInfo = {
          nickName: '暗黑冒险者',
          avatarUrl: '/images/default-avatar.png'
        }
        console.log('数据库中无用户记录，使用默认信息')
      } else {
        console.log('从数据库恢复用户信息:', userInfo.nickName)
      }

      // 5. 更新全局数据
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
      this.globalData.openid = result.openid
      this.globalData.hasUserInfo = false // 标记为未获取详细用户信息

      // 6. 保存到本地存储
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('openid', result.openid)

      // 7. 创建或更新用户记录（如果数据库中没有记录则创建）
      await this.createOrUpdateUser(userInfo, result.openid)

      return { success: true, userInfo }
    } catch (error) {
      console.error('登录失败:', error)
      
      // 提供更友好的错误提示
      let errorMessage = '登录失败，请重试'
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        errorMessage = '登录授权被拒绝'
      } else if (error.errMsg && error.errMsg.includes('network')) {
        errorMessage = '网络连接失败，请检查网络'
      }

      return { 
        success: false, 
        error: errorMessage,
        originalError: error
      }
    }
  },

  // 从数据库查询用户信息
  async getUserInfoFromDB(openid) {
    try {
      const db = wx.cloud.database()
      
      // 查询用户信息
      const { data: existingUsers } = await db.collection('users')
        .where({ openid: openid })
        .get()
      
      if (existingUsers.length > 0) {
        const dbUserInfo = existingUsers[0]
        return {
          nickName: dbUserInfo.nickName,
          avatarUrl: dbUserInfo.avatarUrl
        }
      }
      
      return null
    } catch (error) {
      console.warn('从数据库查询用户信息失败:', error)
      return null
    }
  },

  // 获取用户详细信息（必须在用户点击事件中调用）
  async getUserProfile() {
    try {
      const profileResult = await wx.getUserProfile({
        desc: '用于完善用户资料和记录装备收藏'
      })
      
      if (this.globalData.isLoggedIn) {
        // 更新用户信息
        const updatedUserInfo = {
          ...this.globalData.userInfo,
          ...profileResult.userInfo
        }
        
        this.globalData.userInfo = updatedUserInfo
        this.globalData.hasUserInfo = true
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', updatedUserInfo)
        
        // 更新数据库
        await this.createOrUpdateUser(updatedUserInfo, this.globalData.openid)
        
        return { success: true, userInfo: updatedUserInfo }
      }
      
      return { success: false, error: '请先登录' }
    } catch (error) {
      console.warn('用户拒绝授权或获取信息失败:', error)
      return { 
        success: false, 
        error: error.errMsg || '获取用户信息失败'
      }
    }
  },

  // 创建或更新用户记录
  async createOrUpdateUser(userInfo, openid) {
    try {
      const db = wx.cloud.database()
      const now = new Date()

      try {
        // 检查用户是否存在
        const { data: existingUsers } = await db.collection('users')
          .where({ openid: openid })
          .get()

        if (existingUsers.length > 0) {
          // 更新用户信息
          await db.collection('users').doc(existingUsers[0]._id).update({
            data: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              updateTime: now
            }
          })
          console.log('用户信息已更新:', userInfo.nickName)
        } else {
          // 创建新用户
          await db.collection('users').add({
            data: {
              openid: openid,
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              collectionCount: 0,
              achievementCount: 0,
              totalProgress: 0,
              createTime: now,
              updateTime: now
            }
          })
          console.log('新用户已创建:', userInfo.nickName)
          
          // 为新用户初始化成就记录
          await this.initializeUserAchievements(openid)
        }
      } catch (dbError) {
        // 如果数据库集合不存在，只记录日志，不抛出错误
        console.warn('数据库操作失败，集合可能不存在:', dbError)
        console.log('用户信息已保存到本地存储，数据库操作稍后重试')
      }
    } catch (error) {
      console.error('用户记录操作失败:', error)
      // 这里可以添加更详细的错误处理，比如重试机制
    }
  },

  // 初始化用户成就记录
  async initializeUserAchievements(openid) {
    try {
      const db = wx.cloud.database()
      const now = new Date()
      
      // 获取所有成就模板
      const { data: achievementTemplates } = await db.collection('achievement_templates')
        .get()
      
      // 为每个成就模板创建用户成就记录
      const promises = achievementTemplates.map(template => 
        db.collection('user_achievements').add({
          data: {
            openid: openid,
            achievementId: template._id,
            completed: false,
            progress: 0,
            completedAt: null,
            updateTime: now
          }
        })
      )
      
      await Promise.all(promises)
      console.log('用户成就记录初始化完成')
    } catch (error) {
      console.error('初始化用户成就记录失败:', error)
    }
  },

  // 退出登录
  logout() {
    this.globalData.isLoggedIn = false
    this.globalData.userInfo = null
    this.globalData.openid = null
    this.globalData.hasUserInfo = false

    // 清除本地存储
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('openid')

    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    })
  }
})