// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    editing: false,
    tempNickName: '',
    uploadingAvatar: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    const userInfo = app.globalData.userInfo
    
    this.setData({ 
      isLoggedIn,
      userInfo,
      tempNickName: userInfo ? userInfo.nickName : ''
    })
  },

  // 微信登录
  async wxLogin() {
    try {
      wx.showLoading({
        title: '登录中...',
        mask: true
      })
      
      // 先进行基础登录获取openid
      const result = await app.wxLogin()
      
      if (result.success) {
        this.setData({
          isLoggedIn: true,
          userInfo: result.userInfo
        })
        
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        })
        
        // 检查是否需要提示完善信息
        setTimeout(() => {
          this.checkAndPromptUserInfo()
        }, 1000)
        
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

  // 检查并提示完善用户信息
  async checkAndPromptUserInfo() {
    // 检查用户是否已经完善了信息（不是默认信息）
    const { userInfo } = this.data
    
    if (userInfo && 
        (userInfo.nickName === '暗黑冒险者' || 
         userInfo.avatarUrl === '/images/default-avatar.png')) {
      // 用户信息不完整，提示完善
      wx.showModal({
        title: '完善信息',
        content: '是否要完善您的个人信息？',
        confirmText: '立即完善',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.updateUserProfile()
          }
        }
      })
    } else {
      // 用户信息已经完善，不显示提示
      console.log('用户信息已完善，跳过提示')
    }
  },

  // 更新用户信息（必须在用户点击事件中调用）
  async updateUserProfile() {
    try {
      const result = await app.getUserProfile()
      
      if (result.success) {
        // 合并新获取的用户信息与现有信息，避免丢失已完善的信息
        const mergedUserInfo = {
          ...this.data.userInfo,
          ...result.userInfo
        }
        
        this.setData({
          userInfo: mergedUserInfo
        })
        
        // 更新全局数据和本地存储
        app.globalData.userInfo = mergedUserInfo
        wx.setStorageSync('userInfo', mergedUserInfo)
        
        // 更新数据库
        await this.updateUserInfoInDB(mergedUserInfo)
        
        wx.showToast({
          title: '信息更新成功',
          icon: 'success'
        })
      } else {
        wx.showModal({
          title: '更新失败',
          content: result.error || '更新用户信息失败',
          showCancel: false
        })
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  // 开始编辑昵称
  startEditNickName() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      editing: true,
      tempNickName: this.data.userInfo.nickName
    })
  },

  // 取消编辑昵称
  cancelEditNickName() {
    this.setData({
      editing: false,
      tempNickName: this.data.userInfo.nickName
    })
  },

  // 保存昵称
  async saveNickName() {
    const { tempNickName, userInfo } = this.data
    
    if (!tempNickName.trim()) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      })
      return
    }

    if (tempNickName.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'none'
      })
      return
    }

    try {
      // 更新全局数据
      const updatedUserInfo = {
        ...userInfo,
        nickName: tempNickName
      }
      
      app.globalData.userInfo = updatedUserInfo
      
      // 更新本地存储
      wx.setStorageSync('userInfo', updatedUserInfo)
      
      // 更新数据库中的用户信息
      await this.updateUserInfoInDB(updatedUserInfo)
      
      this.setData({
        userInfo: updatedUserInfo,
        editing: false
      })
      
      wx.showToast({
        title: '昵称修改成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('保存昵称失败:', error)
      wx.showToast({
        title: '修改失败',
        icon: 'none'
      })
    }
  },

  // 更新数据库中的用户信息
  async updateUserInfoInDB(userInfo) {
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid
      
      // 获取用户记录
      const { data: existingUsers } = await db.collection('users')
        .where({ openid: openid })
        .get()
      
      if (existingUsers.length > 0) {
        // 更新用户信息
        await db.collection('users').doc(existingUsers[0]._id).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            updateTime: new Date()
          }
        })
      }
    } catch (error) {
      console.error('更新数据库用户信息失败:', error)
      // 这里不抛出错误，因为用户可能只是修改了本地信息
    }
  },

  // 上传头像
  uploadAvatar() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({ uploadingAvatar: true })
    
    // 使用微信API选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        try {
          console.log('选择图片返回结果:', res)
          
          // 检查返回结果结构
          if (!res.tempFilePaths || res.tempFilePaths.length === 0) {
            throw new Error('未获取到图片路径')
          }
          
          const tempFilePath = res.tempFilePaths[0]
          
          // 检查图片大小（限制2MB）
          if (res.tempFiles && res.tempFiles[0] && res.tempFiles[0].size > 2 * 1024 * 1024) {
            wx.showModal({
              title: '图片过大',
              content: '请选择小于2MB的图片',
              showCancel: false
            })
            this.setData({ uploadingAvatar: false })
            return
          }

          // 微信没有官方图片安全检测API，直接上传

          // 先保存旧头像的文件ID（用于后续删除）
          const oldAvatarUrl = this.data.userInfo.avatarUrl
          
          // 上传新图片到云存储
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
            filePath: tempFilePath
          })

          // 更新用户信息
          const updatedUserInfo = {
            ...this.data.userInfo,
            avatarUrl: uploadResult.fileID
          }
          
          app.globalData.userInfo = updatedUserInfo
          wx.setStorageSync('userInfo', updatedUserInfo)
          
          // 更新数据库
          await this.updateUserInfoInDB(updatedUserInfo)
          
          this.setData({
            userInfo: updatedUserInfo
          })
          
          // 删除旧头像文件（如果存在且不是默认头像）
          if (oldAvatarUrl && oldAvatarUrl !== '/images/default-avatar.png' && oldAvatarUrl.startsWith('cloud://')) {
            try {
              await wx.cloud.deleteFile({
                fileList: [oldAvatarUrl]
              })
              console.log('旧头像已删除:', oldAvatarUrl)
            } catch (deleteError) {
              console.warn('删除旧头像失败:', deleteError)
              // 删除失败不影响正常使用
            }
          }
          
          wx.showToast({
            title: '头像上传成功',
            icon: 'success'
          })
          
        } catch (error) {
          console.error('上传头像失败:', error)
          
          let errorMessage = '上传失败'
          if (error.errMsg && error.errMsg.includes('auth deny')) {
            errorMessage = '请授权访问相册或相机'
          } else if (error.errMsg && error.errMsg.includes('cancel')) {
            // 用户取消，不显示提示
            return
          } else if (error.errMsg && error.errMsg.includes('security')) {
            errorMessage = '图片包含敏感内容，请更换图片'
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          })
        } finally {
          this.setData({ uploadingAvatar: false })
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
        this.setData({ uploadingAvatar: false })
        
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '权限申请',
            content: '请授权访问相册或相机权限',
            showCancel: false
          })
        } else if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消，不显示提示
        } else {
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout()
          
          this.setData({
            isLoggedIn: false,
            userInfo: null
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          // 跳转到首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        }
      }
    })
  },

  // 昵称输入
  onNickNameInput(e) {
    this.setData({
      tempNickName: e.detail.value
    })
  },

  // 查看收集统计
  viewCollectionStats() {
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

  // 查看成就
  viewAchievements() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '成就系统',
      content: '成就功能正在开发中',
      showCancel: false
    })
  },

  // 跳转到首页
  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的暗黑2装备收藏',
      path: '/pages/profile/profile'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '暗黑2装备图鉴 - 我的收藏',
      imageUrl: this.data.userInfo ? this.data.userInfo.avatarUrl : '/images/share-cover.png'
    }
  }
})