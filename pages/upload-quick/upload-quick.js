// pages/upload-quick/upload-quick.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    uploadedImage: '',
    uploading: false,
    uploadProgress: 0,
    equipmentInfo: null, // 预配置的装备信息
    canSubmit: false
  },

  onLoad(options) {
    this.checkLoginStatus()
    
    // 从图鉴页面传递的装备信息
    if (options.templateId && options.equipmentName) {
      this.loadEquipmentInfo(options.templateId, decodeURIComponent(options.equipmentName))
    }
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({ isLoggedIn })
  },

  // 加载装备信息
  async loadEquipmentInfo(templateId, equipmentName) {
    try {
      const db = wx.cloud.database()
      
      // 根据templateId获取装备信息
      const { data: equipment } = await db.collection('equipment_templates')
        .doc(templateId)
        .get()
      
      if (equipment) {
        this.setData({
          equipmentInfo: {
            ...equipment,
            name: equipmentName
          }
        })
        
        wx.showToast({
          title: `已选择装备：${equipmentName}`,
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('加载装备信息失败:', error)
      wx.showToast({
        title: '加载装备信息失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 跳转到登录
  goToLogin() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        // 检查图片大小（限制5MB）
        if (res.tempFiles[0].size > 5 * 1024 * 1024) {
          wx.showModal({
            title: '图片过大',
            content: '请选择小于5MB的图片',
            showCancel: false
          })
          return
        }
        
        this.setData({ 
          uploadedImage: tempFilePath
        })
        this.checkFormValidity()
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        
        let errorMessage = '选择图片失败'
        if (error.errMsg.includes('auth deny')) {
          errorMessage = '请授权访问相册或相机'
        } else if (error.errMsg.includes('cancel')) {
          return // 用户取消，不显示提示
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 删除图片
  removeImage() {
    this.setData({ 
      uploadedImage: '',
      canSubmit: false
    })
  },

  // 重新上传
  reuploadImage() {
    this.removeImage()
    this.chooseImage()
  },

  // 检查表单有效性
  checkFormValidity() {
    const { uploadedImage, equipmentInfo } = this.data
    const canSubmit = uploadedImage && equipmentInfo
    this.setData({ canSubmit })
  },

  // 提交表单
  async submitForm() {
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      })
      return
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认上传',
      content: `确定要上传装备"${this.data.equipmentInfo.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ uploading: true, uploadProgress: 0 })
            
            // 上传图片到云存储
            const uploadResult = await this.uploadImage()
            
            // 创建装备记录
            await this.createEquipmentRecord(uploadResult.fileID)
            
            this.setData({ uploading: false })
            
            wx.showToast({
              title: '上传成功',
              icon: 'success',
              duration: 2000
            })
            
            // 设置刷新标志，通知图鉴页面和主页面刷新数据
            wx.setStorageSync('shouldRefreshCollection', true)
            wx.setStorageSync('shouldRefreshStats', true)
            
            // 延迟返回图鉴页面
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
            
          } catch (error) {
            this.setData({ uploading: false })
            console.error('上传失败:', error)
            
            let errorMessage = '上传失败，请重试'
            if (error.errMsg && error.errMsg.includes('network')) {
              errorMessage = '网络连接失败，请检查网络设置'
            }
            
            wx.showModal({
              title: '上传失败',
              content: errorMessage,
              showCancel: false
            })
          }
        }
      }
    })
  },

  // 上传图片
  uploadImage() {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `equipments/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        filePath: this.data.uploadedImage,
        onUploadProgress: (res) => {
          const progress = Math.round((res.loaded / res.total) * 100)
          this.setData({ uploadProgress: progress })
        },
        success: resolve,
        fail: reject
      })
    })
  },

  // 创建装备记录
  async createEquipmentRecord(imageUrl) {
    // 调用云函数，安全且无权限问题
    const { result } = await wx.cloud.callFunction({
      name: 'saveUserEquipment',
      data: {
        templateId: this.data.equipmentInfo?._id,
        equipmentName: this.data.equipmentInfo?.name,
        imageUrl: imageUrl,
        attributes: [] // 如果有属性数组也可以传
      }
    })

    if (!result.success) {
      throw new Error(result.error)
    }
    
    console.log('装备保存成功:', result.action)
  }
})