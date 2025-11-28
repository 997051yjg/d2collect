// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    editing: false,
    tempNickName: '',
    uploadingAvatar: false,
    
    // 游戏化数据
    collectionStats: {
      activatedCount: 0,
      totalCount: 0,
      completionRate: 0
    },
    userTitle: '流浪者',
    userLevel: 1
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.refreshStats() // 每次显示都刷新数据
    }
  },

  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    const userInfo = app.globalData.userInfo
    
    this.setData({ 
      isLoggedIn,
      userInfo,
      tempNickName: userInfo ? userInfo.nickName : ''
    })
    
    if (isLoggedIn) {
      this.refreshStats()
    }
  },

  // 刷新统计数据（从缓存读取，不一定非要请求网络）
  refreshStats() {
    // 尝试读取 collection 页面的缓存数据
    const cacheKey = `collectionData_${app.globalData.openid}`
    const cachedData = wx.getStorageSync(cacheKey)
    
    if (cachedData) {
      this.setData({
        collectionStats: {
          activatedCount: cachedData.activatedCount || 0,
          totalCount: cachedData.totalCount || 0,
          completionRate: cachedData.completionRate || 0
        }
      })
      // 计算头衔
      this.calculateUserTitle(cachedData.activatedCount || 0)
    }
  },

  // 简单的头衔计算逻辑
  calculateUserTitle(count) {
    let title = '流浪者'
    let level = 1
    
    if (count > 0) { title = '冒险者'; level = 5; }
    if (count > 10) { title = '赫拉迪克学徒'; level = 10; }
    if (count > 30) { title = '宝藏猎人'; level = 25; }
    if (count > 50) { title = '奈非天'; level = 50; }
    if (count > 80) { title = '圣殿守护者'; level = 70; }
    if (count > 100) { title = '破坏神之敌'; level = 99; }
    
    this.setData({ userTitle: title, userLevel: level })
  },

  // 微信登录 (保持原有逻辑)
  async wxLogin() {
    try {
      wx.showLoading({ title: '开启圣殿...', mask: true })
      const result = await app.wxLogin()
      
      if (result.success) {
        this.setData({ isLoggedIn: true, userInfo: result.userInfo })
        wx.hideLoading()
        this.refreshStats() // 登录后立即刷新数据
        wx.showToast({ title: '欢迎归来', icon: 'none' })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
  },

  // 编辑昵称逻辑优化
  startEditNickName() {
    this.setData({ editing: true, tempNickName: this.data.userInfo.nickName })
  },

  onNickNameInput(e) {
    this.setData({ tempNickName: e.detail.value })
  },

  async saveNickName() {
    if (!this.data.editing) return // 防止多次触发
    
    const { tempNickName, userInfo } = this.data
    if (!tempNickName.trim()) {
      return wx.showToast({ title: '名字不能为空', icon: 'none' })
    }

    try {
      const updatedUserInfo = { ...userInfo, nickName: tempNickName }
      app.globalData.userInfo = updatedUserInfo
      wx.setStorageSync('userInfo', updatedUserInfo)
      
      // 异步更新数据库，不阻塞UI
      this.updateUserInfoInDB(updatedUserInfo)
      
      this.setData({ userInfo: updatedUserInfo, editing: false })
      wx.showToast({ title: '更名成功', icon: 'none' })
    } catch (error) {
      // ignore
    }
  },

  uploadAvatar() {
    // 1. 权限与状态检查
    if (this.data.uploadingAvatar) return
    if (!this.data.isLoggedIn) {
      return wx.showToast({ title: '请先登录', icon: 'none' })
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'], // 建议压缩，节省流量和空间
      success: async (res) => {
        this.setData({ uploadingAvatar: true })
        
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        // 2. 【关键】在更新前，记录旧头像的 FileID
        const oldAvatarUrl = this.data.userInfo.avatarUrl

        try {
          // 3. 上传新头像到云存储
          // 使用时间戳+随机数防止文件名冲突
          const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.jpg`
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          })
          
          const newFileID = uploadResult.fileID

          // 4. 更新本地数据与全局数据
          const updatedUserInfo = { 
            ...this.data.userInfo, 
            avatarUrl: newFileID 
          }
          
          app.globalData.userInfo = updatedUserInfo
          wx.setStorageSync('userInfo', updatedUserInfo)
          this.setData({ userInfo: updatedUserInfo })

          // 5. 同步更新到数据库
          await this.updateUserInfoInDB(updatedUserInfo)

          // 6. 【关键】删除云端的旧头像
          // 必须判断：旧头像是云文件 AND 旧头像不是新头像 AND 旧头像不是默认图
          if (oldAvatarUrl && 
              oldAvatarUrl.startsWith('cloud://') && 
              oldAvatarUrl !== newFileID &&
              oldAvatarUrl !== '/images/default-avatar.png') { // 假设你有默认图的逻辑
            
            wx.cloud.deleteFile({
              fileList: [oldAvatarUrl]
            }).then(res => {
              console.log('旧头像清理成功', res.fileList)
            }).catch(err => {
              console.warn('旧头像清理失败，不影响主流程', err)
            })
          }

          wx.showToast({ title: '头像更新成功', icon: 'success' })

        } catch (e) {
          console.error('头像上传流程失败', e)
          wx.showToast({ title: '上传失败', icon: 'none' })
        } finally {
          this.setData({ uploadingAvatar: false })
        }
      }
    })
  },

  // ====================================================
  // 数据库更新逻辑 (优化版)
  // ====================================================
  async updateUserInfoInDB(userInfo) {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 直接根据 openid 更新，无需先查询后更新
      // 使用 .where().update() 比 .doc().update() 更灵活，
      // 因为前端有时候不一定拿得到 _id，但一定有 openid (隐式包含在鉴权信息中)
      const res = await db.collection('users')
        .where({
          // 这里的 openid 其实是多余的，因为云数据库默认只能查改自己的数据
          // 但写上语义更清晰
          _openid: '{openid}' 
        })
        .update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            updateTime: db.serverDate() // 【建议】使用服务端时间，更准确
          }
        })

      console.log('数据库更新结果：', res)
      
      // 如果 updated 为 0，说明数据库里可能没有这个用户（比如老数据清洗掉了）
      // 可以在这里做一个容错：如果没更新到，就尝试 add 一条（看你的业务需求）

    } catch (error) {
      console.error('更新数据库用户信息失败:', error)
      // 这里的错误通常是网络问题或权限问题
      // 可以选择不打扰用户，或者上报日志
    }
  },

  logout() {
    wx.showModal({
      title: '离开游戏',
      content: '确定要退出并返回主菜单吗？',
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          app.logout()
          this.setData({ isLoggedIn: false, userInfo: null })
          // 清除页面数据
          this.setData({ 
              collectionStats: { activatedCount:0, totalCount:0, completionRate:0 },
              userTitle: '流浪者'
          })
        }
      }
    })
  },

  // 页面跳转
  viewCollectionStats() {
    wx.switchTab({ url: '/pages/collection/collection' })
  },
  
  viewAchievements() {
    wx.showToast({ title: 'DLC开发中...', icon: 'none' })
  }
})